import { animateCharacter } from './characters/character.js'
import * as THREE from 'three'

export function attachAnimationLoop(engine) {
    // Animation Loop
    const clock = new THREE.Clock();
    engine.animationFrame = 0;

    function updateCharacterLocomotion(entity, dt, elapsedTime) {
        const parts = entity.meshParts;
        if (entity.pauseRemaining > 0) { entity.pauseRemaining -= dt; animateCharacter(parts, 0, false); return; }
        if (entity.waypoints && entity.waypoints.length > 0) {
            entity.isMoving = true;
            const target = entity.waypoints[0];
            const dx = target.x - entity.pos.x;
            const dz = target.z - entity.pos.z;
            const distXZ = Math.hypot(dx, dz);

            if (distXZ < 0.14) {
                entity.pos.copy(target);
                entity.pauseRemaining = target.pauseSeconds || 0;
                entity.waypoints.shift();
                if (entity.waypoints.length === 0) entity.isMoving = false;
            } else {
                const heading = Math.atan2(dx, dz);
                parts.root.rotation.y += Math.atan2(Math.sin(heading-parts.root.rotation.y), Math.cos(heading-parts.root.rotation.y)) * Math.min(1,dt*12);
                const moveStep = Math.min(distXZ, entity.speed * dt);
                entity.pos.x += (dx / distXZ) * moveStep;
                entity.pos.z += (dz / distXZ) * moveStep;
                entity.pos.y += (target.y - entity.pos.y) * Math.min(1, dt * 10);
            }

            entity.walkCycle += dt * entity.speed * 2.3;
            animateCharacter(parts, entity.walkCycle, entity.isMoving, engine.state.mode === 'topics');
            parts.root.position.copy(entity.pos);
        } else {
            entity.isMoving = false;
            animateCharacter(parts, entity.walkCycle, false);
            if (entity.onArrival) { const cb=entity.onArrival; entity.onArrival=null; cb(); }
            parts.leftLeg.rotation.x *= 0.82;
            parts.rightLeg.rotation.x *= 0.82;
            if (entity.celebrating) {
                const jumpPhase = elapsedTime * 7.5 + (entity.idleOffset || 0);
                parts.bodyPivot.position.y = Math.max(0, Math.sin(jumpPhase)) * 0.55;
            } else {
                parts.bodyPivot.position.y = Math.sin(elapsedTime * 2.6 + (entity.idleOffset || 0)) * 0.035;
            }
            parts.root.position.copy(entity.pos);
        }
    }

    function animate() {
        engine.animationFrame = requestAnimationFrame(animate);

        const dt = Math.min(clock.getDelta(), 0.05);
        const elapsedTime = clock.elapsedTime;

        if (engine.cameraAnim.active) {
            engine.camera.position.lerp(engine.cameraAnim.pos, Math.min(1, dt * 4.5));
            engine.controls.target.lerp(engine.cameraAnim.target, Math.min(1, dt * 4.5));
            if (engine.camera.position.distanceTo(engine.cameraAnim.pos) < 0.08 && engine.controls.target.distanceTo(engine.cameraAnim.target) < 0.08) {
                engine.cameraAnim.active = false;
            }
        }

        let anyParticipantStillRunning = false;
        for (let i = 0; i < engine.participantEntities.length; i++) {
            if (engine.state.mode === 'race' && engine.state.raceActive && !engine.participantEntities[i].celebrating) continue;
            updateCharacterLocomotion(engine.participantEntities[i], dt, elapsedTime);
            if (engine.participantEntities[i].isMoving || engine.participantEntities[i].waypoints.length > 0) {
                anyParticipantStillRunning = true;
            }
        }

        if (engine.state.mode === 'race' && engine.state.raceActive) {
            engine.updateRaceSimulation(dt);
        }

        if (engine.state.mode === 'race' && engine.state.racePhase === 'walking' && !anyParticipantStillRunning) {
            engine.finishRaceWalk();
        }

        if (engine.state.waitingForGroupArrival && !anyParticipantStillRunning) {
            engine.state.groupArrivalDwellTimer += dt;
            if (engine.state.groupArrivalDwellTimer >= 0.55) {
                engine.state.waitingForGroupArrival = false;
                const finishedGroups = engine.state.pendingGroupsResult;
                engine.state.pendingGroupsResult = null;
                if (finishedGroups) engine.finalizeGroupDivisionArrival(finishedGroups);
            }
        }

        if (engine.state.mode === 'topics') engine.updateTopicSimulation(anyParticipantStillRunning);
        if (engine.state.mode === 'choices') engine.updateChoiceSimulation(dt);

        if (engine.mcEntity && (engine.stageEnvGroup.visible || engine.state.mode === 'race')) {
            updateCharacterLocomotion(engine.mcEntity, dt, elapsedTime);
        }

        engine.updateConfetti(dt);
        engine.updateAndDrawFireworks(dt);
        engine.updateFollowCamera(dt);
        engine.controls.update();
        engine.renderer.render(engine.scene, engine.camera);
        engine.updateFloatingLabels();
    }

    Object.assign(engine, { animate });
}
