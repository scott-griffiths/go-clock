// The sounds of stones, made rather than recorded: a stone put down on the
// board, one slid along it, one dropped back into its bowl, and the sweep —
// stones sliding, knocking together and landing on the table. Everything
// is synthesised with the Web Audio API, so there is nothing to download
// and nothing to cache.
//
// A browser will not make a sound until the page has been touched, so the
// audio context is created (or resumed) on the first pointer event once
// sound is switched on; anything asked for before that is dropped. While
// sound is on, an inaudible source plays the whole time: iOS otherwise lets
// go of the audio session as soon as the last sound ends, and the next one
// can find it interrupted or silent.

export class Sounds {
    constructor() {
        this.context = null;
        this.master = null;
        this.noise = null;
        this.rumble = null;
        this.keepAlive = null;
        this.enabled = false;
        this.lastPlayed = new Map();
        this.voices = 0;
        this.unlock = () => this.ensureContext();
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        if (this.enabled) {
            this.ensureContext();
            document.addEventListener('pointerdown', this.unlock);
            document.addEventListener('keydown', this.unlock);
            document.addEventListener('visibilitychange', this.unlock);
        } else {
            document.removeEventListener('pointerdown', this.unlock);
            document.removeEventListener('keydown', this.unlock);
            document.removeEventListener('visibilitychange', this.unlock);
            this.setRumble(0);
            if (this.keepAlive) {
                this.keepAlive.stop();
                this.keepAlive = null;
            }
        }
    }

