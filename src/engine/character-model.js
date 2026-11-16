import { createCharacter } from './characters/character.js'
import * as THREE from 'three'

export function attachCharacterModel(engine) {
    // 3D Character Builder
    const charactersGroup = new THREE.Group();
    engine.scene.add(charactersGroup);

    engine.participantEntities = [];
    engine.mcEntity = null;

    function hashStringToSeed(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    const createCharacterMesh = createCharacter;
    Object.assign(engine, { charactersGroup, hashStringToSeed, createCharacterMesh });
}
