import test from 'node:test'
import assert from 'node:assert/strict'
import {attachState} from '../src/engine/state.js'
const base=process.env.LIVE_TEST_URL
test('local live API enforces ownership, ordering, immutable completion and replay', {skip:!base},async()=>{
    const engine={};attachState(engine)
    const call=(path,options={})=>fetch(base+path,{...options,headers:{Origin:'http://localhost:5173','Content-Type':'application/json',...options.headers}})
    const created=await call('/api/rooms',{method:'POST',body:JSON.stringify({config:{...engine.state,version:1}})})
    assert.equal(created.status,200)
    const room=await created.json()
    assert.match(room.token,/^[a-f0-9]{64}$/)
    const path='/api/rooms/'+room.id
    const publicData=await (await call(path)).json()
    assert.equal(publicData.token,undefined);assert.equal(publicData.hostHash,undefined)
    const frame={t:0,people:[],camera:[0,20,20,0,0,0],status:'Ready',busy:false}
    const chunk={seq:0,frames:[frame],done:false}
    const post=(body,token=room.token)=>call(path+'/chunks',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)})
    assert.equal((await post(chunk,'bad')).status,403)
    assert.equal((await post({...chunk,seq:2})).status,409)
    assert.equal((await post(chunk)).status,200)
    assert.equal((await post(chunk)).status,200)
    assert.equal((await post({...chunk,frames:[{...frame,t:10}]})).status,409)
    assert.equal((await post({seq:1,frames:[{...frame,t:500}],done:true})).status,200)
    assert.equal((await post({seq:2,frames:[{...frame,t:600}],done:true})).status,409)
    const replay=await (await call(path+'/chunks?after=-1')).json()
    assert.equal(replay.room.status,'complete')
    assert.deepEqual(replay.chunks.map(c=>c.seq),[0,1])
    assert.equal((await call('/api/rooms/'+'a'.repeat(32))).status,410)
})
