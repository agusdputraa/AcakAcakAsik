import { racePoint } from './race-path.js'
import { raceGroups, makeRacePlan, distanceAt, rankGroups, CIRCUIT_LENGTH } from './race-model.js'
import { animateCharacter } from './characters/character.js'
import { parseGroups } from '../lib/group-format.js'
export function attachRace(engine) {
    let groups=[], lastPublish=0;
    function startRaceSimulation() {
        if(engine.state.isBusy || engine.state.racePhase!=='ready') return;
        if(engine.state.raceListType==='group-members') {
            const {error}=parseGroups(engine.state.raceGroupsText);
            if(error) return engine.showToast(error,'error');
        }
        groups=raceGroups(engine.state);
        if(groups.length<2) return engine.showToast('Masukkan minimal dua peserta atau kelompok.','error');
        engine.clearSimulationTimers();engine.hideWinnerCelebration();engine.sfx.init();
        engine.state.raceRunners=makeRacePlan(groups,engine.state.laps);
        engine.state.raceElapsed=0;lastPublish=0;engine.state.raceWinnersList=[];engine.state.raceActive=false;
        engine.state.racePhase='countdown';
        engine.state.cameraMode='follow';engine.state.cameraSide='rear';
        engine.state.cameraTarget=engine.participantEntities[Math.floor(engine.participantEntities.length/2)]?.id;
        engine.resetFollowCamera();
        engine.setStatus('Bersiap di garis start…',true);
        let count=3;engine.state.countdown=count;engine.publish();engine.sfx.playBeep(false);
        const timer=setInterval(()=>{
            count--;engine.state.countdown=count || 'MULAI!';engine.publish();engine.sfx.playBeep(!count);
            if(!count){clearInterval(timer);engine.state.raceActive=true;engine.state.racePhase='running';engine.state.raceStartTime=performance.now();engine.activeTimers.push(setTimeout(()=>{engine.state.countdown=null;engine.publish();},600));}
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
            const point=racePoint(distance,p.laneOffset);
            p.pos.set(point.x,.13,point.z);
            p.meshParts.root.position.copy(p.pos);
            p.meshParts.root.rotation.y=point.heading;
            p.walkCycle+=delta*2.6;animateCharacter(p.meshParts,p.walkCycle,!r.finished,true);
            p.labelEl.textContent=`${p.name} · ${r.finished ? 'Finis' : `${Math.min(s.laps,Math.floor(distance/CIRCUIT_LENGTH)+1)}/${s.laps}`}`;
        });
        const finished=s.raceRunners.filter(r=>r.finished).length;
        if(s.raceElapsed-lastPublish>.4){lastPublish=s.raceElapsed;engine.setStatus(`Lap ${s.laps} · ${finished}/${s.raceRunners.length} anggota finis`,true);}
        if(finished!==s.raceRunners.length)return;
        s.raceActive=false;s.racePhase='finished';
        s.raceWinnersList=rankGroups(groups,s.raceRunners).map((g,i)=>({...g,rank:i+1,members:g.members.map(name=>({name}))}));
        engine.sfx.playFanfare();engine.launchFireworkShow();engine.setStatus('Urutan sudah ditentukan!',false);
        engine.openResultsModal('Hasil Urutan',s.raceWinnersList);
    }
    function skipRace() {
        const s=engine.state;
        if(s.mode!=='race' || !s.raceActive || s.racePhase!=='running')return;
        engine.clearSimulationTimers();
        s.countdown=null;
        // Advance the existing plan; never draw new speeds or select a new winner.
        s.raceStartTime=performance.now()-(Math.max(...s.raceRunners.map(r=>r.duration))+.01)*1000;
        updateRaceSimulation(0);
    }
    Object.assign(engine,{startRaceSimulation,updateRaceSimulation,skipRace});
}
