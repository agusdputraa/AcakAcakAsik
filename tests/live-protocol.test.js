import test from 'node:test'
import assert from 'node:assert/strict'
import {validateConfig,validateChunk,publicRoom,TTL} from '../server/protocol.js'
import {attachState} from '../src/engine/state.js'
test('public replay configuration excludes secrets and playback mutation state',()=>{
    const engine={};attachState(engine)
    const config=validateConfig({...engine.state,version:1,hostHash:'secret',isBusy:true})
    assert.equal(config.hostHash,undefined);assert.equal(config.isBusy,undefined)
    assert.equal(publicRoom({id:'a',hostHash:'secret'}).hostHash,undefined)
    assert.equal(TTL,604800000)
    assert.throws(()=>validateConfig({...config,groupCount:31}))
    assert.throws(()=>validateConfig({...config,raceNames:Array(201).fill('X').join('\n')}))
})
test('recorded chronology and pose data reject malformed or oversized events',()=>{
    const frame={t:250,people:[[0,.1,1,0,2,1,0,1,0]],camera:[0,22,26,0,0,0],status:'Memilih',busy:true}
    assert.equal(validateChunk({seq:0,frames:[frame],done:false}),250)
    assert.throws(()=>validateChunk({seq:0,frames:[frame],done:false},251))
    assert.throws(()=>validateChunk({seq:0,frames:[{...frame,t:180001}],done:false}))
    assert.throws(()=>validateChunk({seq:0,frames:[{...frame,winner:{name:{bad:true}}}],done:false}))
    assert.throws(()=>validateChunk({seq:0,frames:[{...frame,people:[[NaN]]}],done:false}))
})
