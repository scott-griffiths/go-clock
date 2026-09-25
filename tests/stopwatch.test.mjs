// The stopwatch: its time, started, stopped and started again, and saved
// and taken up again; and its face, checked as the clock's are against a
// picture of the board (● black, ○ white, · empty), and for what each
// second of it asks of the hands.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Stopwatch} from '../www/stopwatch.js';
import {stopwatchFace, faceFor, JUMPING_HOUR} from '../www/faces.js';
import {GoClock} from '../www/go-clock.js';

function picture(stones) {
    const rows = [];
    for (let y = 0; y < 19; y++) {
        rows.push(stones.slice(y*19, y*19 + 19).map((v) => ({0: '·', 1: '○', 3: '●'})[v] ?? '?').join(''));
    }
    return rows.join('\n');
}

function expectFace(ms, running, expected) {
    assert.equal(picture(stopwatchFace(ms, running)), expected.trim().split('\n').map((row) => row.trim()).join('\n'));
}

const at = (minutes, seconds, hundredths = 0) => (minutes*60 + seconds)*1000 + hundredths*10;

test('a stopwatch runs from its start, holds when stopped, and goes on from there', () => {
    const stopwatch = new Stopwatch();
    assert.equal(stopwatch.elapsed(5000), 0);
    stopwatch.start(1000);
    assert.equal(stopwatch.running, true);
    assert.equal(stopwatch.elapsed(3500), 2500);
    stopwatch.stop(4000);
    assert.equal(stopwatch.running, false);
    assert.equal(stopwatch.elapsed(60000), 3000);
    stopwatch.start(10000);
    assert.equal(stopwatch.elapsed(10500), 3500);
    // Started again while running, it carries on from the first start.
    stopwatch.start(11000);
    assert.equal(stopwatch.elapsed(12000), 5000);
});

test('a stopwatch resets only once stopped', () => {
    const stopwatch = new Stopwatch();
    stopwatch.start(0);
    stopwatch.reset();
    assert.equal(stopwatch.elapsed(2000), 2000);
    stopwatch.stop(2000);
    stopwatch.reset();
    assert.equal(stopwatch.elapsed(9000), 0);
});

test('a stopwatch never runs backwards when the wall clock is put back', () => {
    const stopwatch = new Stopwatch();
    stopwatch.start(1000);
    stopwatch.stop(4000);
    stopwatch.start(10000);
    assert.equal(stopwatch.elapsed(9000), 3000);
});

test('a stopwatch saved and taken up again is where it was, running or not', () => {
    const running = new Stopwatch();
    running.start(1000);
    const again = Stopwatch.fromJSON(JSON.parse(JSON.stringify(running)));
    assert.equal(again.running, true);
    assert.equal(again.elapsed(61000), 60000);

    const stopped = new Stopwatch();
    stopped.start(0);
    stopped.stop(1234);
    assert.deepEqual(Stopwatch.fromJSON(JSON.parse(JSON.stringify(stopped))).toJSON(), stopped.toJSON());
});

test('a stopwatch from nothing saved, or something garbled, is at nothing', () => {
    [null, undefined, 'x', {}, {running: true, banked: -1, startedAt: 0}, {running: true, banked: NaN, startedAt: 0},
     {running: true, banked: 0, startedAt: '5'}].forEach((saved) => {
        const stopwatch = Stopwatch.fromJSON(saved);
        assert.equal(stopwatch.running, false);
        assert.equal(stopwatch.elapsed(1e12), 0);
    });
});

test('at nothing, the stopwatch shows 00 over 00, and no hundredths', () => {
    expectFace(0, false, `
        ···················
        ···················
        ···················
        ·····●●●···●●●·····
        ····●···●·●···●····
        ····●···●·●···●····
        ····●···●·●···●····
        ····●···●·●···●····
        ····●···●·●···●····
        ·····●●●···●●●·····
        ···················
        ······○○○·○○○······
        ······○·○·○·○······
        ······○·○·○·○······
        ······○·○·○·○······
        ······○○○·○○○······
        ···················
        ···················
        ···················`);
});

