import { neon } from '@neondatabase/serverless'
export function database(env) {
    const url = env?.DATABASE_URL || (typeof process !== 'undefined' ? process.env?.DATABASE_URL : undefined)
    if(!url)throw new Error('Database belum disiapkan.')
    return neon(url)
}
export async function insertRoom(env,room) {
    const sql=database(env)
    await sql`INSERT INTO live_rooms(id,host_hash,config,created_at,expires_at) VALUES(${room.id},${room.hostHash},${JSON.stringify(room.config)}::jsonb,to_timestamp(${room.createdAt}/1000.0),to_timestamp(${room.expiresAt}/1000.0))`
}
export async function saveChunk(env,id,chunk,digest,bytes,lastTime) {
    const sql=database(env)
    // Single atomic statement: retries never append duplicates or double-count bytes.
    const rows=await sql`WITH added AS (
      INSERT INTO live_chunks(room_id,seq,payload,digest)
      SELECT id,${chunk.seq},${JSON.stringify(chunk)}::jsonb,${digest} FROM live_rooms
      WHERE id=${id} AND expires_at>now() AND status='live' AND last_seq=${chunk.seq-1}
      ON CONFLICT DO NOTHING RETURNING room_id
    ) UPDATE live_rooms SET last_seq=${chunk.seq}, bytes=bytes+${bytes},
      last_frame_ms=${lastTime},status=${chunk.done?(chunk.interrupted?'interrupted':'complete'):'live'}
      WHERE id IN (SELECT room_id FROM added) RETURNING id`
    if(rows.length)return
    const existing=await sql`SELECT digest FROM live_chunks WHERE room_id=${id} AND seq=${chunk.seq}`
    if(existing[0]?.digest!==digest)throw new Error('Urutan paket tidak sesuai.')
}
export async function chunks(env,id,after) {
    return database(env)`SELECT payload FROM live_chunks WHERE room_id=${id} AND seq>${after} AND EXISTS(SELECT 1 FROM live_rooms WHERE id=${id} AND expires_at>now()) ORDER BY seq LIMIT 16`
}
export async function deleteRoom(env,id) { await database(env)`DELETE FROM live_rooms WHERE id=${id}` }
export async function purge(env) { await database(env)`DELETE FROM live_rooms WHERE expires_at<=now()` }
