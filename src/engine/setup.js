import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createFallbackRenderer } from './fallback-renderer.js'

export function attachSetup(engine) {
    // Three.js Scene Setup
    const canvasContainer = engine.surfaces.canvas;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbae6fd);
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.0085);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 22, 26);

    const renderer = createArenaRenderer();
    function createArenaRenderer() {
        const canvas = document.createElement('canvas');
        const attributes = { alpha: false, antialias: true, powerPreference: 'high-performance' };
        try {
            const context = canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes);
            if (!context) return createFallbackRenderer();
            return new THREE.WebGLRenderer({ canvas, context, ...attributes });
        } catch {
            return createFallbackRenderer();
        }
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    canvasContainer.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 58;
    controls.target.set(0, 0.5, 0);

    engine.cameraAnim = {
        active: false,
        pos: new THREE.Vector3(),
        target: new THREE.Vector3()
    };

    function moveCameraSmoothly(newPos, newTarget) {
        engine.cameraAnim.active = true;
        engine.cameraAnim.pos.copy(newPos);
        engine.cameraAnim.target.copy(newTarget);
    }

    controls.addEventListener('start', () => {
        engine.cameraAnim.active = false;
    });

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.85);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.95);
    dirLight.position.set(18, 32, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 90;
    const dShadow = 28;
    dirLight.shadow.camera.left = -dShadow;
    dirLight.shadow.camera.right = dShadow;
    dirLight.shadow.camera.top = dShadow;
    dirLight.shadow.camera.bottom = -dShadow;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const groundGeo = new THREE.CylinderGeometry(80, 80, 1, 48);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x91ba81, roughness: 0.88 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.userData.fallbackGround = true;
    groundMesh.position.y = -0.5;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Environment Container Groups
    const fieldEnvGroup = new THREE.Group();
    const stageEnvGroup = new THREE.Group();
    const raceEnvGroup = new THREE.Group();
    stageEnvGroup.visible = false;
    raceEnvGroup.visible = false;
    scene.add(fieldEnvGroup);
    scene.add(stageEnvGroup);
    scene.add(raceEnvGroup);

    Object.assign(engine, { scene, camera, renderer, controls, moveCameraSmoothly, fieldEnvGroup, stageEnvGroup, raceEnvGroup });
}
