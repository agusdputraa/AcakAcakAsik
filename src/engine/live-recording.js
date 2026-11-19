import { animateCharacter } from './characters/character.js'
import { parseChoices } from './choice-model.js'
import { validateConfig } from '../../server/protocol.js'

const rounded=n=>Math.round(n*100)/100
const pose=(p,moving=p.isMoving)=>[...p.pos.toArray(),p.meshParts.root.rotation.y,p.walkCycle || 0,moving?1:0,p.celebrating?1:0,p.meshParts.root.scale.x,p.meshParts.bodyPivot.position.y].map(rounded)
export function attachLiveRecording(engine) {
    function captureFrame(t) {
        const s=engine.state
        const isSingleOrGroups = ['single','individual','groups'].includes(s.mode)
        let people
        if (isSingleOrGroups && engine.state.masterParticipants?.length) {
            const entityMap = new Map(engine.participantEntities.map(p => [p.id, p]))
            people = engine.state.masterParticipants.map(mp => {
                const p = entityMap.get(mp.id)
                if (p) return pose(p, p.isMoving)
                return [0, -100, 0, 0, 0, 0, 0, 0, 0]
            })
        } else {
            people = engine.participantEntities.map(p=>pose(p,s.mode==='race' && s.raceActive?!p.celebrating:p.isMoving))
        }
        return {
            t:Math.round(t),people,host:engine.mcEntity?pose(engine.mcEntity):null,
            camera:[...engine.camera.position.toArray(),...engine.controls.target.toArray()].map(rounded),
            status:s.status,busy:s.isBusy,racePhase:s.racePhase,countdown:s.countdown,
            result:s.result,winner:s.winner,choicesWinner:s.choicesWinner,
            choice:engine.choiceDisplay || null,
            light:engine.spotlightBeamMesh?.visible?engine.spotlightBeamMesh.position.toArray():null,
        }
    }
    let playback=null,previous=null,received=0
    function applyFrame(frame) {
        previous=playback || frame;playback=frame;received=performance.now()
        Object.assign(engine.state,{status:frame.status,isBusy:frame.busy,racePhase:frame.racePhase,countdown:frame.countdown,result:frame.result,winner:frame.winner,choicesWinner:frame.choicesWinner})
        if(frame.choice)engine.drawChoiceScreen(parseChoices(engine.state.choicesText),frame.choice.position,frame.choice.phase)
        if(engine.spotlightBeamMesh) {
            engine.spotlightBeamMesh.visible=!!frame.light;engine.spotlightRingMesh.visible=!!frame.light
            if(frame.light){engine.spotlightBeamMesh.position.fromArray(frame.light);engine.spotlightRingMesh.position.set(frame.light[0],.14,frame.light[2])}
        }
        engine.publish()
    }
    function renderPlayback() {
        if(!playback)return
        const mix=Math.min(1,(performance.now()-received)/250)
        function apply(person,now,before=now) {
            if(!person || !now)return
            const p=person.meshParts
            for(let i=0;i<3;i++)person.pos.setComponent(i,before[i]+(now[i]-before[i])*mix)
            p.root.position.copy(person.pos)
            p.root.rotation.y=before[3]+Math.atan2(Math.sin(now[3]-before[3]),Math.cos(now[3]-before[3]))*mix
            p.root.scale.setScalar(now[7])
            animateCharacter(p,before[4]+(now[4]-before[4])*mix,!!now[5],engine.state.mode==='race' || engine.state.mode==='topics')
            p.bodyPivot.position.y=now[8]
        }
        playback.people.forEach((p,i)=>apply(engine.participantEntities[i],p,previous.people[i]))
        apply(engine.mcEntity,playback.host,previous.host)
        if(engine.followBroadcast!==false) {
            const camera=playback.camera.map((v,i)=>previous.camera[i]+(v-previous.camera[i])*mix)
            engine.camera.position.fromArray(camera)
            engine.controls.target.fromArray(camera,3)
        }
    }
    Object.assign(engine,{renderPlayback})
    Object.assign(engine.actions,{
        captureFrame,
        exportLiveConfig:()=>validateConfig({...engine.state,version:1}),
        applyFrame,
        setFollowBroadcast:value=>{engine.followBroadcast=value},
    })
}
