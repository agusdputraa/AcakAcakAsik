import test from 'node:test';
import assert from 'node:assert/strict';
import {raceGroups,makeRacePlan,rankGroups,distanceAt,CIRCUIT_LENGTH} from '../src/engine/race-model.js';
import {formatGroups,parseGroups} from '../src/lib/group-format.js';
import {createCharacter} from '../src/engine/characters/character.js';
test('group copy/paste round trip preserves member names and group membership',()=>{
 const groups=[{name:'Kelompok 1',members:['Ayu, S.Pd.','Bima']},{name:'Tim B',members:['Citra','Citra']}];
 assert.deepEqual(parseGroups(formatGroups(groups)),{groups,error:''});
 assert.ok(parseGroups('Nama tanpa kelompok').error);
});
test('only-groups creates exactly three members per group independently of main names',()=>{
 const groups=raceGroups({raceListType:'only-groups',raceGroupCount:4});
 assert.equal(groups.length,4);assert.equal(makeRacePlan(groups,1).length,12);
 assert.deepEqual(groups[0].members,['1','2','3']);
});
test('last member determines group rank; all runners complete the configured laps',()=>{
 const groups=[{id:'a',name:'A',members:['A1','A2']},{id:'b',name:'B',members:['B1','B2']}];
 let index=0;const draws=[.99,.99,0,0,.5,.5,.5,.5];
 const runners=makeRacePlan(groups,1,()=>draws[index++]);
 const ranks=rankGroups(groups,runners,()=>.5);
 assert.equal(ranks[0].id,'b');assert.equal(ranks[1].finishTime,runners[1].duration);
 for(const r of runners){assert.ok(Math.abs(distanceAt(r,r.duration+1)-CIRCUIT_LENGTH)<1e-8);assert.ok(distanceAt(r,r.duration-.1)<CIRCUIT_LENGTH);}
 const three=makeRacePlan(groups,3,()=>.5);assert.equal(three[0].segments.length,6);
 assert.ok(Math.abs(distanceAt(three[0],1000)-3*CIRCUIT_LENGTH)<1e-8);
});
test('random speeds do not depend on names, group IDs or lane order',()=>{
 const a=[{id:'first',members:['Fast sounding name']},{id:'second',members:['Other']}];
 const b=[{id:'second',members:['Other']},{id:'first',members:['Fast sounding name']}];
 const generate=groups=>{let n=0;return makeRacePlan(groups,2,()=>[.1,.8,.2,.9][n++%4]).map(r=>r.duration)};
 assert.deepEqual(generate(a),generate(b));
 assert.notDeepEqual(makeRacePlan(a,1).map(r=>r.duration),makeRacePlan(a,1).map(r=>r.duration));
});
test('character factory exposes separate animated limbs without moving torso',()=>{
 const p=createCharacter();assert.notEqual(p.leftArm,p.bodyPivot.children[0]);assert.notEqual(p.leftArm,p.rightArm);
 assert.equal(p.leftElbow.parent,p.leftArm);assert.equal(p.rightElbow.parent,p.rightArm);
 assert.equal(p.head.parent,p.bodyPivot);
});
