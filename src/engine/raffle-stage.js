import * as THREE from 'three'

export function attachRaffleStage(engine) {
    // Stage Environment
    const STAGE_TOP_Y = 1.4;
    const STAGE_Z = -8.5;
    engine.spotlightBeamMesh = null;
    engine.spotlightRingMesh = null;

    function buildStageEnvironment() {
        const plazaTex = engine.createPavingBlockTexture();
        plazaTex.repeat.set(8, 5.5);
        const plaza = new THREE.Mesh(
            new THREE.BoxGeometry(32, 0.12, 20),
            new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.78, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
        );
        plaza.userData.fallbackLayer = -2;
        plaza.position.set(0, 0.04, 2.5);
        plaza.receiveShadow = true;
        engine.stageEnvGroup.add(plaza);

        const deckMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(14, STAGE_TOP_Y, 6.5), deckMat);
        deck.position.set(0, STAGE_TOP_Y / 2, STAGE_Z);
        deck.castShadow = true;
        deck.receiveShadow = true;
        engine.stageEnvGroup.add(deck);

        const trimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.4, roughness: 0.3 });
        const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.18, 0.25), trimMat);
        frontTrim.position.set(0, STAGE_TOP_Y - 0.08, STAGE_Z + 3.25);
        engine.stageEnvGroup.add(frontTrim);

        const carpetMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.7 });
        const stageCarpet = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 5.8), carpetMat);
        stageCarpet.position.set(0, STAGE_TOP_Y + 0.02, STAGE_Z + 0.35);
        engine.stageEnvGroup.add(stageCarpet);

        for (let s = 0; s < 3; s++) {
            const stepH = STAGE_TOP_Y * ((3 - s) / 3);
            const stepZ = STAGE_Z + 3.25 + (s + 0.5) * 0.75;
            const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, stepH, 0.8), deckMat);
            stepMesh.position.set(0, stepH / 2, stepZ);
            engine.stageEnvGroup.add(stepMesh);
            const stepCarpet = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 0.82), carpetMat);
            stepCarpet.position.set(0, stepH + 0.02, stepZ);
            engine.stageEnvGroup.add(stepCarpet);
        }

        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 });
        [-6.2, 6.2].forEach(px => {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), pillarMat);
            pillar.position.set(px, STAGE_TOP_Y + 2.75, STAGE_Z - 2.8);
            engine.stageEnvGroup.add(pillar);
        });
        const topTruss = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.55, 0.6), pillarMat);
        topTruss.position.set(0, STAGE_TOP_Y + 5.3, STAGE_Z - 2.8);
        engine.stageEnvGroup.add(topTruss);

        const bannerTex = engine.createSignTexture('ORANG TERPILIH', '#4f46e5', 44);
        const bannerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(8.2, 1.75, 0.16),
            new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.35 })
        );
        bannerMesh.userData.fallbackSign = 'ORANG TERPILIH';
        bannerMesh.userData.fallbackColor = '#4f46e5';
        bannerMesh.position.set(0, STAGE_TOP_Y + 3.65, STAGE_Z - 3.0);
        engine.stageEnvGroup.add(bannerMesh);
        engine.stageBanner = bannerMesh;

        const beamGeo = new THREE.CylinderGeometry(0.35, 1.85, 11, 24, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xfef08a,
            transparent: true,
            opacity: 0.34,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        engine.spotlightBeamMesh = new THREE.Mesh(beamGeo, beamMat);
        engine.spotlightBeamMesh.visible = false;
        engine.stageEnvGroup.add(engine.spotlightBeamMesh);

        const ringGeo = new THREE.RingGeometry(0.85, 1.35, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.92
        });
        engine.spotlightRingMesh = new THREE.Mesh(ringGeo, ringMat);
        engine.spotlightRingMesh.rotation.x = -Math.PI / 2;
        engine.spotlightRingMesh.visible = false;
        engine.stageEnvGroup.add(engine.spotlightRingMesh);
    }
    buildStageEnvironment();

    Object.assign(engine, { STAGE_TOP_Y, STAGE_Z });
}
