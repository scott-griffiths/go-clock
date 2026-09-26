// The hand's next move, for each kind of difference between the board and
// the face: a stone from the bowl, a spare slid or lifted over, two stones
// changing places, a stone to the bowl, a stone from the table; the
// hand's own position deciding between stones; and chance between equals.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planMove, routeIsClear} from '../www/planner.js';
import {emptyBoard, pointIndex, white, black} from '../www/board.js';

function boards(shownStones, wantedStones) {
    const shown = emptyBoard();
    const wanted = emptyBoard();
    shownStones.forEach(([x, y, colour]) => { shown[pointIndex(x, y)] = colour; });
    wantedStones.forEach(([x, y, colour]) => { wanted[pointIndex(x, y)] = colour; });
    return {shown, wanted};
}

const at = (x, y) => pointIndex(x, y);

test('a board that is right needs nothing', () => {
    const {shown, wanted} = boards([[3, 3, black]], [[3, 3, black]]);
    assert.equal(planMove({shown, wanted, hand: at(9, 9)}), null);
});

test('a stone wanted where there is none comes from the bowl', () => {
    const {shown, wanted} = boards([], [[4, 5, white]]);
    assert.deepEqual(planMove({shown, wanted, hand: at(9, 9)}), {kind: 'add', to: at(4, 5), colour: white});
});

test('a stone nobody wants goes to the bowl', () => {
    const {shown, wanted} = boards([[4, 5, white]], []);
    assert.deepEqual(planMove({shown, wanted, hand: at(9, 9)}), {kind: 'remove', from: at(4, 5)});
});

test('a spare stone slides to where its colour is wanted', () => {
    const {shown, wanted} = boards([[4, 5, white]], [[7, 5, white]]);
    assert.deepEqual(planMove({shown, wanted, hand: at(9, 9)}), {kind: 'move', from: at(4, 5), to: at(7, 5), lift: false});
});

test('a spare stone is lifted over one in its way', () => {
    const {shown, wanted} = boards([[4, 5, white], [6, 5, black]], [[7, 5, white], [6, 5, black]]);
    assert.deepEqual(planMove({shown, wanted, hand: at(9, 9)}), {kind: 'move', from: at(4, 5), to: at(7, 5), lift: true});
});

test('a long move is a lift', () => {
    const {shown, wanted} = boards([[2, 2, white]], [[12, 2, white]]);
    assert.equal(planMove({shown, wanted, hand: at(9, 9)}).lift, true);
    assert.equal(routeIsClear(shown, at(2, 2), at(12, 2)), false);
});

test('of two spares, the one nearer the hand goes', () => {
    const {shown, wanted} = boards([[1, 1, white], [17, 17, white]], [[9, 9, white], [1, 1, white]]);
    // Both are white, both spare in a sense; the face wants (1, 1) kept.
    assert.deepEqual(planMove({shown, wanted, hand: at(16, 16)}), {kind: 'move', from: at(17, 17), to: at(9, 9), lift: true});
});

test('a stone of the wrong colour goes where its colour is wanted, before the bowl is troubled', () => {
    const {shown, wanted} = boards([[4, 5, white]], [[4, 5, black], [6, 5, white]]);
    assert.deepEqual(planMove({shown, wanted, hand: at(9, 9)}), {kind: 'move', from: at(4, 5), to: at(6, 5), lift: false});
});

test('two stones each on the other\'s point change places', () => {
    const {shown, wanted} = boards([[4, 5, white], [6, 5, black]], [[4, 5, black], [6, 5, white]]);
    const plan = planMove({shown, wanted, hand: at(3, 5)});
    assert.equal(plan.kind, 'swap');
    assert.equal(plan.source, at(4, 5));
    assert.equal(plan.target, at(6, 5));
});

test('a stone on the table is used when it is nearer than a spare on the board', () => {
    const {shown, wanted} = boards([[1, 1, white]], [[9, 18, white], [1, 1, white]]);
    const table = [{colour: white, coords: [9, 20]}];
    const nearTheHeap = planMove({shown, wanted, hand: at(9, 18), tableStones: table});
    assert.equal(nearTheHeap.kind, 'table');
    assert.equal(nearTheHeap.entry, table[0]);
    assert.equal(nearTheHeap.to, at(9, 18));
});

test('a stone on the table of the wrong colour is no use', () => {
    const {shown, wanted} = boards([], [[9, 18, white]]);
    const plan = planMove({shown, wanted, hand: at(9, 18), tableStones: [{colour: black, coords: [9, 20]}]});
    assert.equal(plan.kind, 'add');
});

test('equally good moves are each taken, by chance, about as often as each other', () => {
    // Four wanted points around the hand, all the same way off: the four
    // bowl stones are equally good, and none is the favourite.
    const {shown, wanted} = boards([], [[9, 5, white], [9, 13, white], [5, 9, white], [13, 9, white]]);
    const counts = new Map();
    for (let n = 0; n < 4000; ++n) {
        const plan = planMove({shown, wanted, hand: at(9, 9)});
        counts.set(plan.to, (counts.get(plan.to) || 0) + 1);
    }
    assert.deepEqual([...counts.keys()].sort((a, b) => a - b), [at(9, 5), at(5, 9), at(13, 9), at(9, 13)].sort((a, b) => a - b));
    counts.forEach((count) => assert.ok(count > 800 && count < 1200, `taken ${count} times in 4000`));
});

test('chance only decides between equals: the nearer is always taken', () => {
    const {shown, wanted} = boards([], [[9, 6, white], [9, 13, white], [5, 9, white]]);
    for (let n = 0; n < 200; ++n) {
        assert.equal(planMove({shown, wanted, hand: at(9, 9)}).to, at(9, 6));
    }
});

test('with the chance fixed, the choice between equals is fixed too', () => {
    const {shown, wanted} = boards([[4, 9, white], [14, 9, white]], [[9, 4, white], [9, 14, white]]);
    const first = planMove({shown, wanted, hand: at(9, 9), random: () => 0.99});
    const last = planMove({shown, wanted, hand: at(9, 9), random: () => 0});
    assert.notDeepEqual(first, last);
    assert.deepEqual(planMove({shown, wanted, hand: at(9, 9), random: () => 0.99}), first);
});
