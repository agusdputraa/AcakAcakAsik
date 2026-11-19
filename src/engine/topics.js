import * as THREE from 'three'
import { raceGroups } from './race-model.js'
import { parseGroups } from '../lib/group-format.js'
import { shuffled } from './random.js'

export function parseTopics(text = '') {
    return text.split(/\r?\n/).map(name=>name.trim()).filter(Boolean)
}

export function assignTopics(groups, topics, random) {
    if (!topics.length) return []
    const order=shuffled(topics.map((name,index)=>({name,index,groups:[]})),random)
    shuffled(groups,random).forEach((group,index)=>order[index%order.length].groups.push(group))
    return order.sort((a,b)=>a.index-b.index)
}

export function topicLoopWaypoints(index, total, width = 31.6, depth = 20.8, centerZ = 0) {
    const start = index / Math.max(1,total) * Math.PI * 2
    return Array.from({length:25},(_,step)=>{
        const angle=start+step/24*Math.PI*2
        return new THREE.Vector3(Math.cos(angle)*width/2,.12,Math.sin(angle)*depth/2+centerZ)
    })
}

export function attachTopics(engine) {
    function rebuildTopicZones() {
        const names=parseTopics(engine.state.topicsText)
        engine.rebuildGroupZones(Math.max(1,Math.min(30,names.length)),names)
    }
    function startTopicSimulation() {
        if(engine.state.isBusy)return
        const topics=parseTopics(engine.state.topicsText)
        if(!topics.length || topics.length>30)return engine.showToast('Masukkan 1–30 topik, satu per baris.','error')
        if(new Set(topics).size!==topics.length)return engine.showToast('Gunakan nama topik yang berbeda.','error')
        if(engine.state.raceListType==='group-members') {
            const {error}=parseGroups(engine.state.raceGroupsText)
            if(error)return engine.showToast(error,'error')
        }
        const groups=raceGroups(engine.state)
        if(!groups.length)return engine.showToast('Masukkan minimal satu peserta atau kelompok.','error')
        engine.clearSimulationTimers()
        engine.hideWinnerCelebration()
        rebuildTopicZones()
        engine.spawnParticipants(false)
        engine.focusField?.()
        engine.sfx.init()
        const assigned=assignTopics(groups,topics)
        const result=assigned.map(topic=>{
            const zone=engine.groupZoneData[topic.index]
            const ids=new Set(topic.groups.map(group=>group.id))
            const members=engine.participantEntities.filter(person=>ids.has(person.groupId))
            const cols=Math.max(1,Math.ceil(Math.sqrt(members.length)))
            const rows=Math.max(1,Math.ceil(members.length/cols))
            members.forEach((person,index)=>{
                person.speed=11;person.isMoving=true
                person.meshParts.root.scale.setScalar(Math.min(1,zone.width/cols/1.1,zone.depth/rows/1.1))
                person.topicDestination=new THREE.Vector3(
                    zone.center.x-zone.width/2+zone.width/cols*(index%cols+.5),
                    .12,
                    zone.center.z-zone.depth/2+zone.depth/rows*(Math.floor(index/cols)+.5)
                )
                person.waypoints=topicLoopWaypoints(person.index,engine.participantEntities.length,(engine.fieldLayout?.width || 26.6)+5,(engine.fieldLayout?.depth || 15.8)+5,engine.fieldLayout?.centerZ || 0)
            })
            return {...zone,members,assignedGroups:topic.groups}
        })
        engine.skipAction=()=>{
            engine.clearSimulationTimers()
            engine.participantEntities.forEach(person=>{
                const destination=person.topicDestination || person.waypoints.at(-1)
                if(destination)person.pos.copy(destination)
                person.meshParts.root.position.copy(person.pos)
                person.waypoints=[];person.isMoving=false;person.topicDestination=null
            })
            engine.state.waitingForGroupArrival=false;engine.state.pendingGroupsResult=null
            finalizeTopicArrival(result)
        }
        engine.state.pendingGroupsResult=result
        engine.state.groupArrivalDwellTimer=0
        engine.state.waitingForGroupArrival=false
        engine.state.topicsPhase='circling'
        engine.setStatus('Peserta berlari mengelilingi kotak topik…',true)
    }
    function updateTopicSimulation(anyParticipantMoving) {
        if(engine.state.topicsPhase!=='circling' || anyParticipantMoving)return
        engine.participantEntities.forEach(person=>{
            person.waypoints=[person.topicDestination]
            person.topicDestination=null
            person.speed=8.5;person.isMoving=true
        })
        engine.state.topicsPhase='arriving'
        engine.state.waitingForGroupArrival=true
        engine.state.groupArrivalDwellTimer=0
        engine.setStatus('Peserta menuju topik yang terpilih…',true)
    }
    function finalizeTopicArrival(groups) {
        engine.state.topicsPhase='finished'
        groups.forEach(group=>group.members.forEach(person=>{
            person.celebrating=true
            engine.colorBadgeForGroup(person,group.theme)
        }))
        engine.sfx.playFanfare()
        engine.launchFireworkShow()
        engine.setStatus('Pembagian topik selesai!',false)
        engine.openResultsModal('Topik',groups.map(group=>({
            ...group,
            members:group.assignedGroups.map(assigned=>({
                name:engine.state.raceListType==='individual' ? assigned.name :
                    engine.state.raceListType==='only-groups' ? assigned.name :
                    assigned.name+' · '+assigned.members.join(', ')
            }))
        })))
    }
    Object.assign(engine,{rebuildTopicZones,startTopicSimulation,updateTopicSimulation,finalizeTopicArrival})
}
