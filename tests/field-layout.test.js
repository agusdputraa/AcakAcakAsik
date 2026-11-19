import test from 'node:test'
import assert from 'node:assert/strict'
import { fieldLayout } from '../src/engine/field-layout.js'

test('1–30 destinations have equal areas, clear aisles and room for a waiting area',()=>{
    let area=0
    for(let n=1;n<=30;n++) {
        const layout=fieldLayout(n,90)
        assert.equal(layout.centers.length,n)
        for(const [i,[x,z]] of layout.centers.entries()) {
            assert.ok(Math.abs(x)+layout.size/2<layout.width/2)
            assert.ok(Math.abs(z-layout.centerZ)+layout.size/2<layout.depth/2)
            for(const [otherX,otherZ] of layout.centers.slice(i+1))
                assert.ok(Math.abs(x-otherX)>=layout.size+2.9 || Math.abs(z-otherZ)>=layout.size+2.9)
        }
        assert.ok(layout.waitingZ-7>0)
        assert.ok(layout.waitingZ+24<79)
        assert.ok(layout.width/2<79)
        const empty=fieldLayout(n)
        assert.ok(empty.width*empty.depth>=area)
        area=empty.width*empty.depth
    }
})
