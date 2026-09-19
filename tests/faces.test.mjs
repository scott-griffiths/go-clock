// The clock faces, and the bits of the hand's arithmetic that need no
// page. Run with `node --test tests/`; nothing to install.
//
// Each face is checked at the awkward times — midnight in 12-hour mode,
// noon, the last second of the day, hands lying over each other — against
// a picture of the board: ● black, ○ white, · empty. A wrong picture is
// easier to read than a wrong list of indices.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GoClock} from '../www/go-clock.js';
import {faceFor, ANALOGUE, JUMPING_HOUR, DIGITAL, HYBRID, hourMarkers} from '../www/faces.js';
import {nearestFreePoint} from '../www/board.js';

function face(view, time, twentyFourHour = true) {
    const [hours, minutes, seconds = 0] = time.split(':').map(Number);
    return faceFor(view, {hours, minutes, seconds}, twentyFourHour);
}

function picture(stones) {
    const rows = [];
    for (let y = 0; y < 19; y++) {
        rows.push(stones.slice(y*19, y*19 + 19).map((v) => ({0: '·', 1: '○', 3: '●'})[v] ?? '?').join(''));
    }
    return rows.join('\n');
}

function expectFace(view, time, twentyFourHour, expected) {
    assert.equal(picture(face(view, time, twentyFourHour)), expected.trim().split('\n').map((row) => row.trim()).join('\n'));
}

test('digital, 24-hour, five past midnight shows 00:05', () => {
    expectFace(DIGITAL, '00:05', true, `
        ···················
        ····●●●●···●●●●····
        ···●····●·●····●···
        ···●····●·●····●···
        ···●····●·●····●···
        ···●····●·●····●···
        ···●····●·●····●···
        ···●····●·●····●···
        ···●····●·●····●···
        ····●●●●···●●●●····
        ···················
        ·····○○○··○○○○○····
        ····○···○·○········
        ····○···○·○○○○·····
        ····○···○·····○····
        ····○···○·····○····
        ····○···○·○···○····
        ·····○○○···○○○·····
        ···················`);
});

test('digital, 12-hour, five past midnight shows 12:05', () => {
    expectFace(DIGITAL, '00:05', false, `
        ···················
        ······●····●●●●····
        ·····●●···●····●···
        ····●·●········●···
        ······●········●···
        ······●····●●●●····
        ······●···●········
        ······●···●········
        ······●···●········
        ····●●●●●·●●●●●●···
        ···················
        ·····○○○··○○○○○····
        ····○···○·○········
        ····○···○·○○○○·····
        ····○···○·····○····
        ····○···○·····○····
        ····○···○·○···○····
        ·····○○○···○○○·····
        ···················`);
});

test('digital, 12-hour, a single-digit hour is centred', () => {
    expectFace(DIGITAL, '01:05', false, `
        ···················
        ·········●·········
        ········●●·········
        ·······●·●·········
        ·········●·········
        ·········●·········
        ·········●·········
        ·········●·········
        ·········●·········
        ·······●●●●●·······
        ···················
        ·····○○○··○○○○○····
        ····○···○·○········
        ····○···○·○○○○·····
        ····○···○·····○····
        ····○···○·····○····
        ····○···○·○···○····
        ·····○○○···○○○·····
        ···················`);
});

test('digital, 24-hour, eleven minutes past eleven', () => {
    expectFace(DIGITAL, '11:11', true, `
        ···················
        ······●·····●······
        ·····●●····●●······
        ····●·●···●·●······
        ······●·····●······
        ······●·····●······
        ······●·····●······
        ······●·····●······
        ······●·····●······
        ····●●●●●·●●●●●····
        ···················
        ······○·····○······
        ·····○○····○○······
        ······○·····○······
        ······○·····○······
        ······○·····○······
        ······○·····○······
        ·····○○○···○○○·····
        ···················`);
});

test('hybrid, 24-hour, the last second of the day', () => {
    expectFace(HYBRID, '23:59:59', true, `
        ···················
        ·●●●·●●●···●●●·●●●·
        ···●···●·●·●···●·●·
        ·●●●··●●···●●●·●●●·
        ·●·····●·●···●···●·
        ·●●●·●●●···●●●·●●●·
        ·········○·········
        ······●·····○······
        ·········○·········
        ····○····○····○····
        ·········○·········
        ·········○·········
        ···○·····○·····○···
        ···················
        ···················
        ····○·········○····
        ···················
        ······○·····○······
        ·········○·········`);
});

