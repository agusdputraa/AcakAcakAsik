import * as THREE from 'three'

// Keep the same scene, camera and simulation in browsers without WebGL.
export function createFallbackRenderer() {
    const domElement = document.createElement('canvas');
    const context = domElement.getContext('2d');
    const geometryCache = new WeakMap();
    const point = new THREE.Vector3();
    const clipPoint = new THREE.Vector4();
    const cameraMatrix = new THREE.Matrix4();
    const projection = new THREE.Matrix4();
    const normal = new THREE.Vector3();
    const light = new THREE.Vector3(0.35, 1, 0.55).normalize();
    const color = new THREE.Color();

    function simplified(geometry) {
        if (geometryCache.has(geometry)) return geometryCache.get(geometry);
        const p = geometry.parameters;
        let proxy;
        if (geometry.type === 'SphereGeometry') {
            proxy = new THREE.SphereGeometry(p.radius, 8, 5, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
        } else if (geometry.type === 'CylinderGeometry') {
            proxy = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 16, 1, p.openEnded);
        } else if (geometry.type === 'RingGeometry') {
            proxy = new THREE.RingGeometry(p.innerRadius, p.outerRadius, 16);
        }
        const item = proxy || geometry;
        const data = { positions: item.getAttribute('position'), normals: item.getAttribute('normal'), index: item.index };
        geometryCache.set(geometry, data);
        return data;
    }

    function clipDepth(vertices, direction) {
        const inside = vertex => vertex[3] + direction * vertex[2];
        if (vertices.every(vertex => inside(vertex) >= 0)) return vertices;
        const clipped = [];
        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const da = inside(a);
            const db = inside(b);
            if (da >= 0) clipped.push(a);
            if ((da < 0) !== (db < 0)) {
                const t = da / (da - db);
                clipped.push(a.map((value, component) => value + (b[component] - value) * t));
                if (vertices.length === 2) {
                    if (db >= 0) clipped.push(b);
                    break;
                }
            }
        }
        return clipped;
    }

    function render(scene, camera) {
        if (!context) return;
        scene.updateMatrixWorld();
        camera.updateMatrixWorld();
        cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        const w = domElement.width;
        const h = domElement.height;
        const grass = scene.children.find(object => object.userData.fallbackGround);
        const sky = scene.background.getStyle();
        const targetPitch = point.set(0, 0, -500).applyMatrix4(camera.matrixWorld).y - camera.position.y;
        const horizon = Math.max(0, h / 2 + targetPitch * h / 330);
        context.fillStyle = grass?.material.color.getStyle() || sky;
        context.fillRect(0, 0, w, h);
        if (horizon > 0) {
            context.fillStyle = sky;
            context.fillRect(0, 0, w, horizon);
        }
        const faces = [];
        const signs = [];

        scene.traverseVisible(object => {
            if (object.userData.fallbackGround || (!object.isMesh && !object.isLineSegments)) return;
            const { material, geometry } = object;
            const { positions, normals, index } = simplified(geometry);
            if (!positions || !material.visible || !material.color) return;
            projection.multiplyMatrices(cameraMatrix, object.matrixWorld);
            const projected = Array.from({ length: positions.count }, (_, i) => {
                clipPoint.set(positions.getX(i), positions.getY(i), positions.getZ(i), 1).applyMatrix4(projection);
                return [clipPoint.x, clipPoint.y, clipPoint.z, clipPoint.w];
            });
            const { fallbackSign, fallbackColor, fallbackLayer = 0 } = object.userData;
            if (fallbackSign) {
                const center = point.set(0, 0, 0).applyMatrix4(projection);
                if (center.z > -1 && center.z < 1) {
                    const x = (center.x + 1) * w / 2;
                    const y = (1 - center.y) * h / 2;
                    const right = point.set(geometry.parameters.width / 2, 0, 0).applyMatrix4(projection);
                    const width = Math.abs((right.x + 1) * w / 2 - x) * 2;
                    signs.push({ x, y, width, label: fallbackSign });
                }
            }
            const stride = object.isLineSegments ? 2 : 3;
            const length = index ? index.count : projected.length;
            for (let i = 0; i + stride <= length; i += stride) {
                const ids = Array.from({ length: stride }, (_, j) => index ? index.getX(i + j) : i + j);
                const clipped = clipDepth(clipDepth(ids.map(id => projected[id]), 1), -1);
                if (clipped.length < stride) continue;
                const vertices = clipped.map(([x, y, z, depth]) => [
                    (x / depth + 1) * w / 2, (1 - y / depth) * h / 2, z / depth
                ]);
                const [a, b, c] = vertices;
                if (c && material.side !== THREE.DoubleSide
                    && (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) >= 0) continue;
                let shade = 1;
                if (c && normals && !material.isMeshBasicMaterial) {
                    normal.fromBufferAttribute(normals, ids[0]).transformDirection(object.matrixWorld);
                    shade = 0.75 + 0.25 * Math.max(0, normal.dot(light));
                }
                faces.push({
                    vertices,
                    color: color.set(fallbackColor || material.color).multiplyScalar(shade).getStyle(),
                    layer: fallbackLayer,
                    alpha: material.opacity,
                    depth: vertices.reduce((sum, vertex) => sum + vertex[2], 0) / vertices.length
                });
            }
        });

        faces.sort((a, b) => a.layer - b.layer || b.depth - a.depth);
        for (const { vertices, color, alpha } of faces) {
            context.globalAlpha = alpha;
            context.beginPath();
            context.moveTo(vertices[0][0], vertices[0][1]);
            for (const [x, y] of vertices.slice(1)) context.lineTo(x, y);
            if (vertices.length === 2) {
                context.strokeStyle = color;
                context.stroke();
            } else {
                context.closePath();
                context.fillStyle = color;
                context.fill();
            }
        }
        context.globalAlpha = 1;
        context.fillStyle = '#fff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        for (const { x, y, width, label } of signs) {
            if (width < 10) continue;
            context.font = `700 ${Math.max(8, Math.min(22, width / 7))}px sans-serif`;
            context.fillText(label, x, y, width * 0.85);
        }
    }

    return {
        domElement, isFallback: true, shadowMap: {},
        setSize(width, height) {
            domElement.width = width;
            domElement.height = height;
            domElement.style.width = `${width}px`;
            domElement.style.height = `${height}px`;
        },
        setPixelRatio() {},
        render,
        dispose() {},
    };
}
