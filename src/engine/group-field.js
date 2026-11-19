import * as THREE from 'three'
import { fieldLayout } from './field-layout.js'

export function attachGroupField(engine) {
    // Paving Block Court Builder
    function createPavingBlockTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, 0, 512, 512);

        const rows = 16;
        const cols = 8;
        const brickH = 512 / rows;
        const brickW = 512 / cols;
        const gap = 3;
        const shades = ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1'];

        for (let r = 0; r < rows; r++) {
            const offset = (r % 2 === 0) ? 0 : brickW / 2;
            for (let c = -1; c <= cols; c++) {
                const x = c * brickW + offset + gap / 2;
                const y = r * brickH + gap / 2;
                const w = brickW - gap;
                const h = brickH - gap;
                const shade = shades[(r * 7 + c * 3 + 16) % shades.length];
                ctx.fillStyle = shade;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, w, h, 3);
                else ctx.rect(x, y, w, h);
                ctx.fill();
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(9, 6.5);
        tex.encoding = THREE.sRGBEncoding;
        return tex;
    }

    const groupZonesContainer = new THREE.Group();
    engine.groupZoneData = [];

    const fieldBase = new THREE.Group();
    engine.fieldEnvGroup.add(fieldBase);
    function buildFieldBase() {
        const courtW = 34;
        const courtD = 24;
        const pavingTex = createPavingBlockTexture();
        const pitchGeo = new THREE.BoxGeometry(courtW, 0.14, courtD);
        const pitchMat = new THREE.MeshStandardMaterial({
            map: pavingTex,
            roughness: 0.78,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });
        const pitch = new THREE.Mesh(pitchGeo, pitchMat);
        pitch.userData.fallbackLayer = -2;
        pitch.position.y = 0.05;
        pitch.receiveShadow = true;
        fieldBase.add(pitch);

        const curbMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.65 });
        const curbCapMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
        const curbThick = 0.65;
        const curbHeight = 0.32;

        const curbs = [
            { w: courtW + curbThick * 2, d: curbThick, x: 0, z: -courtD / 2 - curbThick / 2 },
            { w: courtW + curbThick * 2, d: curbThick, x: 0, z: courtD / 2 + curbThick / 2 },
            { w: curbThick, d: courtD, x: -courtW / 2 - curbThick / 2, z: 0 },
            { w: curbThick, d: courtD, x: courtW / 2 + curbThick / 2, z: 0 }
        ];

        curbs.forEach(c => {
            const curb = new THREE.Mesh(new THREE.BoxGeometry(c.w, curbHeight, c.d), curbMat);
            curb.position.set(c.x, curbHeight / 2, c.z);
            curb.castShadow = true;
            curb.receiveShadow = true;
            fieldBase.add(curb);
            const cap = new THREE.Mesh(new THREE.BoxGeometry(c.w - 0.08, 0.06, c.d - 0.08), curbCapMat);
            cap.position.set(c.x, curbHeight + 0.02, c.z);
            fieldBase.add(cap);
        });

        engine.fieldEnvGroup.add(groupZonesContainer);
    }

    function createSignTexture(text, bgHex, maxFontPx = 54) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgHex;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(10, 10, 620, 140, 32);
        else ctx.rect(10, 10, 620, 140);
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        let fontSize = maxFontPx;
        ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", Inter, sans-serif`;
        while (ctx.measureText(text).width > 550 && fontSize > 22) {
            fontSize -= 2;
            ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", Inter, sans-serif`;
        }
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 320, 82);

        const tex = new THREE.CanvasTexture(canvas);
        tex.encoding = THREE.sRGBEncoding;
        return tex;
    }

    function rebuildGroupZones(count, names = []) {
        while (groupZonesContainer.children.length > 0) {
            const old = groupZonesContainer.children[0];
            engine.disposeSceneObjects?.(old);
            groupZonesContainer.remove(old);
        }
        engine.groupZoneData = [];

        const participants = Math.max(engine.participantEntities?.length || 0, engine.state.masterParticipants?.length || 0);
        const layout = fieldLayout(count, participants);
        engine.fieldLayout = layout;
        fieldBase.scale.set(layout.width / 34, 1, layout.depth / 24);
        fieldBase.position.z = layout.centerZ;
        const coords = layout.centers;
        const boxW = layout.size, boxD = layout.size;

        coords.forEach(([cx, cz], idx) => {
            const theme = engine.GROUP_PALETTE[idx % engine.GROUP_PALETTE.length];
            const zoneGroup = new THREE.Group();
            zoneGroup.position.set(cx, 0.135, cz);

            const padGeo = new THREE.PlaneGeometry(boxW, boxD);
            const padMat = new THREE.MeshBasicMaterial({
                color: theme.threeColor,
                transparent: true,
                opacity: 0.22,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });
            const pad = new THREE.Mesh(padGeo, padMat);
            pad.userData.fallbackLayer = -1;
            pad.rotation.x = -Math.PI / 2;
            zoneGroup.add(pad);

            const borderThick = 0.24;
            const bMat = new THREE.MeshBasicMaterial({ color: theme.threeColor });
            const topB = new THREE.Mesh(new THREE.BoxGeometry(boxW + borderThick, 0.03, borderThick), bMat);
            topB.position.set(0, 0.015, -boxD / 2);
            const botB = new THREE.Mesh(new THREE.BoxGeometry(boxW + borderThick, 0.03, borderThick), bMat);
            botB.position.set(0, 0.015, boxD / 2);
            const leftB = new THREE.Mesh(new THREE.BoxGeometry(borderThick, 0.03, boxD), bMat);
            leftB.position.set(-boxW / 2, 0.015, 0);
            const rightB = new THREE.Mesh(new THREE.BoxGeometry(borderThick, 0.03, boxD), bMat);
            rightB.position.set(boxW / 2, 0.015, 0);
            for (const border of [topB, botB, leftB, rightB]) border.userData.fallbackLayer = -1;
            zoneGroup.add(topB, botB, leftB, rightB);

            const name = names[idx] || `Kelompok ${idx + 1}`;
            const signTex = createSignTexture(name, theme.hex, Math.min(54, 640 / Math.max(12, name.length)));
            const signBoard = new THREE.Mesh(
                new THREE.BoxGeometry(3.4, 0.95, 0.14),
                new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
            );
            const signZ = cz < 0 ? -boxD / 2 - 0.45 : boxD / 2 + 0.45;
            signBoard.userData.fallbackSign = name;
            signBoard.userData.fallbackColor = theme.hex;
            signBoard.position.set(0, 1.2, signZ);
            zoneGroup.add(signBoard);

            const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.3, roughness: 0.5 });
            [-1.3, 1.3].forEach(px => {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.25, 8), postMat);
                post.position.set(px, 0.62, signZ);
                zoneGroup.add(post);
            });

            groupZonesContainer.add(zoneGroup);
            engine.groupZoneData.push({
                index: idx,
                name,
                theme,
                center: new THREE.Vector3(cx, 0, cz),
                width: boxW - 1.1,
                depth: boxD - 1.1
            });
        });
    }

    buildFieldBase();
    rebuildGroupZones(engine.state.groupCount);

    Object.assign(engine, { createPavingBlockTexture, createSignTexture, rebuildGroupZones });
}