    // Makes the audio context if it does not exist and wakes it if it is
    // asleep; returns whether it is ready to play right now.
    ensureContext() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            return false;
        }
        if (!this.context) {
            this.context = new AudioContextClass();
            // iOS can put the context to sleep — 'suspended', or its own
            // 'interrupted' after a call or another app's audio — and it
            // will not wake by itself.
            this.context.addEventListener('statechange', () => {
                if (this.enabled && this.context.state !== 'running') {
                    this.context.resume().catch(() => {});
                }
            });
            this.master = this.context.createGain();
            this.master.gain.value = 0.7;
            this.master.connect(this.context.destination);
            // A second of white noise, the raw material for clicks and scrapes.
            const length = this.context.sampleRate;
            this.noise = this.context.createBuffer(1, length, this.context.sampleRate);
            const samples = this.noise.getChannelData(0);
            for (let i = 0; i < length; i++) {
                samples[i] = Math.random()*2 - 1;
            }
        }
        if (this.context.state !== 'running') {
            this.context.resume().catch(() => {});
        }
        if (this.enabled && !this.keepAlive) {
            // Silent, but playing: see the note at the top.
            const source = this.context.createBufferSource();
            source.buffer = this.noise;
            source.loop = true;
            const quiet = this.context.createGain();
            quiet.gain.value = 0.00001;
            source.connect(quiet).connect(this.context.destination);
            source.start();
            this.keepAlive = source;
        }
        return this.context.state === 'running';
    }

    // Whether a sound of this kind may play now: sound is on, the context is
    // awake, this kind has not played within `gap` seconds, and there are not
    // too many sounds already going (a sweep asks for a great many).
    ready(kind, gap = 0) {
        if (!this.enabled || !this.ensureContext() || this.voices >= 14) {
            return false;
        }
        const now = this.context.currentTime;
        if (gap > 0 && now - (this.lastPlayed.get(kind) ?? -1) < gap) {
            return false;
        }
        this.lastPlayed.set(kind, now);
        return true;
    }

    // Keeps count of what is playing, for the polyphony cap.
    voice(source, until) {
        this.voices += 1;
        source.addEventListener('ended', () => {
            this.voices -= 1;
        }, {once: true});
        source.stop(until);
    }

    // A burst of noise through a filter: the crack of an impact or a scrape.
    burst({start, duration, gain, attack = 0.002, filter = 'bandpass', frequency = 2500, q = 1}) {
        const context = this.context;
        const source = context.createBufferSource();
        source.buffer = this.noise;
        source.loop = true;
        source.loopStart = Math.random()*0.5;
        const shape = context.createBiquadFilter();
        shape.type = filter;
        shape.frequency.value = frequency;
        shape.Q.value = q;
        const envelope = context.createGain();
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(gain, start + attack);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(shape).connect(envelope).connect(this.master);
        source.start(start);
        this.voice(source, start + duration + 0.02);
    }

    // A ringing partial: a sine that dies away.
    ring({start, frequency, duration, gain}) {
        const context = this.context;
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        const envelope = context.createGain();
        envelope.gain.setValueAtTime(gain, start);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(envelope).connect(this.master);
        oscillator.start(start);
        this.voice(oscillator, start + duration + 0.02);
    }

    // A stone against wood: a crack, a short bright ring from the stone and
    // a lower, woody "tok" from the board. Slate (black) rings a little
    // higher than shell (white); a harder impact is louder and brighter.
    clack({colour = 'black', strength = 1, delay = 0, wood = true} = {}) {
        const start = this.context.currentTime + delay;
        const loud = Math.min(1, Math.max(0.15, strength));
        const base = (colour === 'white' ? 1900 : 2300)*(0.94 + Math.random()*0.12);
        this.burst({start, duration: 0.018, gain: 0.5*loud, frequency: 3000 + 1500*loud, q: 0.8});
        this.ring({start, frequency: base, duration: 0.07 + 0.05*loud, gain: 0.2*loud});
        this.ring({start, frequency: base*1.58, duration: 0.045, gain: 0.1*loud});
        this.ring({start, frequency: base*2.7, duration: 0.02, gain: 0.05*loud});
        if (wood) {
            this.ring({start: start + 0.002, frequency: 470*(0.92 + Math.random()*0.16), duration: 0.09 + 0.05*loud, gain: 0.16*loud});
        }
    }

    // A stone set down on the board.
    place(colour) {
        if (this.ready('place', 0.03)) {
            this.clack({colour, strength: 0.8 + Math.random()*0.2});
        }
    }

    // A stone slid across the board: a scrape that fades.
    slide(duration = 0.3) {
        if (this.ready('slide', 0.05)) {
            const start = this.context.currentTime;
            this.burst({start, duration: Math.max(0.12, duration), gain: 0.12, attack: 0.03, frequency: 1400, q: 0.6});
        }
    }

    // A stone nudged by another: the lightest of clacks.
    nudge(colour) {
        if (this.ready('nudge', 0.03)) {
            this.clack({colour, strength: 0.35});
        }
    }

    // A stone dropped into its bowl: it lands on other stones, a brighter
    // clink or two, a little muffled by the bowl.
    bowl(colour) {
        if (this.ready('bowl', 0.05)) {
            const start = this.context.currentTime;
            const base = (colour === 'white' ? 2600 : 3100)*(0.95 + Math.random()*0.1);
            this.burst({start, duration: 0.014, gain: 0.25, frequency: 4000, q: 1});
            this.ring({start, frequency: base, duration: 0.09, gain: 0.14});
            this.ring({start, frequency: base*1.5, duration: 0.05, gain: 0.05});
            if (Math.random() < 0.7) {
                const again = start + 0.04 + Math.random()*0.05;
                this.burst({start: again, duration: 0.012, gain: 0.15, frequency: 4000, q: 1});
                this.ring({start: again, frequency: base*1.12, duration: 0.07, gain: 0.08});
            }
        }
    }

    // Two stones knocking together during the sweep; `strength` is how
    // hard, 0 to 1. Rate-limited hard: there are a lot of these.
    knock(strength) {
        if (strength > 0.08 && this.ready('knock', 0.035)) {
            this.clack({colour: Math.random() < 0.5 ? 'black' : 'white', strength: strength*0.7, wood: false});
        }
    }

    // A stone dropping off the board onto the table: duller than the board.
    land(strength) {
        if (this.ready('land', 0.04)) {
            const start = this.context.currentTime;
            const loud = Math.min(1, Math.max(0.2, strength));
            this.burst({start, duration: 0.03, gain: 0.35*loud, filter: 'lowpass', frequency: 900, q: 0.7});
            this.ring({start, frequency: 210*(0.9 + Math.random()*0.2), duration: 0.07, gain: 0.18*loud});
            this.ring({start, frequency: 1500*(0.9 + Math.random()*0.2), duration: 0.03, gain: 0.05*loud});
        }
    }

    // The rumble of stones sliding down the tipped board: filtered noise whose
    // loudness follows how many are moving. Level 0 stops it.
    setRumble(level) {
        if (level > 0 && !this.rumble) {
            if (!this.enabled || !this.ensureContext()) {
                return;
            }
            const context = this.context;
            const source = context.createBufferSource();
            source.buffer = this.noise;
            source.loop = true;
            const shape = context.createBiquadFilter();
            shape.type = 'lowpass';
            shape.frequency.value = 700;
            const envelope = context.createGain();
            envelope.gain.value = 0;
            source.connect(shape).connect(envelope).connect(this.master);
            source.start();
            this.rumble = {source, envelope};
        }
        if (!this.rumble) {
            return;
        }
        const now = this.context.currentTime;
        this.rumble.envelope.gain.setTargetAtTime(Math.min(0.25, level), now, 0.08);
        if (level <= 0) {
            const {source} = this.rumble;
            this.rumble = null;
            source.stop(now + 0.5);
        }
    }
}
