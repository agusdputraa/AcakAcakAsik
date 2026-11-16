import * as THREE from 'three'

export function attachNameBadges(engine) {
    // Floating Name Badges Layer
    const labelsContainer = engine.surfaces.labels;

    function createNameBadgeElement(name, isMC = false) {
        const el = document.createElement('div');
        el.className = isMC
            ? 'name-badge px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[11px] shadow-md border border-white max-w-[130px] truncate'
            : 'name-badge px-2.5 py-0.5 rounded-full bg-slate-900/80 text-white font-bold text-[11px] shadow-sm border border-white/25 backdrop-blur-xs max-w-[120px] truncate';
        el.textContent = name;
        labelsContainer.appendChild(el);
        return el;
    }

    function resetBadgeStyle(entity) {
        if (!entity || !entity.labelEl) return;
        entity.labelEl.className = 'name-badge px-2.5 py-0.5 rounded-full bg-slate-900/80 text-white font-bold text-[11px] shadow-sm border border-white/25 backdrop-blur-xs max-w-[120px] truncate';
    }

    function highlightBadge(entity, active, isWinner = false) {
        if (!entity || !entity.labelEl) return;
        if (isWinner) {
            entity.labelEl.className = 'name-badge px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg border-2 border-white winner-glow z-10 max-w-[150px] truncate';
        } else if (active) {
            entity.labelEl.className = 'name-badge px-3 py-0.5 rounded-full bg-white text-slate-950 font-extrabold text-xs shadow-lg border-2 border-amber-400 scale-110 z-10 max-w-[140px] truncate';
        } else {
            resetBadgeStyle(entity);
        }
    }

    function colorBadgeForGroup(entity, theme) {
        if (!entity || !entity.labelEl) return;
        entity.labelEl.className = `name-badge px-2.5 py-0.5 rounded-full ${theme.badgeBg} text-white font-extrabold text-[11px] shadow-md border border-white/80 max-w-[120px] truncate`;
    }

    const tempProjVec = new THREE.Vector3();

    function updateFloatingLabels() {
        const halfW = window.innerWidth / 2;
        const halfH = window.innerHeight / 2;

        engine.participantEntities.forEach(p => {
            if (!p.labelEl) return;
            if (!p.meshParts.root.visible) {
                p.labelEl.style.opacity = '0';
                return;
            }
            tempProjVec.copy(p.meshParts.root.position);
            tempProjVec.y += 2.45;
            tempProjVec.project(engine.camera);

            if (tempProjVec.z < -1 || tempProjVec.z > 1 || Math.abs(tempProjVec.x) > 1 || Math.abs(tempProjVec.y) > 1) {
                p.labelEl.style.opacity = '0';
                return;
            }
            const x = (tempProjVec.x * halfW) + halfW;
            const y = -(tempProjVec.y * halfH) + halfH;
            p.labelEl.style.opacity = '1';
            p.labelEl.style.left = `${x.toFixed(1)}px`;
            p.labelEl.style.top = `${y.toFixed(1)}px`;
        });

        if (engine.mcEntity && engine.mcEntity.labelEl) {
            if (!engine.stageEnvGroup.visible) {
                engine.mcEntity.labelEl.style.opacity = '0';
            } else {
                tempProjVec.copy(engine.mcEntity.meshParts.root.position);
                tempProjVec.y += 2.55;
                tempProjVec.project(engine.camera);
                if (tempProjVec.z > 1) engine.mcEntity.labelEl.style.opacity = '0';
                else {
                    const x = (tempProjVec.x * halfW) + halfW;
                    const y = -(tempProjVec.y * halfH) + halfH;
                    engine.mcEntity.labelEl.style.opacity = '1';
                    engine.mcEntity.labelEl.style.left = `${x.toFixed(1)}px`;
                    engine.mcEntity.labelEl.style.top = `${y.toFixed(1)}px`;
                }
            }
        }
    }

    Object.assign(engine, { createNameBadgeElement, resetBadgeStyle, highlightBadge, colorBadgeForGroup, updateFloatingLabels });
}
