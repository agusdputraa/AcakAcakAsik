import { shuffled } from './random.js'
export function attachShared(engine) {
    // Simulation Sequences
    engine.activeTimers = [];

    function clearSimulationTimers() {
        engine.activeTimers.forEach(id => clearTimeout(id));
        engine.activeTimers = [];
    }

    function setStatus(text, isBusy = false) {
        engine.state.status = text;
        engine.state.isBusy = isBusy;
        engine.publish();
    }

    function shuffleArray(arr) {
        return shuffled(arr);
    }

    Object.assign(engine, { clearSimulationTimers, setStatus, shuffleArray });
}
