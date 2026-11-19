import { formatGroups } from '../lib/group-format.js'
import * as THREE from 'three'

export function attachController(engine) {
    function publish() {
        const { mode, rawText, masterParticipants, groupCount, isBusy, status, result, winner, countdown,
            raceWinnersList, lastGroupsResult } = engine.state;
        engine.onState({
            ...engine.state,
            excludedCount: engine.state.excludedIds.length,
            cameraRoster: engine.participantEntities.map(p=>({id:p.id,name:p.name,groupName:p.groupName})),
            mode, rawText, participants: masterParticipants.filter(p=>!engine.state.excludedIds.includes(p.id)), groupCount, isBusy, status, result, winner, countdown,
            hasRaceResults: raceWinnersList.length > 0 && !isBusy,
            hasSavedGroups: lastGroupsResult.length > 0,
            muted: engine.sfx.muted, fallback: engine.renderer.isFallback === true
        });
    }

    function showToast(message, type = 'info') {
        engine.notify(message, type);
    }

    function showWinnerCelebration(winner) {
        engine.state.winner = winner;
        publish();
    }

    function hideWinnerCelebration() {
        if (engine.state.winner) showWinnerCelebration(null);
    }

    function openResultsModal(title, entries) {
        const kind = title === 'Topik' ? 'topics' : title === 'Kelompok' ? 'groups' : 'race';
        engine.state.result = {
            kind,
            listType: engine.state.raceListType,
            entries: entries.map(({ name, members, rank, finishTime, theme }, index) => ({
                name, index, rank, finishTime, color: theme?.hex, members: members.map(member => member.name)
            }))
        };
        publish();
    }

    function closeResults() {
        engine.state.result = null;
        publish();
    }

    function showLastRaceResults() {
        if (!engine.state.isBusy && engine.state.raceWinnersList.length) {
            openResultsModal('Hasil Urutan', engine.state.raceWinnersList);
        }
    }

    function setRaceInputsLocked(locked) {
        engine.controls.enabled = true;
    }

    function setRaceOption(key, value) {
        const camera=['cameraMode','cameraTarget','cameraSide','raceCameraView'].includes(key);
        if(engine.state.isBusy && !camera)return;
        if(key==='laps') value=Math.max(1,Math.min(30,Number(value)||1));
        if(key==='raceGroupCount') value=Math.max(2,Math.min(30,Number(value)||2));
        engine.state[key]=value;
        if(camera){if(key==='raceCameraView')engine.state.cameraMode='track';engine.controls.enabled=true;resetCamera();}
        else if(['race','topics'].includes(engine.state.mode)) {
            engine.state.raceWinnersList=[];engine.state.result=null;
            if(engine.state.mode==='topics') { engine.rebuildTopicZones(); resetCamera(); }
            engine.spawnParticipants(false);
            engine.setStatus(engine.state.mode==='race'?'Berkumpul di area tunggu.':'Siap membagikan topik.');
        }
        if(key==='choicesText')engine.resetChoiceDisplay();
        if(!engine.playbackConfig)engine.saveStateToLocalStorage();publish();
    }
    function useSavedGroups(){setRaceOption('raceGroupsText',formatGroups(engine.state.lastGroupsResult));}
    function excludeWinner(){
        const id=engine.state.winner?.id;if(id==null || engine.state.isBusy)return;
        if(!engine.state.excludedIds.includes(id)) engine.state.excludedIds.push(id);
        engine.state.rawText=engine.state.masterParticipants.filter(p=>!engine.state.excludedIds.includes(p.id)).map(p=>p.name).join("\n");
        engine.spawnParticipants(false);engine.saveStateToLocalStorage();publish();
    }
    function resetExcluded(){
        if(engine.state.isBusy)return;
        engine.state.excludedIds=[];engine.state.winner=null;engine.state.rawText=engine.state.masterParticipants.map(p=>p.name).join("\n");engine.spawnParticipants(false);engine.resetCrowdAndStage();engine.saveStateToLocalStorage();publish();
    }

    function resetCamera() {
        engine.controls.enabled = true;
        engine.controls.minDistance = 2;
        engine.clearFollowCamera();
        if (engine.state.cameraMode === 'follow') { engine.resetFollowCamera(); return; }
        if (['groups','topics'].includes(engine.state.mode)) { if(engine.focusField) engine.focusField(true); else engine.moveCameraSmoothly(new THREE.Vector3(0,22,26),new THREE.Vector3(0,.5,0)); }
        else if (engine.state.mode === 'race') engine.resetRaceCamera();
        else if (engine.state.mode === 'choices') engine.resetChoiceCamera();
        else engine.moveCameraSmoothly(new THREE.Vector3(0, 11.5, 19.5), new THREE.Vector3(0, 1, -2.5));
    }

    function selectMode(mode, skipAudio = false) {
        if (engine.state.isBusy) {
            showToast('Tunggu animasi selesai.', 'error');
            return;
        }
        engine.skipAction=null;
        engine.state.mode = mode;
        engine.state.cameraMode='track'; engine.state.cameraTarget=null;engine.controls.enabled=true;
        engine.clearSimulationTimers();
        hideWinnerCelebration();
        if (!skipAudio) engine.sfx.playPop(1);

        engine.state.result=null;
        engine.state.topicsPhase='idle';engine.state.choicesWinner=null;
        engine.setChoiceStageVisible(mode==='choices');
        engine.resetChoiceDisplay();
        engine.state.waitingForGroupArrival=false;engine.state.pendingGroupsResult=null;
        engine.state.raceActive=false;engine.state.racePhase='waiting';engine.state.raceCameraView='waiting';
        engine.activateWorld?.(mode);
        if(mode==='topics')engine.rebuildTopicZones();
        else if(mode==='groups')engine.rebuildGroupZones(engine.state.groupCount);

        if (engine.mcEntity) {
            const host = engine.mcEntity;
            (engine.activeHostGroup || (mode === 'race' ? engine.raceEnvGroup : engine.stageEnvGroup)).add(host.meshParts.root);
            host.meshParts.root.visible = ['single','individual','choices','race'].includes(mode);
            host.waypoints = [];
            host.isMoving = false;
            host.celebrating = false;
            if (mode === 'race') {
                host.pos.set(-10, engine.STAGE_TOP_Y, engine.STAGE_Z + 28.2);
                host.meshParts.root.position.copy(host.pos);
                host.meshParts.root.rotation.y = 0;
            }
        }
        if (mode !== 'race') {
            engine.state.raceRunners = [];
            engine.configureRaceLanes(0);
            engine.controls.maxDistance = engine.activateWorld ? 850 : 58;
            engine.camera.far = engine.activateWorld ? 1500 : 200;
            engine.camera.updateProjectionMatrix();
        }
        engine.spawnParticipants(false);
        if (['single','individual','choices'].includes(engine.state.mode)) engine.resetCrowdAndStage();
        resetCamera();
        if(!engine.playbackConfig)engine.saveStateToLocalStorage();
        const status = {
            groups: 'Siap membagi kelompok',
            single: 'Siap memilih satu orang',
            individual: 'Siap memilih langsung',
            race: 'Berkumpul di area tunggu.',
            topics: 'Siap membagikan topik',
            choices: 'Siap mengacak pilihan di layar',
        };
        engine.setStatus(status[mode]);
    }

    function updateNames(rawText) {
        if (engine.state.isBusy) return;
        const excluded=engine.state.masterParticipants.filter(p=>engine.state.excludedIds.includes(p.id));
        const old=engine.state.masterParticipants.filter(p=>!engine.state.excludedIds.includes(p.id));
        engine.state.rawText = rawText;
        engine.state.masterParticipants = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
            .map(name => {const index=old.findIndex(p=>p.name===name);return index>=0 ? old.splice(index,1)[0] : {id:crypto.randomUUID(),name};});
        engine.state.masterParticipants.push(...excluded);
        engine.state.excludedIds=engine.state.excludedIds.filter(id=>engine.state.masterParticipants.some(p=>p.id===id));
        if(!engine.playbackConfig)engine.saveStateToLocalStorage();
        publish();
    }

    function applyNames() {
        if (engine.state.isBusy) return;
        if (engine.state.masterParticipants.length < 2) {
            showToast('Masukkan minimal 2 nama peserta.', 'error');
            return;
        }
        hideWinnerCelebration();
        engine.spawnParticipants(true);
        if (['single','individual','choices'].includes(engine.state.mode)) engine.resetCrowdAndStage();
        showToast('Peserta berhasil diterapkan ke arena!', 'success');
    }

    function shuffleNames() {
        if (engine.state.isBusy) return;
        if (engine.state.masterParticipants.length < 2) {
            showToast('Masukkan minimal 2 nama peserta.', 'error');
            return;
        }
        updateNames(engine.shuffleArray(engine.state.masterParticipants.filter(p=>!engine.state.excludedIds.includes(p.id))).map(person => person.name).join('\n'));
        engine.spawnParticipants(true);
        if (['single','individual','choices'].includes(engine.state.mode)) engine.resetCrowdAndStage();
        showToast('Urutan peserta diacak!', 'success');
    }

    function deleteParticipant(id) {
        if (engine.state.isBusy) return;
        const person = engine.state.masterParticipants.find(participant => participant.id === id);
        if (!person) return;
        updateNames(engine.state.masterParticipants.filter(participant => participant.id !== id && !engine.state.excludedIds.includes(participant.id)).map(participant => participant.name).join('\n'));
        engine.spawnParticipants(true);
        if (['single','individual','choices'].includes(engine.state.mode)) engine.resetCrowdAndStage();
        showToast(`"${person.name}" dihapus dari daftar.`, 'success');
    }

    function setGroupCount(count) {
        if (engine.state.isBusy || count === engine.state.groupCount) return;
        engine.state.groupCount = Math.max(2, Math.min(30, count));
        engine.rebuildGroupZones(engine.state.groupCount);
        engine.spawnParticipants(false);
        resetCamera();
        if(!engine.playbackConfig)engine.saveStateToLocalStorage();
        engine.sfx.playPop(engine.state.groupCount - 2);
        publish();
    }

    function start() {
        if (engine.state.isBusy) return;
        if (!['race','topics','choices'].includes(engine.state.mode)) {
            const sameParticipants = engine.state.masterParticipants.length === engine.participantEntities.length
                && engine.state.masterParticipants.every((person, index) =>
                    person.name === engine.participantEntities[index].name && person.id === engine.participantEntities[index].id);
            if (!sameParticipants) engine.spawnParticipants(false);
        }
        if (engine.state.mode === 'groups') engine.startGroupDivisionSimulation();
        else if (engine.state.mode === 'individual' || (engine.state.mode === 'single' && engine.state.singleType === 'spotlight')) engine.startSpotlightRaffle();
        else if (engine.state.mode === 'single') engine.startMCPickupRaffle();
        else if (engine.state.mode === 'choices') engine.startChoiceSimulation();
        else if (engine.state.mode === 'topics') engine.startTopicSimulation();
        else if (engine.state.racePhase === 'ready') engine.startRaceSimulation();
        else engine.goToRaceStart();
        if (engine.state.isBusy) engine.onCollapse();
    }

    function toggleAudio() {
        const muted = engine.sfx.toggleMute();
        showToast(muted ? 'Suara dimatikan' : 'Suara diaktifkan');
        publish();
    }

    function handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        engine.camera.aspect = width / height;
        engine.camera.updateProjectionMatrix();
        engine.renderer.setSize(width, height);
        engine.resizeFireworksCanvas();
        if (engine.state.mode === 'race' && engine.state.cameraMode === 'track') engine.resetRaceCamera();
        if (engine.state.mode === 'choices' && engine.state.cameraMode === 'track') engine.resetChoiceCamera();
    }

    function disposeSceneObjects(root) {
        const geometries = new Set();
        const materials = new Set();
        const textures = new Set();
        root.traverse(object => {
            // Pooled character resources are reused across respawns; never free them here.
            if (object.geometry && !object.geometry.userData?.shared) geometries.add(object.geometry);
            if (object.material && !object.material.userData?.shared) materials.add(object.material);
        });
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) {
            if (material.map) textures.add(material.map);
            material.dispose();
        }
        for (const texture of textures) texture.dispose();
    }

    function initialize() {
        if(engine.playbackConfig) Object.assign(engine.state,engine.playbackConfig);
        else engine.loadStateFromLocalStorage();
        engine.initMCCharacter();
        engine.rebuildGroupZones(engine.state.groupCount);
        selectMode(engine.initialMode || engine.state.mode, true);
        window.addEventListener('resize', handleResize);
        engine.animate();
    }

    function dispose() {
        cancelAnimationFrame(engine.animationFrame);
        engine.clearSimulationTimers();
        engine.fwBurstTimers.forEach(clearTimeout);
        window.removeEventListener('resize', handleResize);
        engine.controls.dispose();
        disposeSceneObjects(engine.scene);
        engine.renderer.dispose();
        engine.renderer.domElement.remove();
        engine.surfaces.labels.replaceChildren();
        engine.sfx.ctx?.close().catch(() => {});
    }

    engine.actions = {
        skipRace: () => engine.skipRace(),
        skip: () => {
            if(!engine.state.isBusy)return;
            if(engine.state.mode==='race') {
                if(engine.state.racePhase==='walking') {
                    engine.participantEntities.forEach(p=>{p.pos.copy(p.waypoints.at(-1) || p.pos);p.meshParts.root.position.copy(p.pos);p.waypoints=[];p.isMoving=false});
                    engine.finishRaceWalk();
                } else engine.skipRace();
            } else engine.skipAction?.();
        },
        dismissChoiceResult: () => {engine.state.choicesWinner=null;publish();},
        initialize, dispose, start, selectMode, excludeWinner, resetExcluded, useSavedGroups, updateNames, applyNames, shuffleNames, deleteParticipant,
        setGroupCount, setRaceOption, toggleAudio, resetCamera, closeResults, showLastRaceResults, hideWinnerCelebration,
    };

    Object.assign(engine, { publish, showToast, showWinnerCelebration, hideWinnerCelebration, openResultsModal, setRaceInputsLocked, disposeSceneObjects });
}
