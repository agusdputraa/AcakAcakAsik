import { randomUnit } from './random.js'
import * as THREE from 'three'

export function attachRaffle(engine) {
    // --- SEQUENCE B: SPOTLIGHT & MC ---
    function resetCrowdAndStage() {
        if (engine.spotlightBeamMesh) engine.spotlightBeamMesh.visible = false;
        if (engine.spotlightRingMesh) engine.spotlightRingMesh.visible = false;

        const count = engine.participantEntities.length;
        engine.participantEntities.forEach((p, idx) => {
            p.celebrating = false;
            p.waypoints = [];
            p.isMoving = false;
            p.meshParts.auraRing.visible = false;
            engine.resetBadgeStyle(p);
            const pos = engine.getInitialFormationPosition(idx, count, 'spotlight');
            p.pos.copy(pos);
            p.meshParts.root.position.copy(pos);
            p.meshParts.root.rotation.y = Math.PI;
        });

        if (engine.mcEntity) {
            engine.mcEntity.waypoints = [];
            engine.mcEntity.isMoving = false;
            engine.mcEntity.celebrating = false;
            if(engine.state.mode==='choices')engine.mcEntity.pos.set(-6.1,.12,engine.STAGE_Z+3.8);
            else engine.mcEntity.pos.set(0, engine.STAGE_TOP_Y, engine.STAGE_Z + 1.2);
            if(engine.mcEntity.labelEl)engine.mcEntity.labelEl.textContent='🎤 Host Kesayangan Anda';
            engine.mcEntity.meshParts.root.position.copy(engine.mcEntity.pos);
            engine.mcEntity.meshParts.root.rotation.y = 0;
        }
    }

    function startSpotlightRaffle() {
        if (engine.state.isBusy) return;
        if (engine.participantEntities.length < 1) {
            engine.showToast('Minimal harus ada 1 peserta untuk pemilihan!', 'error');
            return;
        }

        engine.hideWinnerCelebration();
        engine.clearSimulationTimers();
        engine.sfx.init();
        engine.setStatus('Lampu sorot mencari orang terpilih...', true);
        resetCrowdAndStage();

        const winnerIdx = Math.floor(randomUnit() * engine.participantEntities.length);
        const winner = engine.participantEntities[winnerIdx];
        const totalHops = engine.state.mode === 'individual' ? 1 : 24 + Math.floor(randomUnit() * 7);
        let hopSequence = [];
        let lastIdx = -1;

        for (let i = 0; i < totalHops - 1; i++) {
            let nextIdx = Math.floor(randomUnit() * engine.participantEntities.length);
            if (nextIdx === lastIdx && engine.participantEntities.length > 1) nextIdx = (nextIdx + 1) % engine.participantEntities.length;
            hopSequence.push(nextIdx);
            lastIdx = nextIdx;
        }
        hopSequence.push(winnerIdx);

        engine.spotlightBeamMesh.visible = true;
        engine.spotlightRingMesh.visible = true;

        let step = 0;
        function nextHop() {
            engine.participantEntities.forEach(p => {
                p.meshParts.auraRing.visible = false;
                engine.highlightBadge(p, false, false);
            });

            const currentIdx = hopSequence[step];
            const targetPerson = engine.participantEntities[currentIdx];

            engine.spotlightBeamMesh.position.set(targetPerson.pos.x, 5.5, targetPerson.pos.z);
            engine.spotlightRingMesh.position.set(targetPerson.pos.x, 0.14, targetPerson.pos.z);
            targetPerson.meshParts.auraRing.visible = true;
            engine.highlightBadge(targetPerson, true, step === hopSequence.length - 1);

            engine.sfx.playTing(0.85 + (step / hopSequence.length) * 0.55);

            step++;
            if (step < hopSequence.length) {
                const delay = 65 + Math.pow(step / hopSequence.length, 2.7) * 440;
                engine.activeTimers.push(setTimeout(nextHop, delay));
            } else {
                engine.activeTimers.push(setTimeout(() => {
                    winner.celebrating = true;
                    if (engine.mcEntity) engine.mcEntity.celebrating = true;
                    engine.highlightBadge(winner, true, true);
                    engine.spawnConfettiBurst(winner.pos, 95);
                    engine.launchFireworkShow();
                    engine.sfx.playFanfare();
                    engine.setStatus(`Orang terpilih: ${winner.name}!`, false);
                    engine.showWinnerCelebration({id:winner.id,name:winner.name});
                }, 320));
            }
        }
        nextHop();
    }

    function startMCPickupRaffle() {
        if (engine.state.isBusy) return;
        if (engine.participantEntities.length < 1) {
            engine.showToast('Minimal harus ada 1 peserta untuk pemilihan!', 'error');
            return;
        }

        engine.hideWinnerCelebration();
        engine.clearSimulationTimers();
        engine.sfx.init();
        engine.setStatus('Host Kesayangan Anda menjemput orang terpilih ke panggung...', true);
        resetCrowdAndStage();

        const winnerIdx = Math.floor(randomUnit() * engine.participantEntities.length);
        const winner = engine.participantEntities[winnerIdx];

        engine.mcEntity.speed = 5.4;
        engine.mcEntity.waypoints = [
            new THREE.Vector3(0, engine.STAGE_TOP_Y, engine.STAGE_Z + 3.2),
            new THREE.Vector3(0, 0.1, engine.STAGE_Z + 5.6),
            ...engine.shuffleArray(engine.participantEntities).slice(0, Math.min(4, engine.participantEntities.length)).map(p => Object.assign(new THREE.Vector3(p.pos.x + .9, .1, p.pos.z + .7),{pauseSeconds:.4})),
            new THREE.Vector3(winner.pos.x + 0.85, 0.1, winner.pos.z + 0.65)
        ];

        engine.activeTimers.push(setTimeout(() => {
            const checkArrival = setInterval(() => {
                if (!engine.mcEntity.waypoints.length) {
                    clearInterval(checkArrival);
                    engine.sfx.playTing(1.25);
                    winner.meshParts.auraRing.visible = true;
                    engine.highlightBadge(winner, true, true);

                    engine.activeTimers.push(setTimeout(() => {
                        engine.mcEntity.speed = 5.0;
                        winner.speed = 5.0;
                        engine.mcEntity.waypoints = [new THREE.Vector3(-0.65, 0.1, engine.STAGE_Z + 5.6), new THREE.Vector3(-0.65, engine.STAGE_TOP_Y, engine.STAGE_Z + 3.2), new THREE.Vector3(-0.95, engine.STAGE_TOP_Y, engine.STAGE_Z + 1.3)];
                        winner.waypoints = [new THREE.Vector3(0.65, 0.1, engine.STAGE_Z + 5.6), new THREE.Vector3(0.65, engine.STAGE_TOP_Y, engine.STAGE_Z + 3.2), new THREE.Vector3(0.95, engine.STAGE_TOP_Y, engine.STAGE_Z + 1.3)];

                        const checkStage = setInterval(() => {
                            if (!engine.mcEntity.waypoints.length && !winner.waypoints.length) {
                                clearInterval(checkStage);
                                engine.mcEntity.meshParts.root.rotation.y = winner.meshParts.root.rotation.y = 0;
                                engine.mcEntity.celebrating = true;
                                winner.celebrating = true;
                                engine.spotlightBeamMesh.visible = true;
                                engine.spotlightRingMesh.visible = true;
                                engine.spotlightBeamMesh.position.set(winner.pos.x, engine.STAGE_TOP_Y + 5.5, winner.pos.z);
                                engine.spotlightRingMesh.position.set(winner.pos.x, engine.STAGE_TOP_Y + 0.08, winner.pos.z);
                                engine.spawnConfettiBurst(new THREE.Vector3(0, engine.STAGE_TOP_Y, engine.STAGE_Z + 1.3), 100);
                                engine.launchFireworkShow();
                                engine.sfx.playFanfare();
                                engine.setStatus(`Hore! ${winner.name} di panggung!`, false);
                                engine.showWinnerCelebration({id:winner.id,name:winner.name});
                            }
                        }, 80);
                        engine.activeTimers.push(checkStage);
                    }, 650));
                }
            }, 80);
            engine.activeTimers.push(checkArrival);
        }, 400));
    }

    Object.assign(engine, { resetCrowdAndStage, startSpotlightRaffle, startMCPickupRaffle });
}
