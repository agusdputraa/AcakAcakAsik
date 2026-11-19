import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {attachState} from '../src/engine/state.js'
import {attachShared} from '../src/engine/shared.js'
import {attachChoices} from '../src/engine/choice-model.js'
import {attachRaffle} from '../src/engine/raffle.js'
import {attachTopics} from '../src/engine/topics.js'
import {createCharacter} from '../src/engine/characters/character.js'
function engine() {
 const e={participantEntities:[],activeTimers:[],sfx:{init(){},playPop(){},playTing(){},playFanfare(){},},clearSimulationTimers(){this.activeTimers.forEach(clearTimeout);this.activeTimers=[]},hideWinnerCelebration(){},launchFireworkShow(){},spawnConfettiBurst(){},setStatus(text,busy){this.state.status=text;this.state.isBusy=busy},resetCrowdAndStage(){},resetChoiceCamera(){},drawChoiceScreen(entries,pos,phase){this.screen={entries,pos,phase}},showWinnerCelebration(w){this.state.winner=w},resetBadgeStyle(){},highlightBadge(){},getInitialFormationPosition(){return new THREE.Vector3()},spotlightBeamMesh:new THREE.Object3D(),spotlightRingMesh:new THREE.Object3D(),showToast(){},publish(){}}
 attachState(e);attachShared(e);return e
}
test('skip choices finishes the already generated plan once',()=>{
 const e=engine();attachChoices(e);e.state.choicesText='A\nB'
 e.startChoiceSimulation();e.skipAction()
 const winner=e.state.choicesWinner
 assert.ok(['A','B'].includes(winner));assert.equal(e.state.isBusy,false)
 e.updateChoiceSimulation(20);assert.equal(e.state.choicesWinner,winner)
})
test('skip spotlight and host pickup clears delayed callbacks and preserves chosen person',t=>{
 t.mock.timers.enable({apis:['setInterval','setTimeout']})
 for(const type of ['spotlight','mc']){
  const e=engine()
  e.participantEntities=['A','B'].map((name,id)=>({id,name,pos:new THREE.Vector3(),meshParts:createCharacter(),waypoints:[]}))
  e.mcEntity={pos:new THREE.Vector3(),meshParts:createCharacter(),waypoints:[]}
  attachRaffle(e)
  if(type==='spotlight')e.startSpotlightRaffle();else e.startMCPickupRaffle()
  e.skipAction()
  const winner=e.state.winner
  assert.ok(winner);assert.equal(e.state.isBusy,false)
  t.mock.timers.tick(100000)
  assert.deepEqual(e.state.winner,winner)
 }
})