test('hybrid, 12-hour, noon on the second', () => {
    expectFace(HYBRID, '12:00:00', false, `
        ···················
        ···●·●●●···●●●·●●●·
        ···●···●·●·●·●·●·●·
        ···●·●●●···●·●·●·●·
        ···●·●···●·●·●·●·●·
        ···●·●●●···●●●·●●●·
        ·········●·········
        ······○·····○······
        ·········○·········
        ····○····○····○····
        ·········○·········
        ·········○·········
        ···○·····○·····○···
        ···················
        ···················
        ····○·········○····
        ···················
        ······○·····○······
        ·········○·········`);
});

test('analogue, 12-hour, midnight: both hands straight up, the hour hand over the minute hand', () => {
    expectFace(ANALOGUE, '00:00:00', false, `
        ···················
        ·········●·········
        ·····●···○···●·····
        ·········○·········
        ·········○·········
        ··●······●······●··
        ·········●·········
        ·········●·········
        ·········●·········
        ·●·······●·······●·
        ···················
        ···················
        ···················
        ··●·············●··
        ···················
        ···················
        ·····●·······●·····
        ·········●·········
        ···················`);
});

test('jumping hour, 12-hour, 12:34:56 lights the twelve o\'clock marker', () => {
    expectFace(JUMPING_HOUR, '12:34:56', false, `
        ···················
        ·········○·········
        ·····●·······●·····
        ···················
        ······●●●·●·●······
        ··●·····●·●·●···●··
        ·······●●·●●●······
        ········●···●······
        ······●●●···●······
        ·●···············●·
        ······○○○·○○○······
        ······○···○········
        ······○○○·○○○······
        ··●·····○·○·○···●··
        ······○○○·○○○······
        ···················
        ·····●·······●·····
        ·········●·········
        ···················`);
});

test('every face, every minute of the day, in both modes: 361 points of empty, white or black', () => {
    for (const view of [ANALOGUE, JUMPING_HOUR, DIGITAL, HYBRID]) {
        for (const twentyFourHour of [true, false]) {
            for (let hours = 0; hours < 24; hours++) {
                for (let minutes = 0; minutes < 60; minutes++) {
                    const stones = face(view, `${hours}:${minutes}:33`, twentyFourHour);
                    assert.equal(stones.length, 361, `view ${view} at ${hours}:${minutes} wrote off the board`);
                    assert.ok(stones.every((v) => v === 0 || v === 1 || v === 3), `view ${view} at ${hours}:${minutes} has an odd stone`);
                }
            }
        }
    }
});

test('the jumping hour marker is the hour on the clock face, in either mode', () => {
    // The markers run clockwise from twelve o'clock; the lit one is white.
    for (let hours = 0; hours < 24; hours++) {
        for (const twentyFourHour of [true, false]) {
            const stones = face(JUMPING_HOUR, `${hours}:00`, twentyFourHour);
            const lit = hourMarkers.map(([x, y], i) => stones[y*19 + x] === 1 ? i : -1).filter((i) => i >= 0);
            assert.deepEqual(lit, [hours % 12], `${hours}:00 lit marker ${lit}`);
        }
    }
});

test('the clock asks for the face of the moment, in its own mode', () => {
    const clock = new GoClock();
    clock.view = DIGITAL;
    clock.twenty_four_hour = false;
    clock.update(7, 5, 0);
    assert.deepEqual(clock.stones, face(DIGITAL, '00:05:07', false));
});

test('the hand takes the nearest free point, however crowded the corner', () => {
    // Everything the old five-by-five search window could see, taken.
    const taken = new Set();
    for (let y = 0; y <= 2; y++) {
        for (let x = 0; x <= 2; x++) {
            taken.add(x + 19*y);
        }
    }
    assert.equal(nearestFreePoint([0.3, 0.2], taken), 3);
    assert.equal(nearestFreePoint([5.4, 7.6], new Set()), 5 + 19*8);
    const everything = new Set(Array.from({length: 361}, (_, i) => i));
    assert.equal(nearestFreePoint([9, 9], everything), -1);
});