test('running, the stopwatch shows its minutes over its seconds, and nothing finer', () => {
    expectFace(at(12, 34, 56), true, `
        ···················
        ···················
        ···················
        ······●····●●●·····
        ·····●●···●···●····
        ······●·······●····
        ······●····●●●·····
        ······●···●········
        ······●···●········
        ·····●●●··●●●●●····
        ···················
        ······○○○·○·○······
        ········○·○·○······
        ·······○○·○○○······
        ········○···○······
        ······○○○···○······
        ···················
        ···················
        ···················`);
});

test('stopped, the stopwatch shows its hundredths after its seconds', () => {
    expectFace(at(12, 34, 56), false, `
        ···················
        ···················
        ···················
        ······●····●●●·····
        ·····●●···●···●····
        ······●·······●····
        ······●····●●●·····
        ······●···●········
        ······●···●········
        ·····●●●··●●●●●····
        ···················
        ·○○○·○·○···○○○·○○○·
        ···○·○·○···○···○···
        ··○○·○○○···○○○·○○○·
        ···○···○·····○·○·○·
        ·○○○···○·○·○○○·○○○·
        ···················
        ···················
        ···················`);
});

test('from a hundred minutes the stopwatch shows three figures of them', () => {
    expectFace(at(123, 5, 7), false, `
        ···················
        ···················
        ···················
        ···●····●●●···●●●··
        ··●●···●···●·●···●·
        ···●·······●·····●·
        ···●····●●●····●●··
        ···●···●·········●·
        ···●···●·····●···●·
        ··●●●··●●●●●··●●●··
        ···················
        ·○○○·○○○···○○○·○○○·
        ·○·○·○·····○·○···○·
        ·○·○·○○○···○·○···○·
        ·○·○···○···○·○···○·
        ·○○○·○○○·○·○○○···○·
        ···················
        ···················
        ···················`);
});

// A move carries one stone off a point and onto another, so a change of
// face takes as many moves as the more of the stones it adds and those it
// takes away.
function movesBetween(from, to) {
    let adds = 0;
    let removes = 0;
    for (let i = 0; i < from.length; ++i) {
        if (from[i] != to[i]) {
            adds += to[i] != 0 ? 1 : 0;
            removes += from[i] != 0 ? 1 : 0;
        }
    }
    return Math.max(adds, removes);
}

test('each second of a running stopwatch asks no more of the hands than the jumping hour face', () => {
    // That face's seconds are the same tiny figures, and the slow hands
    // just about keep up with them: some four moves a second on average,
    // eight at the most, when the tens turn over too. (Within a minute:
    // its turn changes the minutes too, once a minute.)
    const perSecond = (face, seconds) => {
        const moves = [];
        seconds.forEach((s) => moves.push(movesBetween(face(s), face(s + 1))));
        return moves;
    };
    const seconds = [...Array(3600).keys()].filter((s) => (s + 1) % 60 != 0);
    const stopwatch = perSecond((s) => stopwatchFace(s*1000, true), seconds);
    const jumpingHour = perSecond((s) => faceFor(JUMPING_HOUR, {hours: 3, minutes: 7, seconds: s % 60}), seconds);
    const mean = (moves) => moves.reduce((a, b) => a + b)/moves.length;
    assert.ok(Math.max(...stopwatch) <= 8, `${Math.max(...stopwatch)} moves in a second`);
    assert.ok(mean(stopwatch) <= mean(jumpingHour), `${mean(stopwatch).toFixed(2)} moves a second on average`);
});

test('the clock shows the stopwatch while it has one, and looks again as its seconds turn', () => {
    const clock = new GoClock();
    const stopwatch = new Stopwatch();
    stopwatch.start(Date.now() - at(12, 34, 56));
    clock.stopwatch = stopwatch;
    clock.update();
    assert.deepEqual(clock.stones, stopwatchFace(stopwatch.elapsed(), true));
    // Its seconds turn a little more than 440 ms on, whatever the time's do.
    const tick = clock.nextTick();
    assert.ok(tick > 400 && tick <= 445, `${tick} ms`);

    stopwatch.stop();
    clock.update();
    assert.deepEqual(clock.stones, stopwatchFace(stopwatch.elapsed(), false));

    clock.stopwatch = null;
    clock.update(0, 0, 0);
    assert.notDeepEqual(clock.stones, stopwatchFace(stopwatch.elapsed(), false));
});
