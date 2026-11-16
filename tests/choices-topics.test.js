import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {parseChoices,makeChoicePlan,choiceScrollPosition,attachChoices} from '../src/engine/choice-model.js'
import {attachTopics,topicLoopWaypoints} from '../src/engine/topics.js'
import {attachState} from '../src/engine/state.js'

test('choice scrolling stops exactly on the uniformly selected row',()=>{
    const entries=parseChoices(' Satu \n\nDua\nTiga ')
    assert.deepEqual(entries,['Satu','Dua','Tiga'])
    for(const [random,winner] of [[0,0],[.4,1],[.999,2]]) {
        const plan=makeChoicePlan(entries,()=>random)
        assert.equal(plan.winnerIndex,winner)
        assert.equal(choiceScrollPosition(plan,plan.duration)%entries.length,winner)
        assert.equal(choiceScrollPosition(plan,0),0)
        assert.ok(choiceScrollPosition(plan,2)<choiceScrollPosition(plan,4))
        assert.ok(choiceScrollPosition(plan,1)-choiceScrollPosition(plan,0)>choiceScrollPosition(plan,6)-choiceScrollPosition(plan,5))
    }
    assert.equal(makeChoicePlan([]),null)
    const single=makeChoicePlan(['Only'],()=>.99)
    assert.equal(single.winnerIndex,0)
    assert.deepEqual(entries,['Satu','Dua','Tiga'])
})

test('choices use their own list, leave spectators in place, and finish once',()=>{
    const spectator={pos:new THREE.Vector3(2,.12,0),celebrating:false}
    const engine={
        participantEntities:[spectator],draws:[],mcEntity:{celebrating:false},
        drawChoiceScreen(...args){this.draws.push(args)},clearSimulationTimers(){},
        hideWinnerCelebration(){},resetCrowdAndStage(){},resetChoiceCamera(){},
        setStatus(text,busy){this.state.status=text;this.state.isBusy=busy},
        sfx:{init(){},playPop(){},playFanfare(){}},
        launchFireworkShow(){this.celebrations=(this.celebrations||0)+1},
        showToast(text){this.error=text}
    }
    attachState(engine);attachChoices(engine)
    engine.state.choicesText='Satu pilihan'
    engine.startChoiceSimulation()
    assert.equal(engine.state.isBusy,true)
    assert.equal(engine.state.winner,null)
    engine.updateChoiceSimulation(2)
    assert.equal(engine.state.choicesWinner,null)
    assert.deepEqual(spectator.pos.toArray(),[2,.12,0])
    engine.updateChoiceSimulation(5)
    assert.equal(engine.state.choicesWinner,'Satu pilihan')
    assert.equal(engine.state.isBusy,false)
    assert.equal(engine.draws.at(-1)[2],'finished')
    engine.updateChoiceSimulation(10)
    assert.equal(engine.celebrations,1)
    engine.state.choicesText='\n'
    engine.startChoiceSimulation()
    assert.ok(engine.error)
    assert.equal(engine.state.isBusy,false)
    engine.resetChoiceDisplay()
    assert.equal(engine.state.choicesWinner,null)
})

test('topics complete a full loop before assigning their final destination',()=>{
    const engine={
        participantEntities:[],groupZoneData:[{index:0,name:'Topik',theme:{},center:new THREE.Vector3(),width:8,depth:6}],
        rebuildGroupZones(){},clearSimulationTimers(){},hideWinnerCelebration(){},
        spawnParticipants(){this.participantEntities=[0,1].map(index=>({
            index,groupId:'i'+index,meshParts:{root:new THREE.Group()}
        }))},
        setStatus(text,busy){this.state.status=text;this.state.isBusy=busy},
        sfx:{init(){}}
    }
    attachState(engine);attachTopics(engine)
    engine.state.raceListType='individual';engine.state.raceNames='A\nB';engine.state.topicsText='Topik'
    engine.startTopicSimulation()
    assert.equal(engine.state.topicsPhase,'circling')
    assert.equal(engine.state.waitingForGroupArrival,false)
    for(const person of engine.participantEntities) {
        assert.equal(person.waypoints.length,25)
        assert.ok(person.waypoints[0].distanceTo(person.waypoints.at(-1))<1e-10)
        assert.ok(person.waypoints[0].distanceTo(person.topicDestination)>5)
    }
    engine.updateTopicSimulation(true)
    assert.equal(engine.state.topicsPhase,'circling')
    const destinations=engine.participantEntities.map(p=>p.topicDestination)
    engine.updateTopicSimulation(false)
    assert.equal(engine.state.topicsPhase,'arriving')
    assert.equal(engine.state.waitingForGroupArrival,true)
    assert.equal(engine.state.isBusy,true)
    engine.participantEntities.forEach((p,i)=>assert.equal(p.waypoints[0],destinations[i]))
    assert.ok(topicLoopWaypoints(0,2)[0].distanceTo(topicLoopWaypoints(1,2)[0])>20)
})

test('choice category and its independent input survive save/load',()=>{
    let saved
    globalThis.localStorage={setItem(key,value){saved=value},getItem(){return saved}}
    const first={};attachState(first)
    first.state.mode='choices';first.state.choicesText='A\nB'
    first.saveStateToLocalStorage()
    const second={};attachState(second);second.loadStateFromLocalStorage()
    assert.equal(second.state.mode,'choices')
    assert.equal(second.state.choicesText,'A\nB')
    assert.notEqual(second.state.rawText,second.state.choicesText)
})
