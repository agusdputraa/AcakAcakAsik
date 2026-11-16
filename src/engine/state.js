export function attachState(engine) {
    const STORAGE_KEY = 'arena_acak_3d_state_v2';
    const initialNames = ['Budi', 'Siti', 'Andi', 'Dewi', 'Reza', 'Nabila', 'Fajar', 'Putri', 'Dimas', 'Rina'];

    const state = {
        rawText: initialNames.join('\n'),
        status: 'Menyiapkan arena…',
        result: null,
        winner: null,
        countdown: null,
        mode: 'groups', // 'groups' | 'single' | 'individual' | 'race'
        singleType: 'spotlight',
        excludedIds: [],
        raceListType: 'only-groups', raceGroupCount: 3, raceNames: initialNames.join('\n'),
        raceGroupsText: '', laps: 1, cameraMode: 'track', cameraTarget: null, cameraSide: 'rear',
        masterParticipants: initialNames.map((name, i) => ({ id: i + 1, name })),
        groupCount: 4,
        isBusy: false,
        lastGroupsResult: [],
        waitingForGroupArrival: false,
        groupArrivalDwellTimer: 0,
        pendingGroupsResult: null,

        // Race specific state
        raceRunners: [],
        raceActive: false,
        raceElapsed: 0,
        raceWinnersList: []
    };

    function snapshotGroups(groups) {
        return groups.filter(group => group && typeof group.name === 'string'
            && Number.isInteger(group.index) && group.index >= 0 && Array.isArray(group.members))
            .map(group => ({
                index: group.index,
                name: group.name,
                members: group.members.filter(member => member && typeof member.name === 'string')
                    .map(member => ({ id: member.id, name: member.name }))
            }));
    }

    function saveStateToLocalStorage() {
        try {
            const payload = {
                mode: state.mode,
                singleType: state.singleType, excludedIds: state.excludedIds,
                raceListType: state.raceListType, raceGroupCount: state.raceGroupCount, raceNames: state.raceNames, raceGroupsText: state.raceGroupsText, laps: state.laps,
                groupCount: state.groupCount,
                rawText: state.rawText,
                participants: state.masterParticipants.map(p => ({ id: p.id, name: p.name })),
                lastGroupsResult: state.lastGroupsResult
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {}
    }

    function loadStateFromLocalStorage() {
        try {
            const savedRaw = localStorage.getItem(STORAGE_KEY);
            if (!savedRaw) return;
            const parsed = JSON.parse(savedRaw);
            if (parsed && typeof parsed === 'object') {
                if (['groups', 'single', 'individual', 'race'].includes(parsed.mode)) {
                    state.mode = parsed.mode === 'individual' ? 'single' : parsed.mode;
                }
                if (['spotlight', 'mc'].includes(parsed.singleType)) state.singleType = parsed.singleType;
                if (Array.isArray(parsed.excludedIds)) state.excludedIds = parsed.excludedIds;
                if (['only-groups','group-members','individual'].includes(parsed.raceListType)) state.raceListType = parsed.raceListType;
                for (const key of ['raceNames','raceGroupsText']) if (typeof parsed[key] === 'string') state[key] = parsed[key];
                if (Number.isInteger(parsed.laps)) state.laps = Math.max(1, Math.min(10, parsed.laps));
                if (Number.isInteger(parsed.raceGroupCount)) state.raceGroupCount = Math.max(2, Math.min(12, parsed.raceGroupCount));
                if (typeof parsed.groupCount === 'number' && parsed.groupCount >= 2 && parsed.groupCount <= 8) {
                    state.groupCount = parsed.groupCount;
                }
                if (Array.isArray(parsed.lastGroupsResult)) {
                    state.lastGroupsResult = snapshotGroups(parsed.lastGroupsResult);
                }
                if (typeof parsed.rawText === 'string') state.rawText = parsed.rawText;
                if (Array.isArray(parsed.participants)) {
                    state.masterParticipants = parsed.participants.map((p, idx) => ({
                        id: p.id ?? idx + 1,
                        name: String(p.name || '').trim()
                    })).filter(p => p.name.length > 0);
                    if (typeof parsed.rawText !== 'string') {
                        state.rawText = state.masterParticipants.map(person => person.name).join('\n');
                    }
                }
            }
        } catch (e) {}
    }

    Object.assign(engine, { state, snapshotGroups, saveStateToLocalStorage, loadStateFromLocalStorage });
}
