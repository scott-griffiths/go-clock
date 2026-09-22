// The hand under stress: a board packed with stones, near the end of a
// replay, with a finger swept fast and often across all of them at once.
// physics.js already has the stone simulation's own tests; this measures
// pushStones (hand.js), which each animation frame asks to clear the
// finger's path however far the pointer has moved since the last frame
// the page managed to draw - the more stones are piled in its way, the
// more there is for it to do before the next frame can show.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {StoneWorld, flatBoard} from '../www/physics.js';
import {pushStones} from '../www/hand.js';
import {gridsize, minx, maxx, miny, maxy} from '../www/board.js';

// A goban about as wide as a tablet screen, sized the way go-clock.js
// sizes one (fingerRadius, boardRect): only the proportions matter here.
const goban_width = 700;
const goban_height = goban_width*857/800 | 0;
const board = {left: 0, top: 0, right: goban_width, bottom: goban_height};
const screen = {right: goban_width, bottom: goban_height};
const diameter = goban_width/20;
const radius = goban_width/16;
// A comfortable animation frame, and the number the codebase already
// treats as the edge of one (hand.js and sweep.js both subdivide a
// physics step past this many seconds).
const frameBudgetMs = 16;
const frame = 1/60;

// The pixel centre of grid point (ix, iy), as go-clock.js lays the board
// out (pixelForCoords), with the goban's top left at the origin.
function pointPixel(ix, iy) {
    return [
        minx*goban_width + ix*(maxx - minx)*goban_width/(gridsize - 1),
        miny*goban_height + iy*(maxy - miny)*goban_height/(gridsize - 1)
    ];
}

// A board `fill` full of stones (0 to 1), set on its points as they lie
// at rest: as near the end of a long game as the clock ever shows one.
function packedWorld(fill) {
    const world = new StoneWorld({board, screen, diameter, onBoard: flatBoard, edgeKick: diameter*5});
    const wanted = Math.floor(gridsize*gridsize*fill);
    let count = 0;
    for (let iy = 0; iy < gridsize && count < wanted; ++iy) {
        for (let ix = 0; ix < gridsize && count < wanted; ++ix, ++count) {
            const [x, y] = pointPixel(ix, iy);
            world.add({
                x, y, r: diameter/2, vx: 0, vy: 0, colour: count%2,
                asleep: false, offBoard: false, landed: false, falling: false, gone: false, leftAt: 0
            });
        }
    }
    return world;
}

// One animation frame: the finger eases from (fromX, fromY) to
// (toX, toY) (pushStones, hand.js), and the world moves on `frame`
// seconds behind it (as hand.js's step() does). Returns how long that
// took, in ms.
function timeFrame(world, fromX, fromY, toX, toY) {
    const started = performance.now();
    pushStones(world, radius, diameter, fromX, fromY, toX, toY, frame);
    world.advance(frame);
    return performance.now() - started;
}

// Six full-width sweeps, alternating direction, each caught up in a
// single animation frame: as if a replay had just ended, quite full, and
// a finger was clearing it in a hurry, faster than the page could keep
// drawing frames for.
function fastSweeps(world) {
    const y = (board.top + board.bottom)/2;
    const timings = [];
    let x = board.left;
    for (let sweep = 0; sweep < 6; ++sweep) {
        const toX = sweep%2 === 0 ? board.right : board.left;
        timings.push(timeFrame(world, x, y, toX, y));
        x = toX;
    }
    return timings;
}

test('a finger swept fast, back and forth, across a packed board leaves every stone in a sane place, and how long it all took', (t) => {
    const world = packedWorld(0.85);
    const timings = fastSweeps(world);
    world.stones.forEach((stone) => {
        assert.ok(Number.isFinite(stone.x) && Number.isFinite(stone.y), `a stone ended up at (${stone.x}, ${stone.y})`);
        assert.ok(Number.isFinite(stone.vx) && Number.isFinite(stone.vy), `a stone ended up going at (${stone.vx}, ${stone.vy})`);
    });
    const worst = Math.max(...timings);
    const total = timings.reduce((a, b) => a + b, 0);
    t.diagnostic(`${world.stones.length} stones, ${timings.length} full-width frames: `
        + `worst ${worst.toFixed(2)}ms, average ${(total/timings.length).toFixed(2)}ms, total ${total.toFixed(2)}ms`);
});

// collide() (physics.js) is bucketed by a grid rather than checking every
// stone against every other, and pushStones only pays for the expensive
// neighbour-propagating passes (settleStones, hand.js) once a frame
// rather than once a substep: a regression in either shows up here.
test('a single caught-up frame - the whole board width, gone in one go - fits a frame budget', (t) => {
    const world = packedWorld(0.85);
    const elapsed = timeFrame(world, board.left, (board.top + board.bottom)/2, board.right, (board.top + board.bottom)/2);
    t.diagnostic(`${world.stones.length} stones, one full-width frame: ${elapsed.toFixed(2)}ms (budget ${frameBudgetMs}ms)`);
    assert.ok(elapsed < frameBudgetMs, `took ${elapsed.toFixed(2)}ms, wanted under ${frameBudgetMs}ms`);
});
