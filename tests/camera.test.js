import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { attachRaceTrack } from '../src/engine/race-track.js';
import { attachState } from '../src/engine/state.js';
test('follow translates the camera without discarding user orbit, zoom or pan; reset restores side',()=>{
 const person={id:'a',pos:new THREE.Vector3(2,.13,3),meshParts:{root:{rotation:{y:Math.PI/2}}}};
 const engine={raceEnvGroup:new THREE.Group(),state:{cameraMode:'follow',cameraTarget:'a',cameraSide:'rear'},participantEntities:[person],camera:new THREE.PerspectiveCamera(),cameraAnim:{active:false},controls:{target:new THREE.Vector3(),update(){}}};
 attachRaceTrack(engine);engine.resetFollowCamera();
 engine.camera.position.set(12,10,8);engine.controls.target.set(3,2,4);
 const offset=engine.camera.position.clone().sub(engine.controls.target);
 person.pos.add(new THREE.Vector3(5,0,-2));engine.updateFollowCamera();
 assert.deepEqual(engine.camera.position.toArray(),[17,10,6]);
 assert.deepEqual(engine.camera.position.clone().sub(engine.controls.target).toArray(),offset.toArray());
 engine.state.cameraSide='front';engine.resetFollowCamera();
 assert.ok(Math.abs(engine.camera.position.x-person.pos.x-6)<1e-8);
});
test('legacy individual category becomes Single while race individual list remains',()=>{
 globalThis.localStorage={getItem(){return JSON.stringify({mode:'individual',raceListType:'individual'})}};
 const engine={};attachState(engine);engine.loadStateFromLocalStorage();
 assert.equal(engine.state.mode,'single');assert.equal(engine.state.raceListType,'individual');
});
