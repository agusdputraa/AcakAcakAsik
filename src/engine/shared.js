import { shuffled } from './random.js'

export function attachShared(engine) {
    // Simulation Sequences & Managed Timers
    engine.activeTimers = [];
    engine.activeIntervals = [];

    function clearSimulationTimers() {
        if (engine.activeTimers) {
            engine.activeTimers.forEach(id => clearTimeout(id));
            engine.activeTimers = [];
        }
        if (engine.activeIntervals) {
            engine.activeIntervals.forEach(id => clearInterval(id));
            engine.activeIntervals = [];
        }
    }

    function after(ms, callback) {
        const id = setTimeout(() => {
            const idx = engine.activeTimers.indexOf(id);
            if (idx >= 0) engine.activeTimers.splice(idx, 1);
            callback();
        }, ms);
        engine.activeTimers.push(id);
        return id;
    }

    function every(ms, callback) {
        const id = setInterval(callback, ms);
        engine.activeIntervals.push(id);
        return id;
    }

    function setStatus(text, isBusy = false) {
        engine.state.status = text;
        engine.state.isBusy = isBusy;
        engine.publish();
    }

    function shuffleArray(arr) {
        return shuffled(arr);
    }

    Object.assign(engine, { clearSimulationTimers, after, every, setStatus, shuffleArray });
}
