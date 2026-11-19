import { DurableObject } from 'cloudflare:workers'
import { TTL,MAX_BYTES,validateConfig,validateChunk,validId,hash,publicRoom } from './protocol.js'
import { insertRoom,saveChunk,chunks,deleteRoom,purge } from './database.js'

function isOriginAllowed(origin, env, selfOrigin) {
    if (!origin || origin === selfOrigin) return true
    if (env?.APP_ORIGIN && origin === env.APP_ORIGIN) return true
    try {
        const host = new URL(origin).hostname
        if (host === 'localhost' || host === '127.0.0.1') return true
        if (host.endsWith('.vercel.app')) return true
        if (env?.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).includes(origin)) return true
    } catch {}
    return false
}

function getCorsHeaders(request, env) {
    const origin = request.headers.get('Origin')
    const selfOrigin = new URL(request.url).origin
    const allowOrigin = (origin && isOriginAllowed(origin, env, selfOrigin)) ? origin : (env?.APP_ORIGIN || selfOrigin)
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    }
}

function withCors(response, request, env) {
    if (!response) return response
    const headers = new Headers(response.headers)
    const cors = getCorsHeaders(request, env)
    for (const [key, value] of Object.entries(cors)) {
        headers.set(key, value)
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    })
}

const json = (body, status = 200, extraHeaders = {}) => Response.json(body, {
    status,
    headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...extraHeaders,
    }
})

const local = env => env.LOCAL_MODE === 'true'

async function readBody(request) {
    const reader = request.body?.getReader()
    if (!reader) throw new Error('Data kosong.')
    let size = 0, parts = []
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 256000) {
            await reader.cancel()
            throw new Error('Paket terlalu besar.')
        }
        parts.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const p of parts) {
        bytes.set(p, offset)
        offset += p.length
    }
    return JSON.parse(new TextDecoder().decode(bytes))
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url)

        // Handle CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: getCorsHeaders(request, env) })
        }

        // Status / Health Check at Root
        if (url.pathname === '/' || url.pathname === '/health') {
            return json({
                status: 'ok',
                service: 'Acak Acak Asik Realtime API',
                endpoints: {
                    rooms: '/api/rooms',
                    socket: '/api/rooms/:id/socket',
                    chunks: '/api/rooms/:id/chunks',
                },
                time: new Date().toISOString(),
            }, 200, getCorsHeaders(request, env))
        }

        try {
            if (url.pathname === '/api/rooms' && request.method === 'POST') {
                const origin = request.headers.get('Origin')
                if (origin && !isOriginAllowed(origin, env, url.origin)) {
                    return withCors(json({ error: 'Asal permintaan tidak diizinkan.' }, 403), request, env)
                }

                const body = await readBody(request)
                if (!local(env)) {
                    if (!env.DATABASE_URL) return withCors(json({ error: 'Layanan live belum disiapkan.' }, 503), request, env)
                    if (env.TURNSTILE_SECRET) {
                        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                            method: 'POST',
                            body: new URLSearchParams({
                                secret: env.TURNSTILE_SECRET,
                                response: body.turnstileToken || '',
                                remoteip: request.headers.get('CF-Connecting-IP') || '',
                            }),
                        })
                        const check = await response.json()
                        const expectedHost = env.APP_ORIGIN && !env.APP_ORIGIN.includes('REPLACE') ? new URL(env.APP_ORIGIN).hostname : url.hostname
                        if (!check.success || check.action !== 'create-room' || (check.hostname && check.hostname !== expectedHost)) {
                            return withCors(json({ error: 'Verifikasi perlu diulangi.' }, 403), request, env)
                        }
                    }
                }
                const config = validateConfig(body.config)
                const id = crypto.randomUUID().replaceAll('-', '')
                const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('')
                const stub = env.ROOMS.get(env.ROOMS.idFromName(id))
                const created = await stub.fetch(new Request('https://room/init', {
                    method: 'POST',
                    body: JSON.stringify({ id, config, hostHash: await hash(token) }),
                }))
                if (!created.ok) return withCors(created, request, env)
                return withCors(json({ ...await created.json(), token }), request, env)
            }

            const match = url.pathname.match(/^\/api\/rooms\/([a-f0-9]{32})(?:\/(chunks|socket))?$/)
            if (!match || !validId(match[1])) return withCors(json({ error: 'Tautan tidak ditemukan.' }, 404), request, env)

            const response = await env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request)
            // WebSocket upgrade responses (status 101) must be returned untouched
            if (response.status === 101) return response
            return withCors(response, request, env)
        } catch (e) {
            console.error('[API Error]', e)
            const knownSafeErrors = [
                'Konfigurasi siaran tidak sesuai.',
                'Daftar siaran terlalu besar.',
                'Nama peserta tidak sesuai.',
                'Daftar tidak sesuai.',
                'Jumlah harus 1–30.',
                'Mode tidak sesuai.',
                'Maksimal 30 topik.',
                'Siaran mendukung maksimal 200 karakter.',
                'Paket terlalu besar.',
                'Data kosong.',
                'Tautan tidak ditemukan.'
            ]
            const msg = (e && typeof e.message === 'string' && knownSafeErrors.includes(e.message))
                ? e.message
                : 'Permintaan belum dapat diproses. Periksa data atau coba lagi.'
            return withCors(json({ error: msg }, 400), request, env)
        }
    },
    async scheduled(event, env, ctx) {
        if (!local(env)) ctx.waitUntil(purge(env))
    },
}

