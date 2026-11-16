import * as THREE from 'three'

export function attachCelebrations(engine) {
    // Confetti & Fireworks
    let confettiParticles = [];

    function spawnConfettiBurst(originVec3, count = 85) {
        const colors = [0xef4444, 0xfacc15, 0x3b82f6, 0x10b981, 0xec4899, 0x8b5cf6];
        const geo = new THREE.BoxGeometry(0.16, 0.16, 0.04);

        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length] });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(originVec3);
            mesh.position.y += 2.2;

            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 5.5;
            const vel = new THREE.Vector3(Math.cos(angle) * speed, 5.5 + Math.random() * 6.5, Math.sin(angle) * speed);

            engine.scene.add(mesh);
            confettiParticles.push({
                mesh,
                vel,
                rotSpeed: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
                life: 3.2
            });
        }
    }

    function updateConfetti(dt) {
        for (let i = confettiParticles.length - 1; i >= 0; i--) {
            const p = confettiParticles[i];
            p.life -= dt;
            if (p.life <= 0) {
                engine.scene.remove(p.mesh);
                confettiParticles.splice(i, 1);
                continue;
            }
            p.vel.y -= 14.5 * dt;
            p.mesh.position.addScaledVector(p.vel, dt);
            p.mesh.rotation.x += p.rotSpeed.x * dt;
            p.mesh.rotation.y += p.rotSpeed.y * dt;
            p.mesh.rotation.z += p.rotSpeed.z * dt;
            if (p.mesh.position.y < 0.08) {
                p.mesh.position.y = 0.08;
                p.vel.y = 0;
            }
        }
    }

    const fwCanvas = engine.surfaces.fireworks;
    const fwCtx = fwCanvas.getContext('2d');
    let fwParticles = [];
    engine.fwBurstTimers = [];

    function resizeFireworksCanvas() {
        fwCanvas.width = window.innerWidth;
        fwCanvas.height = window.innerHeight;
    }
    resizeFireworksCanvas();

    function launchFireworkShow() {
        engine.fwBurstTimers.forEach(id => clearTimeout(id));
        engine.fwBurstTimers = [];

        const burstTimes = [0, 350, 750, 1200, 1750];
        const colors = ['#facc15', '#fb7185', '#38bdf8', '#4ade80', '#c084fc', '#fb923c', '#ffffff'];

        burstTimes.forEach((delay, bIdx) => {
            const tid = setTimeout(() => {
                const cx = fwCanvas.width * (0.24 + ((bIdx * 0.17) % 0.52) + (Math.random() - 0.5) * 0.08);
                const cy = fwCanvas.height * (0.16 + Math.random() * 0.22);
                const baseColor = colors[bIdx % colors.length];

                for (let i = 0; i < 48; i++) {
                    const angle = (i / 48) * Math.PI * 2 + Math.random() * 0.15;
                    const speed = 90 + Math.random() * 190;
                    fwParticles.push({
                        x: cx, y: cy,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        color: i % 3 === 0 ? '#ffffff' : baseColor,
                        alpha: 1, radius: 2.2 + Math.random() * 2.2, decay: 0.72 + Math.random() * 0.35
                    });
                }
            }, delay);
            engine.fwBurstTimers.push(tid);
        });
    }

    function updateAndDrawFireworks(dt) {
        fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
        if (fwParticles.length === 0) return;

        for (let i = fwParticles.length - 1; i >= 0; i--) {
            const p = fwParticles[i];
            p.alpha -= p.decay * dt;
            if (p.alpha <= 0) {
                fwParticles.splice(i, 1);
                continue;
            }
            p.vy += 140 * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            fwCtx.save();
            fwCtx.globalAlpha = Math.max(0, p.alpha);
            fwCtx.fillStyle = p.color;
            fwCtx.shadowBlur = 10;
            fwCtx.shadowColor = p.color;
            fwCtx.beginPath();
            fwCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            fwCtx.fill();
            fwCtx.restore();
        }
    }

    Object.assign(engine, { spawnConfettiBurst, updateConfetti, resizeFireworksCanvas, launchFireworkShow, updateAndDrawFireworks });
}
