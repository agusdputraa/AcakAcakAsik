import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {racePoint,CIRCUIT_LENGTH} from '../src/engine/race-path.js'
import {attachRaceTrack} from '../src/engine/race-track.js'
import {attachRace} from '../src/engine/race.js'
import {assignTopics,parseTopics,attachTopics} from '../src/engine/topics.js'
import {attachState} from '../src/engine/state.js'

test('rounded rectangle has straight sides, continuous corners and closed lanes',()=>{
    for(const offset of [-4.3,0,4.3]) {
        const start=racePoint(0,offset), end=racePoint(CIRCUIT_LENGTH,offset)
        assert.deepEqual(start,end)
        assert.equal(start.z,11+offset)
        const early=racePoint(3,offset)
        assert.ok(early.x>0)
        assert.equal(early.z,start.z)
        let previous=start
        for(let i=1;i<=2000;i++) {
            const point=racePoint(i/2000*CIRCUIT_LENGTH,offset)
            assert.ok(Math.hypot(point.x-previous.x,point.z-previous.z)<.1)
            const headingChange=Math.atan2(Math.sin(point.heading-previous.heading),Math.cos(point.heading-previous.heading))
            assert.ok(Math.abs(headingChange)<.05)
            previous=point
        }
    }
})

function trackEngine() {
    const engine={
        createSignTexture:()=>new THREE.Texture(),raceEnvGroup:new THREE.Group(),
        camera:new THREE.PerspectiveCamera(45,1.5),cameraAnim:{},controls:{target:new THREE.Vector3(),update(){}},
        moveCameraSmoothly(){},setStatus(status,busy){this.state.status=status;this.state.isBusy=busy},
        showToast(message){this.error=message},participantEntities:[0,1,2].map(i=>({
            id:'g'+i+'-0',pos:new THREE.Vector3(),meshParts:{root:new THREE.Group()},waypoints:[]
        }))
    }
    attachState(engine);engine.state.mode='race'
    attachRaceTrack(engine)
    return engine
}
test('race waits for explicit walk and explicit start; camera follows from behind above',()=>{
    const engine=trackEngine()
    engine.positionRaceParticipants()
    assert.equal(engine.state.racePhase,'waiting')
    assert.ok(engine.participantEntities.every(p=>p.pos.z>=20))
    attachRace(engine)
    engine.startRaceSimulation()
    assert.equal(engine.state.raceActive,false)
    engine.goToRaceStart()
    assert.equal(engine.state.racePhase,'walking')
    assert.equal(engine.state.isBusy,true)
    assert.ok(engine.participantEntities.every(p=>p.waypoints.length===4 && p.speed<6))
    engine.startRaceSimulation()
    assert.equal(engine.state.raceActive,false)
    engine.finishRaceWalk()
    assert.equal(engine.state.racePhase,'ready')
    assert.equal(engine.state.isBusy,false)
    engine.state.cameraTarget=engine.participantEntities[0].id
    engine.resetFollowCamera()
    const p=engine.participantEntities[0]
    assert.ok(engine.camera.position.x<p.pos.x-10)
    assert.equal(engine.camera.position.y,p.pos.y+6)
})
test('topic assignment preserves each whole group exactly once and balances topics',()=>{
    const groups=Array.from({length:7},(_,i)=>({id:i,name:'G'+i,members:['A'+i,'B'+i]}))
    const assigned=assignTopics(groups,['Air','Tanah','Udara'],()=>.3)
    assert.deepEqual(assigned.map(t=>t.name),['Air','Tanah','Udara'])
    const all=assigned.flatMap(t=>t.groups)
    assert.equal(new Set(all.map(g=>g.id)).size,7)
    assert.ok(all.every(g=>groups.includes(g)))
    assert.deepEqual(assigned.map(t=>t.groups.length).sort(),[2,2,3])
    assert.equal(assignTopics(groups.slice(0,1),['A','B','C']).flatMap(t=>t.groups).length,1)
    assert.deepEqual(parseTopics(' A \n\n B\n'),['A','B'])
})
test('invalid topic lists are rejected before starting or replacing group history',()=>{
    const engine={showToast(message){this.error=message}}
    attachState(engine);attachTopics(engine)
    engine.state.lastGroupsResult=[{name:'Saved',members:[]}]
    for(const text of ['', 'A\nA',Array(31).fill(0).map((_,i)=>String(i)).join('\n')]) {
        engine.state.topicsText=text
        engine.error=null;engine.startTopicSimulation()
        assert.ok(engine.error)
        assert.equal(engine.state.isBusy,false)
        assert.equal(engine.state.lastGroupsResult[0].name,'Saved')
    }
})

test('skip finishes the existing race plan once and preserves its ranking and times',async t=>{
    const {createCharacter}=await import('../src/engine/characters/character.js')
    t.mock.timers.enable({apis:['setInterval','setTimeout']})
    const engine=trackEngine()
    Object.assign(engine,{
        activeTimers:[],clearSimulationTimers(){this.activeTimers.forEach(clearTimeout);this.activeTimers=[]},
        hideWinnerCelebration(){},publish(){},
        sfx:{init(){},playBeep(){},playFanfare(){}},launchFireworkShow(){},
        openResultsModal(title,entries){this.results=entries;this.resultCount=(this.resultCount||0)+1}
    })
    engine.state.raceListType='individual';engine.state.raceNames='Ayu\nBima'
    engine.participantEntities=['Ayu','Bima'].map((name,i)=>({
        id:'i'+i+'-0',name,pos:new THREE.Vector3(),meshParts:createCharacter(),
        laneOffset:i,walkCycle:0,labelEl:{},waypoints:[]
    }))
    attachRace(engine)
    engine.state.racePhase='ready'
    engine.startRaceSimulation()
    assert.equal(engine.state.racePhase,'countdown')
    const plan=engine.state.raceRunners
    const expected=[...plan].sort((a,b)=>a.duration-b.duration)
    engine.skipRace()
    assert.equal(engine.state.raceRunners,plan)
    assert.deepEqual(engine.results.map(r=>r.id),expected.map(r=>r.groupId))
    assert.deepEqual(engine.results.map(r=>r.finishTime),expected.map(r=>r.duration))
    assert.equal(engine.state.racePhase,'finished')
    assert.equal(engine.state.countdown,null)
    assert.equal(engine.state.isBusy,false)
    assert.ok(plan.every(r=>r.finished))
    engine.skipRace()
    assert.equal(engine.resultCount,1)
})

test('finishing or skipping restores the rear camera heading at the finish line',()=>{
    const engine=trackEngine()
    engine.positionRaceParticipants()
    const person=engine.participantEntities[0]
    engine.state.cameraMode='follow';engine.state.cameraTarget=person.id
    person.meshParts.root.rotation.y=0
    engine.resetFollowCamera()
    person.pos.set(0,.13,11)
    person.meshParts.root.rotation.y=Math.PI/2
    engine.state.racePhase='finished'
    engine.updateFollowCamera()
    assert.ok(Math.abs(engine.camera.position.x+11)<1e-8)
    assert.ok(Math.abs(engine.camera.position.z-11)<1e-8)
})
