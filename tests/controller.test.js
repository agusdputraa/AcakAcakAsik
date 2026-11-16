import test from 'node:test';
import assert from 'node:assert/strict';
import { attachState } from '../src/engine/state.js';
import { attachController } from '../src/engine/controller.js';
test('exclude/reset keeps exact person identity even with duplicate names and list edits',()=>{
 globalThis.localStorage={setItem(){},getItem(){return null}};
 const engine={onState(v){this.view=v},notify(){},renderer:{},sfx:{muted:true},participantEntities:[],spawnParticipants(){},resetCrowdAndStage(){}};
 attachState(engine);attachController(engine);
 engine.actions.updateNames('Ayu\nAyu\nBima');
 const selected=engine.state.masterParticipants[1];engine.showWinnerCelebration(selected);engine.actions.excludeWinner();
 assert.equal(engine.view.participants.length,2);assert.equal(engine.view.rawText,'Ayu\nBima');
 engine.actions.updateNames('Ayu\nBima\nCitra');assert.equal(engine.view.participants.length,3);
 engine.actions.resetExcluded();assert.equal(engine.view.participants.length,4);
 assert.ok(engine.view.participants.some(p=>p.id===selected.id));
});
