// The magic speed (magic.js) lets a finger or a sweep take over the
// stones it has in the air (dropMagicStones). A stone it means to fetch
// from the table is taken off the table's list the moment the flight is
// planned, though it lies where it is until its turn in the stagger comes
// round: called off before then, it must go back on the list, or it lies
// on the table for good with nothing that knows it is there - seen, but
// never moved or used again.

import {test} from 'node:test';
import assert from 'node:assert/strict';

// Only what dropMagicStones reaches for: the goban's box, and timers.
globalThis.document = {querySelector: () => ({getBoundingClientRect: () => ({left: 0, top: 0})})};
globalThis.window = globalThis;

const {dropMagicStones} = await import('../www/magic.js');

function tableEntry(x) {
    return {element: {}, colour: 1, src: 'white.png', x, y: 900, lift: 0, coords: [x, 20]};
}

test('a table stone still waiting to be fetched goes back on the table when the flights are dropped', () => {
    const waiting = tableEntry(100);
    const lying = tableEntry(300);
    const clock = {
        goban_width: 700,
        table_stones: [lying],
        magic_flights: [{kind: 'table', entry: waiting, to: 40, colour: 1, timeoutId: setTimeout(() => {}, 10000)}],
        idle_timer: null
    };
    const dropped = dropMagicStones(clock);
    assert.deepEqual(dropped, []);
    assert.deepEqual(clock.magic_flights, []);
    assert.equal(clock.table_stones.length, 2);
    assert.ok(clock.table_stones.includes(waiting));
    assert.ok(clock.table_stones.includes(lying));
});

test('a stone still waiting to leave its point is simply left there', () => {
    const clock = {
        goban_width: 700,
        table_stones: [],
        magic_flights: [{kind: 'away', from: 40, colour: 1, timeoutId: setTimeout(() => {}, 10000)}],
        idle_timer: null
    };
    assert.deepEqual(dropMagicStones(clock), []);
    assert.deepEqual(clock.table_stones, []);
});
