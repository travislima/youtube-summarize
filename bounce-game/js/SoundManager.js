class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.audioCtx = null;
        this.enabled = true;
    }

    init() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }

    resume() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.15) {
        if (!this.enabled || !this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playJump() {
        this.playTone(440, 0.15, 'sine', 0.12);
        this.playTone(660, 0.1, 'sine', 0.08);
    }

    playSuperJump() {
        this.playTone(440, 0.1, 'square', 0.1);
        setTimeout(() => this.playTone(660, 0.1, 'square', 0.1), 50);
        setTimeout(() => this.playTone(880, 0.15, 'square', 0.1), 100);
    }

    playBreak() {
        this.playTone(200, 0.2, 'sawtooth', 0.1);
        this.playTone(150, 0.3, 'sawtooth', 0.08);
    }

    playCombo() {
        this.playTone(523, 0.08, 'sine', 0.1);
        setTimeout(() => this.playTone(659, 0.08, 'sine', 0.1), 60);
        setTimeout(() => this.playTone(784, 0.12, 'sine', 0.1), 120);
    }

    playGameOver() {
        this.playTone(400, 0.2, 'sawtooth', 0.15);
        setTimeout(() => this.playTone(300, 0.2, 'sawtooth', 0.15), 200);
        setTimeout(() => this.playTone(200, 0.4, 'sawtooth', 0.15), 400);
    }

    playMenuSelect() {
        this.playTone(600, 0.1, 'sine', 0.1);
        setTimeout(() => this.playTone(800, 0.15, 'sine', 0.1), 80);
    }
}
