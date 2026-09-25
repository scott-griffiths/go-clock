// A stopwatch: started, stopped, started again from where it stopped, and
// reset. It keeps its time whatever the board is showing, so it runs on
// while the clock or a replay has the board, and is where it should be
// when the board comes back to it. Its time is reckoned from the wall
// clock (Date.now), not from the page's own, so it can be saved
// (toJSON) and taken up again (fromJSON) by a page opened later: a
// stopwatch left running is still running when the app is next opened.
// Nothing here knows about the board; its face is faces.js's
// stopwatchFace, and my-clock.js keeps the one stopwatch there is.

export class Stopwatch {
    constructor() {
        this.running = false;
        // The time run before the last start, in ms; and when that start
        // was, while running.
        this.banked = 0;
        this.startedAt = 0;
    }

    // The time on the stopwatch, in ms.
    elapsed(now = Date.now()) {
        // Never less than was banked, should the wall clock be put back.
        return this.running ? this.banked + Math.max(0, now - this.startedAt) : this.banked;
    }

    start(now = Date.now()) {
        if (!this.running) {
            this.running = true;
            this.startedAt = now;
        }
    }

    stop(now = Date.now()) {
        if (this.running) {
            this.banked = this.elapsed(now);
            this.running = false;
        }
    }

    // Back to nothing; only once stopped, as the button on a stopwatch is.
    reset() {
        if (!this.running) {
            this.banked = 0;
        }
    }

    toJSON() {
        return {running: this.running, banked: this.banked, startedAt: this.startedAt};
    }

    // A stopwatch as toJSON left it; anything else (nothing saved, or
    // something garbled) is a new one, at nothing.
    static fromJSON(saved) {
        const stopwatch = new Stopwatch();
        const finite = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
        if (saved && finite(saved.banked) && finite(saved.startedAt)) {
            stopwatch.running = saved.running === true;
            stopwatch.banked = saved.banked;
            stopwatch.startedAt = saved.startedAt;
        }
        return stopwatch;
    }
}
