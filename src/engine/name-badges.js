import * as THREE from 'three'

export function attachNameBadges(engine) {
    // Floating Name Badges Layer
    const labelsContainer = engine.surfaces.labels;

    function createNameBadgeElement(name, isMC = false) {
        const el = document.createElement('div');
        el.className = isMC
            ? 'name-badge px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[11px] shadow-md border border-white max-w-[240px] whitespace-nowrap'
            : 'name-badge px-2.5 py-0.5 rounded-full bg-slate-900/90 text-white font-bold text-[11px] shadow-sm border border-white/25 max-w-[120px] truncate';
        el.textContent = name;
        labelsContainer.appendChild(el);
        return el;
    }

    function resetBadgeStyle(entity) {
        if (!entity || !entity.labelEl) return;
        entity.labelEl.className = 'name-badge px-2.5 py-0.5 rounded-full bg-slate-900/90 text-white font-bold text-[11px] shadow-sm border border-white/25 max-w-[120px] truncate';
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
            if (p.isAudience || !p.meshParts.root.visible || p.meshParts.root.scale.x <= 0.05 || p.pos.y < -50) {
                if (p._labelVisible !== false) {
                    p.labelEl.style.opacity = '0';
                    p._labelVisible = false;
                }
                return;
            }
            tempProjVec.copy(p.meshParts.root.position);
            tempProjVec.y += 2.45;
            tempProjVec.project(engine.camera);

            if (tempProjVec.z < -1 || tempProjVec.z > 1 || Math.abs(tempProjVec.x) > 1 || Math.abs(tempProjVec.y) > 1) {
                if (p._labelVisible !== false) {
                    p.labelEl.style.opacity = '0';
                    p._labelVisible = false;
                }
                return;
            }
            const x = (tempProjVec.x * halfW) + halfW;
            const y = -(tempProjVec.y * halfH) + halfH;
            if (p._labelVisible !== true) {
                p.labelEl.style.opacity = '1';
                p._labelVisible = true;
            }
            if (Math.abs(x - (p._lastLabelX || 0)) > 0.4 || Math.abs(y - (p._lastLabelY || 0)) > 0.4) {
                p.labelEl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
                p._lastLabelX = x;
                p._lastLabelY = y;
            }
        });

        if (engine.mcEntity && engine.mcEntity.labelEl) {
            const mc = engine.mcEntity;
            if (!mc.meshParts.root.visible) {
                if (mc._labelVisible !== false) {
                    mc.labelEl.style.opacity = '0';
                    mc._labelVisible = false;
                }
            } else {
                tempProjVec.copy(mc.meshParts.root.position);
                tempProjVec.y += 2.55;
                tempProjVec.project(engine.camera);
                if (tempProjVec.z > 1 || tempProjVec.z < -1 || Math.abs(tempProjVec.x) > 1 || Math.abs(tempProjVec.y) > 1) {
                    if (mc._labelVisible !== false) {
                        mc.labelEl.style.opacity = '0';
                        mc._labelVisible = false;
                    }
                } else {
                    const x = (tempProjVec.x * halfW) + halfW;
                    const y = -(tempProjVec.y * halfH) + halfH;
                    if (mc._labelVisible !== true) {
                        mc.labelEl.style.opacity = '1';
                        mc._labelVisible = true;
                    }
                    if (Math.abs(x - (mc._lastLabelX || 0)) > 0.4 || Math.abs(y - (mc._lastLabelY || 0)) > 0.4) {
                        mc.labelEl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
                        mc._lastLabelX = x;
                        mc._lastLabelY = y;
                    }
                }
            }
        }
    }

    Object.assign(engine, { createNameBadgeElement, resetBadgeStyle, highlightBadge, colorBadgeForGroup, updateFloatingLabels });
}
