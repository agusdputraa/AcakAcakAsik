import test from 'node:test'
import assert from 'node:assert/strict'
import { database, insertRoom, saveChunk, chunks, deleteRoom, purge } from '../server/database.js'

test('Neon Database end-to-end: insert room, save chunk, read chunks, and cascade delete', async (t) => {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
        t.skip('DATABASE_URL not set, skipping Neon test')
        return
    }

    const testId = 'f' + crypto.randomUUID().replaceAll('-', '').slice(1) // 32 hex chars
    const hostHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    const now = Date.now()
    const room = {
        id: testId,
        hostHash,
        config: { mode: 'groups', groupCount: 3 },
        createdAt: now,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000
    }

    // 1. Insert room
    await insertRoom({}, room)

    const sql = database({})
    const roomRows = await sql`SELECT id, status, last_seq FROM live_rooms WHERE id=${testId}`
    assert.equal(roomRows.length, 1, 'Room should be inserted in Neon')
    assert.equal(roomRows[0].id, testId)
    assert.equal(roomRows[0].status, 'live')
    assert.equal(roomRows[0].last_seq, -1)

    // 2. Save chunk 0
    const chunk0 = {
        seq: 0,
        frames: [{ t: 100, people: [], camera: [0, 20, 20, 0, 0, 0], status: 'Mulai', busy: true }],
        done: false
    }
    await saveChunk({}, testId, chunk0, 'digest0', 128, 100)

    const chunkRows0 = await chunks({}, testId, -1)
    assert.equal(chunkRows0.length, 1, 'Chunk 0 should be retrieved')
    assert.equal(chunkRows0[0].payload.seq, 0)
    assert.equal(chunkRows0[0].payload.frames[0].status, 'Mulai')

    // 3. Save chunk 1 (final/done)
    const chunk1 = {
        seq: 1,
        frames: [{ t: 250, people: [], camera: [0, 20, 20, 0, 0, 0], status: 'Selesai', busy: false }],
        done: true
    }
    await saveChunk({}, testId, chunk1, 'digest1', 140, 250)

    const updatedRoom = await sql`SELECT status, last_seq FROM live_rooms WHERE id=${testId}`
    assert.equal(updatedRoom[0].status, 'complete', 'Room should transition to complete')
    assert.equal(updatedRoom[0].last_seq, 1)

    const allChunks = await chunks({}, testId, -1)
    assert.equal(allChunks.length, 2, 'Both chunks should be present')
    assert.equal(allChunks[1].payload.seq, 1)

    // 4. Test ON DELETE CASCADE
    await deleteRoom({}, testId)
    const afterDeleteRoom = await sql`SELECT id FROM live_rooms WHERE id=${testId}`
    assert.equal(afterDeleteRoom.length, 0, 'Room should be hard deleted')

    const afterDeleteChunks = await sql`SELECT seq FROM live_chunks WHERE room_id=${testId}`
    assert.equal(afterDeleteChunks.length, 0, 'Chunks must be cascade deleted')

    // 5. Test purge function works without throwing
    await purge({})
})