export class LiveRoom extends DurableObject {
    async fetch(request) {
        const url = new URL(request.url)
        if (url.pathname === '/init') return this.ctx.blockConcurrencyWhile(async () => {
            if (await this.ctx.storage.get('room')) return json({ error: 'Sesi sudah ada.' }, 409)
            const input = await request.json(), now = Date.now()
            const room = { ...input, createdAt: now, expiresAt: now + TTL, status: 'live', lastSeq: -1, bytes: 0, lastFrameMs: 0 }
            if (!local(this.env)) await insertRoom(this.env, room)
            await this.ctx.storage.put('room', room)
            await this.ctx.storage.setAlarm(room.expiresAt)
            return json(publicRoom(room), 201)
        })

        const room = await this.ctx.storage.get('room')
        if (!room || Date.now() >= room.expiresAt) return json({ error: 'Maaf, rekaman ini sudah kedaluwarsa atau tidak tersedia.' }, 410)

        if (request.method === 'GET' && url.pathname.endsWith('/socket')) {
            if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'WebSocket diperlukan.' }, 426)
            if (this.ctx.getWebSockets().length >= 100) return json({ error: 'Siaran penuh. Silakan coba lagi.' }, 429)
            const pair = new WebSocketPair()
            this.ctx.acceptWebSocket(pair[1])
            pair[1].send(JSON.stringify({ type: 'ready', room: publicRoom(room) }))
            return new Response(null, { status: 101, webSocket: pair[0] })
        }

        if (request.method === 'GET' && url.pathname.endsWith('/chunks')) {
            const after = Number(url.searchParams.get('after') ?? -1)
            if (!Number.isInteger(after) || after < -1) return json({ error: 'Cursor tidak sesuai.' }, 400)
            let items
            if (local(this.env)) {
                items = [...(await this.ctx.storage.list({ prefix: 'chunk:' })).values()].filter(c => c.seq > after).sort((a, b) => a.seq - b.seq).slice(0, 16)
            } else items = (await chunks(this.env, room.id, after)).map(r => r.payload)
            return json({ chunks: items, room: publicRoom(room) })
        }

        if (request.method === 'GET') return json(publicRoom(room))

        if (request.method !== 'POST' || !url.pathname.endsWith('/chunks')) return json({ error: 'Hanya penonton.' }, 405)

        const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || ''
        if (!/^[a-f0-9]{64}$/.test(token) || await hash(token) !== room.hostHash) return json({ error: 'Hanya host yang dapat mengirim rekaman.' }, 403)

        const chunk = await readBody(request)
        return this.ctx.blockConcurrencyWhile(async () => {
            const current = await this.ctx.storage.get('room')
            if (Date.now() >= current.expiresAt) return json({ error: 'Sesi kedaluwarsa.' }, 410)
            const encoded = JSON.stringify(chunk), digest = await hash(encoded), size = new TextEncoder().encode(encoded).length
            if (chunk.seq === current.lastSeq && current.lastDigest === digest) return json({ ok: true })
            if (current.status !== 'live' || chunk.seq !== current.lastSeq + 1) return json({ error: 'Sesi selesai atau paket tidak berurutan.' }, 409)
            const lastTime = validateChunk(chunk, current.lastFrameMs)
            if (current.bytes + size > MAX_BYTES) return json({ error: 'Rekaman mencapai batas 1 MB.' }, 413)
            if (local(this.env)) await this.ctx.storage.put('chunk:' + String(chunk.seq).padStart(6, '0'), chunk)
            else await saveChunk(this.env, current.id, chunk, digest, size, lastTime)
            Object.assign(current, {
                lastSeq: chunk.seq,
                lastDigest: digest,
                bytes: current.bytes + size,
                lastFrameMs: lastTime,
                status: chunk.done ? (chunk.interrupted ? 'interrupted' : 'complete') : 'live',
            })
            await this.ctx.storage.put('room', current)
            for (const socket of this.ctx.getWebSockets()) {
                try {
                    socket.send(JSON.stringify({ type: 'chunk', chunk, status: current.status }))
                } catch {
                    socket.close(1011, 'Reconnect')
                }
            }
            return json({ ok: true })
        })
    }

    webSocketMessage(socket) { socket.close(1008, 'Read-only') }
    webSocketClose(socket, code) { try { socket.close(code === 1000 ? 1000 : 1001) } catch {} }
    webSocketError(socket) { try { socket.close(1011, 'Reconnect') } catch {} }

    async alarm() {
        const room = await this.ctx.storage.get('room')
        if (room && Date.now() < room.expiresAt) {
            await this.ctx.storage.setAlarm(room.expiresAt)
            return
        }
        if (room && !local(this.env)) await deleteRoom(this.env, room.id)
        for (const socket of this.ctx.getWebSockets()) socket.close(1000, 'Expired')
        await this.ctx.storage.deleteAll()
    }
}
