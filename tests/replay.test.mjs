// A game replayed: its positions, a capture being two (the stone down,
// then the captured stones off); and its stones planned onto the board on
// an even beat, each setting off as long before its moment as its own
// flight takes, from the nearest stone of its colour on the table or else
// the bowl.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gameStages, stageOfMove, movesShown, planPlacements, flightsToCallOff} from '../www/replay.js';
import {playGame} from '../www/sgf.js';
import {pointIndex, white, black} from '../www/board.js';

const at = (x, y) => pointIndex(x, y);

// Black takes a white stone in a ko: white at (4,4) is surrounded but
// for (5,4), which black then plays.
const koMoves = playGame([
    {colour: black, point: at(3, 4)}, {colour: white, point: at(4, 4)},
    {colour: black, point: at(4, 3)}, {colour: white, point: at(5, 3)},
    {colour: black, point: at(4, 5)}, {colour: white, point: at(5, 5)},
    {colour: black, point: at(6, 6)}, {colour: white, point: at(6, 4)},
    {colour: black, point: at(5, 4)}, // takes (4,4)
    {colour: white, point: at(10, 10)}
]);
const stages = gameStages(koMoves);

// A table stone's flight takes longer than a bowl stone's.
const travel = (entry) => (entry ? 900 : 500);

function plan(fields) {
    return planPlacements({stages, moves: koMoves, stage: 0, nextLandAt: 0, now: 0, rate: 2, tableStones: [], travel, ...fields});
}

test('a capture is a position with the stone down and then one with the captured stones off', () => {
    assert.equal(stages.length, koMoves.length + 1);
    assert.equal(stages[8].board[at(4, 4)], white);
    assert.equal(stages[8].stoneMore, true);
    assert.equal(stages[9].board[at(4, 4)], 0);
    assert.equal(stages[9].stoneMore, false);
});

test('each stage knows its move, and a move\'s last stage is the one with its captures off', () => {
    assert.equal(stages[8].move, 8);
    assert.equal(stages[9].move, 8);
    assert.equal(stages[10].move, 9);
    assert.equal(stageOfMove(stages, -1), -1);
    assert.equal(stageOfMove(stages, 0), 0);
    assert.equal(stageOfMove(stages, 8), 9);
    assert.equal(stageOfMove(stages, 9), 10);
});

test('the moves shown are those of the position reached, or of the one being sought', () => {
    const game = {stages};
    assert.equal(movesShown({game, stage: 0, seeking: null}), 0);
    assert.equal(movesShown({game, stage: 10, seeking: null}), 9);
    assert.equal(movesShown({game, stage: 3, seeking: 9}), 9);
});

test('the stones land on an even beat, at every rate', () => {
    [1, 2, 3, 4].forEach((rate) => {
        const {plans} = plan({rate, now: 0, nextLandAt: 0});
        assert.ok(plans.length >= 2, `rate ${rate}: ${plans.length} planned`);
        const first = plans[0].landAt;
        plans.forEach((p, i) => assert.ok(Math.abs(p.landAt - (first + i*1000/rate)) < 1e-6, `rate ${rate}, stone ${i}: ${p.landAt}`));
    });
});

test('each stone sets off its own flight\'s time before it lands', () => {
    const table = [{colour: black, coords: [3, 20]}];
    const {plans} = plan({tableStones: table});
    plans.forEach((p) => assert.equal(p.landAt - p.departAt, p.entry ? 900 : 500));
    assert.equal(plans[0].entry, table[0], 'the black stone comes from the table');
    assert.equal(plans[1].entry, null, 'no white on the table: from the bowl');
});

test('a slower flight sets off first though it lands after: black from the table, white from the bowl', () => {
    // Black's second stone from the table (900 ms), white's before it
    // from the bowl (500 ms), at 4 a second: black lands after white
    // but sets off before it.
    const table = [{colour: black, coords: [3, 20]}, {colour: black, coords: [15, 20]}];
    const {plans} = plan({rate: 4, tableStones: table});
    const white1 = plans[1];
    const black2 = plans[2];
    assert.equal(white1.move.colour, white);
    assert.equal(black2.move.colour, black);
    assert.ok(black2.entry, 'from the table');
    assert.ok(black2.landAt > white1.landAt, 'lands after');
    assert.ok(black2.departAt < white1.departAt, 'sets off before');
});

test('the first stone lands as soon as its flight allows, and never before the next moment due', () => {
    assert.equal(plan({now: 1000, nextLandAt: 0}).plans[0].landAt, 1500);
    assert.equal(plan({now: 1000, nextLandAt: 2200}).plans[0].landAt, 2200);
});

