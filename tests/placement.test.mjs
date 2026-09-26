// A stone left far off its point: strayed at a quarter of a point or
// more, put back by the hand when there is nothing else to do; nearer
// than that, left where it lies.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isStray, strayPlan, strayRadius, setLandingOffset, settleAfterLanding} from '../www/placement.js';
import {emptyBoard, pointIndex, white, black, gridsize} from '../www/board.js';

const at = (x, y) => pointIndex(x, y);

function clock(stones) {
    const offsets = Array.from({length: gridsize*gridsize}, () => [0, 0]);
    const stones_shown = emptyBoard();
    stones.forEach(([x, y, colour, offset]) => {
        stones_shown[at(x, y)] = colour;
        offsets[at(x, y)] = offset;
    });
    return {
        stones_shown,
        offsets,
        placement: 1,
        get_coords(p) {
            return [p % gridsize + offsets[p][0], Math.floor(p/gridsize) + offsets[p][1]];
        }
    };
}

test('a stone a quarter of a point or more off its point has strayed; one nearer has not', () => {
    const c = clock([[3, 3, white, [0.15, 0.15]], [5, 5, black, [0, strayRadius]], [7, 7, white, [0.24, 0]], [8, 8, black, [0.2, 0.2]]]);
    assert.equal(isStray(c, at(3, 3)), false);
    assert.equal(isStray(c, at(5, 5)), true);
    assert.equal(isStray(c, at(7, 7)), false);
    assert.equal(isStray(c, at(8, 8)), true);
    assert.equal(isStray(c, at(9, 9)), false, 'an empty point');
});

test('the hand puts back the strayed stone nearest it, lifted, as far as it lies off', () => {
    const c = clock([[2, 2, white, [1.2, 0]], [10, 9, black, [0, -0.8]], [12, 12, white, [0.1, 0]]]);
    assert.deepEqual(strayPlan(c, {position: at(9, 9)}), {kind: 'move', from: at(10, 9), to: at(10, 9), lift: true, distance: 0.8});
});

test('nothing strayed, or only on another hand\'s points: no move', () => {
    const c = clock([[4, 4, white, [0.2, 0.1]], [6, 6, black, [0.9, 0]]]);
    assert.equal(strayPlan(c, {position: at(9, 9)}, new Set([at(6, 6)])), null);
    assert.equal(strayPlan(clock([[4, 4, white, [0.2, 0.1]]]), {position: at(9, 9)}), null);
});

test('no precision puts a stone down strayed, however hard its landing is nudged', () => {
    [0, 1, 2].forEach((placement) => {
        const c = clock([[9, 9, white, [0, 0]], [10, 9, white, [0, 0]]]);
        c.placement = placement;
        c.speed = 1000;
        c.updateBoardPosition = () => {};
        for (let n = 0; n < 500; ++n) {
            setLandingOffset(c, at(9, 9));
            settleAfterLanding(c, at(9, 9));
            assert.equal(isStray(c, at(9, 9)), false, `placement ${placement}: landed at ${c.offsets[at(9, 9)]}`);
            assert.equal(isStray(c, at(10, 9)), false, `placement ${placement}: nudged to ${c.offsets[at(10, 9)]}`);
        }
    });
});
