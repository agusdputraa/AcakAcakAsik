import { raceGroups, makeRacePlan, distanceAt, rankGroups, CIRCUIT_LENGTH, CIRCUIT_X, CIRCUIT_Z } from './race-model.js'
import { animateCharacter } from './characters/character.js'
import { parseGroups } from '../lib/group-format.js'
export function attachRace(engine) {
    let groups=[], lastPublish=0;
    function startRaceSimulation() {
        if(engine.state.isBusy) return;
        if(engine.state.raceListType==='group-members') {
            const {error}=parseGroups(engine.state.raceGroupsText);
            if(error) return engine.showToast(error,'error');
        }
        groups=raceGroups(engine.state);
        if(groups.length<2) return engine.showToast('Masukkan minimal dua peserta atau kelompok.','error');
        engine.clearSimulationTimers();engine.spawnParticipants(false);engine.hideWinnerCelebration();engine.sfx.init();
        engine.state.raceRunners=makeRacePlan(groups,engine.state.laps);
        engine.state.raceElapsed=0;lastPublish=0;engine.state.raceWinnersList=[];engine.state.raceActive=false;
        engine.setStatus('Bersiap di garis start…',true);
        let count=3;engine.state.countdown=count;engine.publish();engine.sfx.playBeep(false);
        const timer=setInterval(()=>{
            count--;engine.state.countdown=count || 'MULAI!';engine.publish();engine.sfx.playBeep(!count);
            if(!count){clearInterval(timer);engine.state.raceActive=true;engine.state.raceStartTime=performance.now();engine.activeTimers.push(setTimeout(()=>{engine.state.countdown=null;engine.publish();},600));}
        },1000);engine.activeTimers.push(timer);
    }
    function updateRaceSimulation(dt) {
        const s=engine.state;s.raceElapsed=(performance.now()-s.raceStartTime)/1000;
        s.raceRunners.forEach(r=>{
            const p=engine.participantEntities.find(p=>p.id===r.id);
            if(r.finished) return;
            const distance=distanceAt(r,s.raceElapsed), delta=distance-r.distance;r.distance=distance;
            r.finished=s.raceElapsed>=r.duration;
            p.celebrating=r.finished;
            const theta=distance/CIRCUIT_LENGTH*Math.PI*2;
            p.pos.set((CIRCUIT_X+p.laneOffset)*Math.sin(theta),.13,(CIRCUIT_Z+p.laneOffset)*Math.cos(theta));
            p.meshParts.root.position.copy(p.pos);
            p.meshParts.root.rotation.y=Math.atan2((CIRCUIT_X+p.laneOffset)*Math.cos(theta),-(CIRCUIT_Z+p.laneOffset)*Math.sin(theta));
            p.walkCycle+=delta*2.6;animateCharacter(p.meshParts,p.walkCycle,!r.finished,true);
            p.labelEl.textContent=`${p.name} · ${r.finished ? 'Finis' : `${Math.min(s.laps,Math.floor(distance/CIRCUIT_LENGTH)+1)}/${s.laps}`}`;
        });
        const finished=s.raceRunners.filter(r=>r.finished).length;
        if(s.raceElapsed-lastPublish>.4){lastPublish=s.raceElapsed;engine.setStatus(`Lap ${s.laps} · ${finished}/${s.raceRunners.length} anggota finis`,true);}
        if(finished!==s.raceRunners.length)return;
        s.raceActive=false;
        s.raceWinnersList=rankGroups(groups,s.raceRunners).map((g,i)=>({...g,rank:i+1,members:g.members.map(name=>({name}))}));
        engine.sfx.playFanfare();engine.launchFireworkShow();engine.setStatus('Semua peserta sudah finis!',false);
        engine.openResultsModal('Hasil Balap',s.raceWinnersList);
    }
    Object.assign(engine,{startRaceSimulation,updateRaceSimulation});
}