test('the nearest table stone of the colour is taken, each once, then the bowl', () => {
    const near = {colour: black, coords: [3, 5.5]};
    const far = {colour: black, coords: [18, 20]};
    const {plans} = plan({rate: 4, tableStones: [far, near]});
    const blacks = plans.filter((p) => p.move.colour == black);
    assert.equal(blacks[0].entry, near);
    assert.equal(blacks[1].entry, far);
    assert.ok(blacks.slice(2).every((p) => p.entry === null));
});

test('only the stones landing in the next few seconds are planned; the rest when their turn comes', () => {
    const {plans, stage, nextLandAt} = plan({rate: 1});
    assert.ok(plans.every((p) => p.landAt - plans[0].landAt <= 5000));
    assert.ok(stage < stages.length);
    const later = plan({rate: 1, stage, nextLandAt, now: nextLandAt - 1000});
    assert.equal(later.plans[0].stage, stage);
    assert.equal(later.plans[0].landAt, nextLandAt);
});

test('a capture\'s stones coming off is no stone of its own: the next move follows on the beat', () => {
    const {plans} = plan({rate: 4, stage: 8, now: 0, nextLandAt: 0});
    assert.deepEqual(plans.map((p) => p.stage), [8, 10]);
    assert.equal(plans[1].landAt - plans[0].landAt, 250);
});

test('each flight is as long at every beat: a faster beat has more stones in the air at once', () => {
    // Every stone from the table, the further the longer, at one pace.
    const table = [black, white].flatMap((colour) => Array.from({length: 6}, (_, i) => ({colour, coords: [i*3, 20]})));
    const pace = (entry, point) => (entry ? 300 + 125*Math.hypot(entry.coords[0] - point % 19, entry.coords[1] - Math.floor(point/19)) : 500);
    const flights = new Map();
    const inAir = (plans) => Math.max(...plans.map((p) => plans.filter((q) => q.departAt <= p.landAt && q.landAt >= p.landAt).length));
    const slow = plan({rate: 1, tableStones: table, travel: pace, random: () => 0.99});
    const fast = plan({rate: 4, tableStones: table, travel: pace, random: () => 0.99});
    slow.plans.forEach((p) => flights.set(p.stage, p.landAt - p.departAt));
    fast.plans.forEach((p) => {
        if (flights.has(p.stage)) {
            assert.equal(p.landAt - p.departAt, flights.get(p.stage), `stage ${p.stage}`);
        }
    });
    assert.ok(inAir(fast.plans) > inAir(slow.plans), `${inAir(fast.plans)} in the air at 4 a second, ${inAir(slow.plans)} at 1`);
});

test('starting afresh, the first stone waits so that none after it is late for its beat', () => {
    // The third stone has a long way to come; the first two are quick.
    const long = (entry) => (entry ? 3000 : 400);
    const table = [{colour: black, coords: [18, 22]}];
    const {plans} = plan({rate: 2, tableStones: [], travel: long, stage: 0, now: 0});
    const withTable = plan({rate: 2, tableStones: table, travel: long, stage: 1, now: 0});
    // Stage 1 is white (bowl), stage 2 black (from the table, 3 s).
    assert.equal(withTable.plans[1].entry, table[0]);
    withTable.plans.forEach((p, i) => {
        assert.equal(p.landAt, withTable.plans[0].landAt + i*500, `stone ${i} on the beat`);
        assert.ok(p.departAt >= 0, `stone ${i} sets off from now at the earliest`);
    });
    assert.equal(withTable.plans[1].departAt, 0, 'the long flight sets off at once, and the rest are timed from it');
    assert.equal(plans[0].landAt, 400);
});

test('a change of beat keeps every stone up to the last already flying, so none is planned twice', () => {
    // Stage 5 from the bowl is still waiting; stage 6, from far across the
    // table, set off first and is flying; 7 and 8 are waiting.
    const flights = [
        {stage: 4, waiting: false},
        {stage: 5, waiting: true},
        {stage: 6, waiting: false},
        {stage: 7, waiting: true},
        {stage: 8, waiting: true},
        {waiting: false} // a captured stone going off to the bowl
    ];
    assert.deepEqual(flightsToCallOff(flights, {keepCommitted: true}).map((f) => f.stage), [7, 8]);
    // A seek or a cancel calls off everything still waiting.
    assert.deepEqual(flightsToCallOff(flights).map((f) => f.stage), [5, 7, 8]);
    assert.deepEqual(flightsToCallOff([{stage: 3, waiting: true}], {keepCommitted: true}).map((f) => f.stage), [3]);
});
