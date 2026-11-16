import { attachParkScenery } from './park-scenery.js'
import { attachChoiceStage } from './choice-stage.js'
import { attachChoices } from './choice-model.js'
import { attachPalette } from './palette.js'
import { attachAudio } from './audio.js'
import { attachState } from './state.js'
import { attachSetup } from './setup.js'
import { attachGroupField } from './group-field.js'
import { attachRaceScenery } from './race-scenery.js'
import { attachRaceTrack } from './race-track.js'
import { attachRaffleStage } from './raffle-stage.js'
import { attachCharacterModel } from './character-model.js'
import { attachParticipants } from './participants.js'
import { attachNameBadges } from './name-badges.js'
import { attachCelebrations } from './celebrations.js'
import { attachShared } from './shared.js'
import { attachGroupDivision } from './group-division.js'
import { attachRaffle } from './raffle.js'
import { attachTopics } from './topics.js'
import { attachRace } from './race.js'
import { attachAnimationLoop } from './animation-loop.js'
import { attachController } from './controller.js'

export function createArenaEngine(options) {
    const engine = { ...options };
    attachPalette(engine);
    attachAudio(engine);
    attachState(engine);
    attachSetup(engine);
    attachGroupField(engine);
    attachRaceTrack(engine);
    attachRaffleStage(engine);
    attachCharacterModel(engine);
    attachRaceScenery(engine);
    attachParkScenery(engine);
    attachChoiceStage(engine);
    attachParticipants(engine);
    attachNameBadges(engine);
    attachCelebrations(engine);
    attachShared(engine);
    attachGroupDivision(engine);
    attachRaffle(engine);
    attachRace(engine);
    attachTopics(engine);
    attachChoices(engine);
    attachAnimationLoop(engine);
    attachController(engine);
    engine.actions.initialize();
    return engine.actions;
}
