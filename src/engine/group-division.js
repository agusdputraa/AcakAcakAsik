import { randomUnit } from './random.js'
import * as THREE from 'three'

export function attachGroupDivision(engine) {
    // --- SEQUENCE A: PEMBAGIAN KELOMPOK ---
    function startGroupDivisionSimulation() {
        if (engine.state.isBusy) return;
        const activeCount = engine.participantEntities.length;
        if (activeCount < 2) {
            engine.showToast('Minimal harus ada 2 peserta untuk membagi kelompok!', 'error');
            return;
        }
        if (activeCount < engine.state.groupCount) {
            engine.showToast(`Peserta (${activeCount}) lebih sedikit dari jumlah kelompok (${engine.state.groupCount}).`, 'error');
            return;
        }

        engine.hideWinnerCelebration();
        engine.clearSimulationTimers();
        engine.state.waitingForGroupArrival = false;
        engine.state.groupArrivalDwellTimer = 0;
        engine.state.pendingGroupsResult = null;

        engine.focusField?.();
        engine.sfx.init();
        engine.sfx.playPop(2);
        engine.setStatus('Peserta berlari mencari kelompok...', true);

        engine.participantEntities.forEach(p => {
            p.celebrating = false;
            p.meshParts.auraRing.visible = false;
            engine.resetBadgeStyle(p);
        });

        const shuffled = engine.shuffleArray(engine.participantEntities);
        const groups = Array.from({ length: engine.state.groupCount }, (_, idx) => ({
            index: idx,
            name: engine.groupZoneData[idx].name,
            theme: engine.groupZoneData[idx].theme,
            members: []
        }));

        shuffled.forEach((person, i) => {
            const gIdx = i % engine.state.groupCount;
            groups[gIdx].members.push(person);
        });

        engine.participantEntities.forEach((p, idx) => {
            const angle = (idx / activeCount) * Math.PI * 2 + randomUnit() * 0.4;
            const r = 1.2 + randomUnit() * 2.2;
            p.speed = 7.6;
            p.isMoving = true;
            p.waypoints = [new THREE.Vector3(Math.cos(angle) * r, 0.12, Math.sin(angle) * r + (engine.fieldLayout?.centerZ || 0))];
        });

        const sendToGroups = () => {
            engine.setStatus('Peserta menuju kotak kelompok masing-masing...', true);
            engine.sfx.playTing(0.95);

            groups.forEach((grp) => {
                const zone = engine.groupZoneData[grp.index];
                const memberCount = grp.members.length;
                const cols = Math.ceil(Math.sqrt(memberCount));
                const rows = Math.ceil(memberCount / cols);

                grp.members.forEach((p, mIdx) => {
                    const r = Math.floor(mIdx / cols);
                    const c = mIdx % cols;
                    const cellW = zone.width / Math.max(cols, 1);
                    const cellD = zone.depth / Math.max(rows, 1);
                    const finalX = zone.center.x - zone.width / 2 + cellW * (c + 0.5);
                    const finalZ = zone.center.z - zone.depth / 2 + cellD * (r + 0.5);

                    p.meshParts.root.scale.setScalar(Math.min(1,cellW/1.1,cellD/1.1));
                    p.speed = 8.4 + randomUnit() * 2.0;
                    p.waypoints.push(...Array.from({length: 4}, () => new THREE.Vector3((randomUnit()-.5)*(engine.fieldLayout?.width || 34)*.7, .12, (randomUnit()-.5)*(engine.fieldLayout?.depth || 24)*.7+(engine.fieldLayout?.centerZ || 0))));
                    p.waypoints.push(new THREE.Vector3(finalX, 0.12, finalZ));
                    p.isMoving = true;
                });
            });

            engine.state.pendingGroupsResult = groups;
            engine.state.groupArrivalDwellTimer = 0;
            engine.state.waitingForGroupArrival = true;
        };
        const t2 = setTimeout(sendToGroups,1050);
        engine.activeTimers.push(t2);
        engine.skipAction=()=>{
            engine.clearSimulationTimers();
            sendToGroups();
            for(const person of engine.participantEntities) {
                person.pos.copy(person.waypoints.at(-1));person.meshParts.root.position.copy(person.pos);
                person.waypoints=[];person.isMoving=false;
            }
            engine.state.waitingForGroupArrival=false;engine.state.pendingGroupsResult=null;
            finalizeGroupDivisionArrival(groups);
        };
    }

    function finalizeGroupDivisionArrival(groups) {
        if (engine.state.mode === 'topics') return engine.finalizeTopicArrival(groups);
        engine.sfx.playFanfare();
        engine.launchFireworkShow();
        engine.setStatus('Pembagian kelompok selesai!', false);

        groups.forEach((grp) => {
            const zone = engine.groupZoneData[grp.index];
            engine.spawnConfettiBurst(zone.center, 28);
            grp.members.forEach((p) => {
                p.celebrating = true;
                p.meshParts.auraRing.visible = true;
                p.meshParts.auraRing.material.color.setHex(grp.theme.threeColor);
                engine.colorBadgeForGroup(p, grp.theme);
            });
        });

        engine.state.lastGroupsResult = engine.snapshotGroups(groups);
        engine.saveStateToLocalStorage();
        engine.openResultsModal('Kelompok', groups);
    }

    Object.assign(engine, { startGroupDivisionSimulation, finalizeGroupDivisionArrival });
}
