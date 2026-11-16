import * as THREE from 'three'

export function createCharacter({ shirtColor = 0x3b82f6, skinColor = 0xffdbac, isMC = false, scale = 1, styleSeed = 0 } = {}) {
    const root = new THREE.Group();
    root.scale.setScalar(scale);
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);
    const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.75 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x263747, roughness: 0.85 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const dark = new THREE.MeshStandardMaterial({ color: isMC ? 0x141b22 : 0x334155 });
    const hair = new THREE.MeshStandardMaterial({ color: [0x30251f, 0x181d24, 0x483327][styleSeed % 3] });
    function oval(parent, material, position, size) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material);
        mesh.position.set(...position);
        mesh.scale.set(...size);
        mesh.castShadow = true;
        parent.add(mesh);
        return mesh;
    }
    oval(bodyPivot, shirt, [0, 1.03, 0], [.35, .44, .23]);
    oval(bodyPivot, skin, [0, 1.44, 0], [.11, .14, .1]);
    function leg(x) {
        const pivot = new THREE.Group();
        pivot.position.set(x, .68, 0);
        bodyPivot.add(pivot);
        oval(pivot, pants, [0, -.24, 0], [.13, .29, .14]);
        oval(pivot, white, [0, -.57, .08], [.145, .065, .23]);
        oval(pivot, dark, [0, -.51, .065], [.14, .10, .215]);
        return pivot;
    }
    function arm(x) {
        const pivot = new THREE.Group();
        pivot.position.set(x, 1.28, 0);
        pivot.rotation.z = -Math.sign(x) * .12;
        bodyPivot.add(pivot);
        oval(pivot, shirt, [0, -.12, 0], [.145, .21, .15]);
        const elbow = new THREE.Group();
        elbow.position.set(0, -.3, 0);
        pivot.add(elbow);
        oval(elbow, skin, [0, -.12, .01], [.095, .18, .1]);
        oval(elbow, skin, [0, -.28, .025], [.105, .11, .1]);
        return { pivot, elbow };
    }
    const leftLeg = leg(-.17), rightLeg = leg(.17);
    const left = arm(-.39), right = arm(.39);
    const head = new THREE.Group();
    head.position.y = 1.78;
    bodyPivot.add(head);
    oval(head, skin, [0, 0, 0], [.34, .39, .32]);
    oval(head, skin, [-.33, -.015, 0], [.07, .105, .06]);
    oval(head, skin, [.33, -.015, 0], [.07, .105, .06]);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * .55), hair);
    cap.scale.y = 1.14;
    cap.position.set(0, .025, -.025);
    head.add(cap);
    for (let i = 0; i < 3; i++) oval(head, hair, [-.19 + i * .15, .23, .22], [.13, .13, .11]);
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
    return { root, bodyPivot, head, leftLeg, rightLeg, leftArm: left.pivot, rightArm: right.pivot, leftElbow: left.elbow, rightElbow: right.elbow, auraRing };
}
export function animateCharacter(parts, phase, moving, running = false) {
    const swing = moving ? Math.sin(phase) * (running ? .8 : .55) : 0;
    parts.leftLeg.rotation.x = swing;
    parts.rightLeg.rotation.x = -swing;
    parts.leftArm.rotation.x = -swing * .8;
    parts.rightArm.rotation.x = swing * .8;
    parts.leftElbow.rotation.x = parts.rightElbow.rotation.x = moving ? -.45 : -.08;
    parts.bodyPivot.rotation.x = running ? .10 : 0;
    parts.bodyPivot.position.y = moving ? Math.abs(Math.sin(phase)) * .07 : 0;
}
