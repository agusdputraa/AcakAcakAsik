import * as THREE from 'three'
import { raceGroups } from './race-model.js'

export function attachParticipants(engine) {
    function initMCCharacter() {
        const parts = engine.createCharacterMesh({ shirtColor: 0x0f172a, skinColor: 0xffdbac, isMC: true, scale: 1.14, styleSeed: 99 });
        parts.root.position.set(0, engine.STAGE_TOP_Y, engine.STAGE_Z + 1.2);
        engine.stageEnvGroup.add(parts.root);
        const labelEl = engine.createNameBadgeElement('🎤 MC Panggung', true);
        engine.mcEntity = { name: '🎤 MC Panggung', meshParts: parts, pos: new THREE.Vector3(0, engine.STAGE_TOP_Y, engine.STAGE_Z + 1.2), waypoints: [], speed: 5.5, walkCycle: 0, isMoving: false, labelEl };
    }

    function getInitialFormationPosition(index, total, mode) {
        if (mode === 'groups' || mode === 'topics') {
            const angle = (index / Math.max(total, 1)) * Math.PI * 2;
            const radius = 2.0 + (index % 3) * 1.15;
            return new THREE.Vector3(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
        } else if (mode === 'race') {
            // Line up near the start line before lanes are assigned.
            const spacingX = 2.2;
            const cols = Math.min(total, 8);
            const row = Math.floor(index / cols);
            const col = index % cols;
            const itemsInThisRow = Math.min(cols, total - row * cols);
            const startX = -((itemsInThisRow - 1) * spacingX) / 2;
            return new THREE.Vector3(startX + col * spacingX, 0.1, engine.RACE_START_Z + row * 1.8);
        } else {
            const cols = Math.min(total, 6);
            const row = Math.floor(index / cols);
            const col = index % cols;
            const itemsInThisRow = Math.min(cols, total - row * cols);
            const spacingX = 2.3;
            const spacingZ = 2.1;
            const startX = -((itemsInThisRow - 1) * spacingX) / 2;
            return new THREE.Vector3(startX + col * spacingX, 0.1, -1.6 + row * spacingZ);
        }
    }

    function spawnParticipants(playAudio = true) {
        engine.participantEntities.forEach(p => {
            engine.charactersGroup.remove(p.meshParts.root);
            engine.disposeSceneObjects(p.meshParts.root);
            if (p.labelEl) p.labelEl.remove();
        });
        engine.participantEntities = [];
        if (engine.state.mode === 'race') {
            engine.state.raceRunners = [];
            engine.configureRaceLanes(0);
            engine.resetRaceCamera();
        }

        const groups = raceGroups(engine.state);
        const activeList = engine.state.mode==='choices'
            ? Array.from({length:12},(_,index)=>({id:'audience-'+index,name:'Penonton '+(index+1),isAudience:true}))
            : ['race','topics'].includes(engine.state.mode) ? groups.flatMap((g, gi) => g.members.map((name, mi) => ({id: `${g.id}-${mi}`,name, groupId:g.id, groupName:g.name, groupIndex:gi}))) : engine.state.masterParticipants.filter(p => !engine.state.excludedIds.includes(p.id));
        const count = activeList.length;

        activeList.forEach((participantObj, idx) => {
            const seed = engine.hashStringToSeed(participantObj.name + '_' + participantObj.id);
            const shirtColor = participantObj.groupId ? engine.GROUP_PALETTE[participantObj.groupIndex % engine.GROUP_PALETTE.length].threeColor : engine.OUTFIT_COLORS[seed % engine.OUTFIT_COLORS.length];
            const skinColor = engine.SKIN_TONES[(seed >> 2) % engine.SKIN_TONES.length];
            const meshParts = engine.createCharacterMesh({ shirtColor, skinColor, isMC: false, scale: 1.0, styleSeed: seed });

            const pos = getInitialFormationPosition(idx, count, engine.state.mode);
            meshParts.root.position.copy(pos);

            if (engine.state.mode === 'groups') {
                meshParts.root.rotation.y = Math.atan2(-pos.x, -pos.z) + Math.PI;
            } else if (engine.state.mode === 'race') {
                meshParts.root.rotation.y = Math.PI; // Face the finish line.
            } else {
                meshParts.root.rotation.y = Math.PI;
            }

            engine.charactersGroup.add(meshParts.root);
            const labelEl = engine.createNameBadgeElement(participantObj.name, false);

            engine.participantEntities.push({
                ...participantObj,
                index: idx,
                name: participantObj.name,
                shirtColor,
                meshParts,
                pos: pos.clone(),
                waypoints: [],
                speed: 6.5,
                walkCycle: Math.random() * Math.PI * 2,
                idleOffset: Math.random() * Math.PI * 2,
                isMoving: false,
                celebrating: false,
                labelEl
            });
        });

        if (engine.state.mode === 'race') engine.positionRaceParticipants();
        if (playAudio && count > 0) {
            engine.sfx.playPop(Math.min(count, 10) * 0.4);
        }
    }

    Object.assign(engine, { initMCCharacter, getInitialFormationPosition, spawnParticipants });
}
