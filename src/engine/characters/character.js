import * as THREE from 'three'

export function createCharacter({ shirtColor = 0x3b82f6, skinColor = 0xffdbac, isMC = false, scale = 1, styleSeed = 0 } = {}) {
    const root = new THREE.Group();
    root.scale.setScalar(scale);
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.75 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x263747, roughness: 0.85 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: .86 });
    const dark = new THREE.MeshStandardMaterial({ color: isMC ? 0x141b22 : 0x334155, roughness: .88 });
    const hair = new THREE.MeshStandardMaterial({ color: [0x30251f, 0x181d24, 0x483327][styleSeed % 3], roughness: .9 });
    function oval(parent, material, position, size) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material);
        mesh.position.set(...position);
        mesh.scale.set(...size);
        mesh.castShadow = true;
        parent.add(mesh);
        return mesh;
    }
    // Closed contour rings: y, half width, half depth, forward offset.
    // Shared ring vertices keep smooth normals without inflating the silhouette.
    function contour(rings, segments = 12) {
        const vertices = [], indices = [];
        rings.forEach(([y, width, depth, z = 0]) => {
            for (let i = 0; i < segments; i++) {
                const angle = i / segments * Math.PI * 2;
                vertices.push(Math.cos(angle) * width, y, z + Math.sin(angle) * depth);
            }
        });
        for (let row = 0; row < rings.length - 1; row++) {
            for (let i = 0; i < segments; i++) {
                const a = row * segments + i, b = row * segments + (i + 1) % segments;
                indices.push(a, b, a + segments, b, b + segments, a + segments);
            }
        }
        // Rings are ordered top to bottom.
        const top = vertices.length / 3;
        vertices.push(0, rings[0][0], rings[0][3] || 0);
        const bottom = vertices.length / 3, last = rings.length - 1;
        vertices.push(0, rings[last][0], rings[last][3] || 0);
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            indices.push(top, next, i, bottom, last * segments + i, last * segments + next);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
    }
    function sculpt(parent, material, rings, position = [0, 0, 0]) {
        const mesh = new THREE.Mesh(contour(rings), material);
        mesh.position.set(...position);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    sculpt(bodyPivot, shirt, [
        [1.41,.12,.105], [1.36,.28,.15], [1.28,.35,.19],
        [1.15,.31,.205,.012], [.96,.265,.175], [.79,.29,.19], [.70,.285,.18]
    ]);
    sculpt(bodyPivot, skin, [[1.55,.105,.095],[1.43,.10,.09],[1.38,.12,.105]]);
    sculpt(bodyPivot, shirt, [[1.435,.12,.108],[1.40,.145,.12],[1.375,.16,.13]]);
    sculpt(bodyPivot, pants, [[.76,.275,.175],[.64,.28,.175],[.59,.25,.16]]);
    // Each limb is a continuous weighted surface across its bending joint.
    function limb(x, y, jointY, rings, material) {
        const pivot = new THREE.Bone();
        pivot.position.set(x, y, 0);
        const joint = new THREE.Bone();
        joint.position.y = jointY;
        pivot.add(joint);
        bodyPivot.add(pivot);
        const geometry = contour(rings);
        const weights = [], bones = [];
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const blend = THREE.MathUtils.smoothstep(jointY - positions.getY(i), -.09, .09);
            bones.push(0, 1, 0, 0);
            weights.push(1 - blend, blend, 0, 0);
        }
        geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(bones, 4));
        geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
        const skinnedMaterial = material.clone();
        skinnedMaterial.skinning = true;
        const mesh = new THREE.SkinnedMesh(geometry, skinnedMaterial);
        mesh.position.set(x, y, 0);
        mesh.castShadow = mesh.receiveShadow = true;
        bodyPivot.add(mesh);
        root.updateMatrixWorld(true);
        mesh.bind(new THREE.Skeleton([pivot, joint]));
        return { pivot, joint };
    }
    function leg(x) {
        const leg = limb(x, .68, -.27, [
            [.035,.13,.145],[-.10,.125,.135],[-.23,.095,.105],
            [-.27,.09,.10],[-.32,.095,.105],[-.44,.075,.085],[-.53,.065,.075]
        ], pants);
        sculpt(leg.joint, white, [[-.20,.105,.17,.055],[-.265,.115,.19,.07],[-.28,.11,.18,.07]]);
        sculpt(leg.joint, dark, [[-.16,.065,.08],[-.20,.10,.15,.045],[-.245,.11,.18,.07]]);
        return leg;
    }
    function arm(x) {
        const arm = limb(x, 1.28, -.27, [
            [.025,.125,.13],[-.10,.11,.115],[-.23,.08,.085],
            [-.27,.075,.08],[-.33,.085,.09],[-.46,.06,.065]
        ], skin);
        sculpt(arm.pivot, shirt, [[.035,.13,.135],[-.06,.14,.14],[-.16,.12,.125],[-.19,.115,.12]]);
        sculpt(arm.joint, skin, [[-.17,.06,.06],[-.22,.085,.065,.015],[-.29,.075,.06,.025],[-.32,.045,.04,.025]]);
        const thumb = sculpt(arm.joint, skin, [[0,.035,.035],[-.065,.04,.04],[-.10,.02,.025]], [-Math.sign(x)*.07,-.205,.04]);
        thumb.rotation.z = -Math.sign(x)*.4;
        return arm;
    }
    const left = arm(-.34), right = arm(.34);
    const leftLower = leg(-.145), rightLower = leg(.145);
    const leftLeg = leftLower.pivot, rightLeg = rightLower.pivot;
    const head = new THREE.Group();
    head.position.y = 1.78;
    bodyPivot.add(head);
    oval(head, skin, [0, 0, 0], [.34, .39, .32]);
    oval(head, skin, [-.33, -.015, 0], [.07, .105, .06]);
    oval(head, skin, [.33, -.015, 0], [.07, .105, .06]);
    sculpt(head, hair, [[.425,.025,.025,-.035],[.39,.17,.15,-.035],
        [.30,.29,.255,-.035],[.18,.34,.29,-.04],[.08,.335,.26,-.07]], [0,0,0]);
    // Swept, closed locks follow directional curves rather than spherical clumps.
    for (let i = 0; i < 5; i++) {
        const x = -.25 + i * .105;
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(x-.055,.33,.12),
            new THREE.Vector3(x+.035,.30,.245),
            new THREE.Vector3(x+.065,.19,.295),
            new THREE.Vector3(x+.025,.095 + i*.015,.29)
        ]);
        const frames = curve.computeFrenetFrames(8, false);
        const positions = [], indices = [];
        for (let row = 0; row <= 8; row++) {
            const t = row / 8, center = curve.getPointAt(t);
            const width = .075 * Math.sin(Math.PI * (.10 + .89*t));
            for (let side = 0; side < 6; side++) {
                const angle = side / 6 * Math.PI * 2;
                const point = center.clone()
                    .addScaledVector(frames.normals[row], Math.cos(angle)*width)
                    .addScaledVector(frames.binormals[row], Math.sin(angle)*width*.38);
                positions.push(...point.toArray());
                if (row < 8) {
                    const a = row*6+side, b = row*6+(side+1)%6;
                    indices.push(a,b,a+6,b,b+6,a+6);
                }
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const lock = new THREE.Mesh(geometry,hair);
        lock.castShadow = true;
        head.add(lock);
    }
    [-.12, .12].forEach(x => {
        oval(head, white, [x, .015, .293], [.067, .083, .031]);
        oval(head, dark, [x, .01, .322], [.031, .047, .014]);
        oval(head, white, [x - .009, .028, .337], [.01, .013, .006]);
    });
    oval(head, skin, [0, -.06, .327], [.047, .06, .05]);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(.075, .012, 5, 12, Math.PI), dark);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -.12, .3);
    head.add(smile);
    if (isMC) {
        oval(bodyPivot, white, [0, 1.2, .22], [.07, .14, .025]);
        oval(bodyPivot, dark, [0, 1.21, .25], [.03, .12, .025]);
    }
    const auraRing = new THREE.Mesh(new THREE.RingGeometry(.55, .8, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: .75 }));
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = .015;
    auraRing.visible = false;
    root.add(auraRing);
    return { root, bodyPivot, head, leftLeg, rightLeg, leftArm: left.pivot, rightArm: right.pivot, leftElbow: left.joint, rightElbow: right.joint, leftKnee: leftLower.joint, rightKnee: rightLower.joint, auraRing };
}
export function animateCharacter(parts, phase, moving, running = false) {
    const swing = moving ? Math.sin(phase) * (running ? .8 : .55) : 0;
    parts.leftLeg.rotation.x = swing;
    parts.rightLeg.rotation.x = -swing;
    parts.leftKnee.rotation.x = moving ? Math.max(0, -Math.sin(phase)) * (running ? 1.05 : .55) : .04;
    parts.rightKnee.rotation.x = moving ? Math.max(0, Math.sin(phase)) * (running ? 1.05 : .55) : .04;
    parts.leftArm.rotation.x = -swing * .8;
    parts.rightArm.rotation.x = swing * .8;
    parts.leftElbow.rotation.x = parts.rightElbow.rotation.x = moving ? -.45 : -.08;
    parts.bodyPivot.rotation.x = running ? .10 : 0;
    parts.bodyPivot.position.y = moving ? Math.abs(Math.sin(phase)) * .07 : 0;
}
