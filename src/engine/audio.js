export function attachAudio(engine) {
    const sfx = {
        ctx: null,
        muted: false,
        init() {
            try {
                if (!this.ctx) {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) this.ctx = new AudioCtx();
                }
                if (this.ctx && this.ctx.state === 'suspended') {
                    this.ctx.resume().catch(() => {});
                }
            } catch (e) {}
        },
        toggleMute() {
            this.muted = !this.muted;
            return this.muted;
        },
        playPop(step = 0) {
            if (this.muted) return;
            try {
                this.init();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                const freq = 340 + (step % 8) * 45;
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.45, now + 0.08);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.095);
            } catch (e) {}
        },
        playTing(pitch = 1.0) {
            if (this.muted) return;
            try {
                this.init();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(780 * pitch, now);
                osc.frequency.exponentialRampToValueAtTime(1180 * pitch, now + 0.14);
                gain.gain.setValueAtTime(0.16, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.17);
            } catch (e) {}
        },
        playBeep(high = false) {
            if (this.muted) return;
            try {
                this.init();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(high ? 880 : 440, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.26);
            } catch (e) {}
        },
        playApplause() {
            if (this.muted) return;
            try {
                this.init();
                if (!this.ctx) return;
                const duration = 2.2;
                const bufferSize = Math.floor(this.ctx.sampleRate * duration);
                const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const env = Math.sin((i / bufferSize) * Math.PI);
                    const clapPulse = 0.55 + 0.45 * Math.sin(i * 0.018) * Math.cos(i * 0.031);
                    output[i] = (Math.random() * 2 - 1) * env * clapPulse;
                }
                const whiteNoise = this.ctx.createBufferSource();
                whiteNoise.buffer = noiseBuffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1350;
                filter.Q.value = 0.9;

                const gain = this.ctx.createGain();
                const now = this.ctx.currentTime;
                gain.gain.setValueAtTime(0.01, now);
                gain.gain.linearRampToValueAtTime(0.22, now + 0.25);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

                whiteNoise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                whiteNoise.start(now);
                whiteNoise.stop(now + duration);
            } catch (e) {}
        },
        playFanfare() {
            if (this.muted) return;
            try {
                this.init();
                if (!this.ctx) return;
                const notes = [523.25, 659.25, 783.99, 1046.5];
                notes.forEach((freq, idx) => {
                    const now = this.ctx.currentTime + idx * 0.11;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now);
                    gain.gain.setValueAtTime(0.16, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.45);
                });
                this.playApplause();
            } catch (e) {}
        }
    };

    Object.assign(engine, { sfx });
}
