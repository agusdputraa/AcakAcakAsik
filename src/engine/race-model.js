import { randomUnit } from './random.js'
import { parseGroups } from '../lib/group-format.js'

export const CIRCUIT_X = 18;
export const CIRCUIT_Z = 11;
export const CIRCUIT_LENGTH = 2 * Math.PI * Math.sqrt((CIRCUIT_X ** 2 + CIRCUIT_Z ** 2) / 2);
export function raceGroups(state) {
    if (state.raceListType === 'individual') {
        return state.raceNames.split(/\r?\n/).map(name => name.trim()).filter(Boolean)
            .map((name, index) => ({ id: 'i' + index, name, members: [name] }));
    }
    if (state.raceListType === 'only-groups') {
        return Array.from({ length: state.raceGroupCount }, (_, index) => ({
            id: 'g' + index, name: `Kelompok ${index + 1}`, members: ['1', '2', '3']
        }));
    }
    return parseGroups(state.raceGroupsText).groups.map((group, index) => ({ ...group, id: 'g' + index }));
}
export function makeRacePlan(groups, laps, random = randomUnit) {
    const total = laps * CIRCUIT_LENGTH;
    // Every entrant receives draws from the same distribution, with a fresh pace each half-lap.
    return groups.flatMap(group => group.members.map((name, memberIndex) => {
        const segmentCount = laps * 2;
        const segments = Array.from({ length: segmentCount }, () => ({ length: total / segmentCount, speed: 7 + random() * 7 }));
        const duration = segments.reduce((sum, segment) => sum + segment.length / segment.speed, 0);
        return { id: `${group.id}-${memberIndex}`, groupId: group.id, name, segments, duration, distance: 0, finished: false };
    }));
}
export function distanceAt(runner, elapsed) {
    let distance = 0;
    for (const segment of runner.segments) {
        const duration = segment.length / segment.speed;
        if (elapsed < duration) return distance + Math.max(0, elapsed) * segment.speed;
        elapsed -= duration;
        distance += segment.length;
    }
    return distance;
}
export function rankGroups(groups, runners, random = randomUnit) {
    return groups.map(group => ({
        ...group,
        finishTime: Math.max(...runners.filter(runner => runner.groupId === group.id).map(runner => runner.duration)),
        tie: random(),
    })).sort((a, b) => a.finishTime - b.finishTime || a.tie - b.tie);
}
