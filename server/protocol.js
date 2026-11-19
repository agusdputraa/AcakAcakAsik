export const TTL = 7*24*60*60*1000
export const MAX_BYTES = 1024*1024
export const MAX_DURATION = 180000
export const MAX_PARTICIPANTS = 200
export const MODES = ['single','groups','topics','race','choices']
const fields=['rawText','masterParticipants','groupCount','singleType','raceListType','raceGroupCount','raceNames','raceGroupsText','topicsText','choicesText','laps','excludedIds']
export function validId(id) { return /^[a-f0-9]{32}$/.test(id) }
export function validateConfig(input) {
    if(!input || input.version!==1 || !MODES.includes(input.mode))throw new Error('Konfigurasi siaran tidak sesuai.')
    const config={version:1,mode:input.mode}
    for(const key of fields) if(input[key]!==undefined)config[key]=input[key]
    if(JSON.stringify(config).length>60000)throw new Error('Daftar siaran terlalu besar.')
    if(!Array.isArray(config.masterParticipants) || config.masterParticipants.length>MAX_PARTICIPANTS)throw new Error('Siaran mendukung maksimal 200 karakter.')
    if(config.masterParticipants.some(p=>!p || !['string','number'].includes(typeof p.id) || typeof p.name!=='string' || p.name.length>200))throw new Error('Nama peserta tidak sesuai.')
    for(const key of ['rawText','raceNames','raceGroupsText','topicsText','choicesText'])if(typeof config[key]!=='string' || config[key].length>20000)throw new Error('Daftar tidak sesuai.')
    for(const key of ['groupCount','raceGroupCount','laps'])if(!Number.isInteger(config[key]) || config[key]<1 || config[key]>30)throw new Error('Jumlah harus 1–30.')
    if(!['individual','only-groups','group-members'].includes(config.raceListType) || !['spotlight','mc'].includes(config.singleType))throw new Error('Mode tidak sesuai.')
    if(!Array.isArray(config.excludedIds) || config.excludedIds.some(id=>!['string','number'].includes(typeof id)))throw new Error('Daftar tidak sesuai.')
    if(config.raceNames.split(/\r?\n/).filter(s=>s.trim()).length>200 || config.raceGroupsText.split(/\r?\n/).filter(s=>/^[-*]\s/.test(s.trim())).length>200)throw new Error('Siaran mendukung maksimal 200 karakter.')
    if(config.topicsText.split(/\r?\n/).filter(s=>s.trim()).length>30)throw new Error('Maksimal 30 topik.')
    return config
}
export function validateChunk(chunk,lastTime=0) {
    if(!chunk || !Number.isInteger(chunk.seq) || chunk.seq<0 || typeof chunk.done!=='boolean' || !Array.isArray(chunk.frames) || !chunk.frames.length || chunk.frames.length>12)throw new Error('Paket rekaman tidak sesuai.')
    for(const frame of chunk.frames) {
        if(!Number.isFinite(frame.t) || frame.t<lastTime || frame.t>MAX_DURATION || !Array.isArray(frame.people) || frame.people.length>MAX_PARTICIPANTS)throw new Error('Batas rekaman terlampaui.')
        for(const p of [...frame.people,...(frame.host?[frame.host]:[])]) {
            if(!Array.isArray(p) || p.length!==9 || p.some(v=>!Number.isFinite(v)) || p.some(v=>Math.abs(v)>100000))throw new Error('Gerakan karakter tidak sesuai.')
        }
        if(!Array.isArray(frame.camera) || frame.camera.length!==6 || frame.camera.some(v=>!Number.isFinite(v)))throw new Error('Kamera tidak sesuai.')
        if(frame.result && (!Array.isArray(frame.result.entries) || frame.result.entries.length>200 || frame.result.entries.some(e=>typeof e.name!=='string' || !Array.isArray(e.members) || e.members.some(n=>typeof n!=='string'))))throw new Error('Hasil tidak sesuai.')
        if(typeof frame.status!=='string' || frame.status.length>500 || typeof frame.busy!=='boolean')throw new Error('Status tidak sesuai.')
        if(frame.winner && (typeof frame.winner.name!=='string' || frame.winner.name.length>200 || !['string','number'].includes(typeof frame.winner.id)))throw new Error('Pemenang tidak sesuai.')
        if(frame.choicesWinner!=null && typeof frame.choicesWinner!=='string')throw new Error('Pilihan tidak sesuai.')
        if(frame.countdown!=null && !['number','string'].includes(typeof frame.countdown))throw new Error('Hitungan tidak sesuai.')
        if(frame.result && !['race','groups','topics'].includes(frame.result.kind))throw new Error('Jenis hasil tidak sesuai.')
        if(frame.light && (!Array.isArray(frame.light) || frame.light.length!==3 || frame.light.some(n=>!Number.isFinite(n))))throw new Error('Lampu tidak sesuai.')
        if(frame.choice && (!Number.isFinite(frame.choice.position) || !['idle','spinning','finished'].includes(frame.choice.phase)))throw new Error('Layar tidak sesuai.')
        lastTime=frame.t
    }
    return lastTime
}
export async function hash(text) {
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('')
}
export function publicRoom(room) {
    return {id:room.id,config:room.config,expiresAt:room.expiresAt,status:room.status,lastSeq:room.lastSeq,lastFrameMs:room.lastFrameMs}
}
