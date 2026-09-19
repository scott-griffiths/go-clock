// The stone simulation, stone by stone: a flat board slows a shoved stone
// to a stop, a stone over the edge drops and lands and stops on the table,
// the board's side keeps a table stone off, the tipped board sends its
// stones down the slope, two stones in each other's way part, and in the
// void a stone over the edge flies on, end over end, and is gone.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StoneWorld, flatBoard, spaceBoard, tippedBoard, setTumbling, isTumbling, dropTime, voidFlightTime} from '../www/physics.js';

const board = {left: 100, top: 100, right: 500, bottom: 500};
const screen = {right: 600, bottom: 800};
const diameter = 20;

function world(options = {}) {
    return new StoneWorld({board, screen, diameter, onBoard: flatBoard, ...options});
}

function stone(fields) {
    return {r: diameter/2, vx: 0, vy: 0, asleep: false, offBoard: false, landed: false, falling: false, gone: false, leftAt: 0, ...fields};
}

// Runs the world on, in the steps the page uses, until `until` or for a while.
function run(w, seconds, until = () => false) {
    for (let t = 0; t < seconds && !until(); t += 0.016) {
        w.advance(0.016);
    }
}

test('a shoved stone skids to a stop on the board, and stays on it', () => {
    const w = world();
    const s = w.add(stone({x: 300, y: 300, vx: 150, vy: 0}));
    run(w, 5, () => w.still());
    assert.ok(w.still(), 'it never stopped');
    assert.ok(s.x > 300 && s.x < board.right, `it slid to ${s.x}`);
    assert.equal(s.offBoard, false);
});

test('a stone pushed over the edge drops, lands on the table, and stops clear of the board', () => {
    const w = world({edgeKick: diameter*5});
    // Fast enough to cross the edge before the board's friction has it.
    const s = w.add(stone({x: 300, y: 495, vx: 0, vy: 600}));
    run(w, 5, () => w.still());
    assert.ok(s.offBoard, 'it stayed on the board');
    assert.ok(s.landed, 'it never landed');
    assert.ok(w.still(), 'it never stopped');
    assert.ok(s.y - s.r >= board.bottom - 1e-9, `it lies over the board's edge at ${s.y}`);
    assert.equal(s.gone, false);
});

test('the drop takes dropTime, and the shadow height follows it', () => {
    const w = world();
    const s = w.add(stone({x: 300, y: 501, vx: 0, vy: 0}));
    w.advance(0.016);
    assert.ok(s.offBoard);
    assert.ok(w.drop(s) < 1, 'still in the air');
    run(w, dropTime + 0.05);
    assert.equal(w.drop(s), 1, 'down on the table');
    assert.ok(s.landed);
});

test('the board stands proud of the table: a table stone is kept off it', () => {
    const w = world();
    // Landed, but nudged so that its centre is just over the board.
    const s = w.add(stone({x: 300, y: 498, vx: 0, vy: -40, offBoard: true, landed: true, leftAt: -1}));
    w.advance(0.016);
    assert.ok(s.y - s.r >= board.bottom - 1e-9, `over the edge at ${s.y}`);
    assert.ok(s.vy >= 0, 'still heading onto the board');
});

test('the tipped board sends its stones down the slope and off the near edge, together', () => {
    const gravity = 400*1.6;
    const w = world({onBoard: tippedBoard({gravity, gather: gravity*0.4/200}), sidesKeepOn: true});
    const a = w.add(stone({x: 150, y: 150}));
    const b = w.add(stone({x: 450, y: 150}));
    run(w, 6, () => w.onBoardCount() === 0 && w.still());
    assert.equal(w.onBoardCount(), 0, 'stones still on the board');
    assert.ok(a.landed && b.landed);
    // Gathered towards the middle: closer together than they started.
    assert.ok(Math.abs(a.x - b.x) < 300, `apart by ${Math.abs(a.x - b.x)}`);
    assert.ok(a.y > board.bottom && b.y > board.bottom);
});

test('the sides keep a stone on the tipped board', () => {
    const gravity = 400*1.6;
    const w = world({onBoard: tippedBoard({gravity, gather: 0}), sidesKeepOn: true});
    const s = w.add(stone({x: 115, y: 300, vx: -300, vy: 0}));
    w.advance(0.032);
    assert.ok(s.x - s.r >= board.left, `through the side at ${s.x}`);
    assert.ok(s.vx > 0, 'no bounce');
    assert.equal(s.offBoard, false);
});

test('two stones in each other\'s way part, and a knock wakes a sleeping one', () => {
    const w = world();
    const a = w.add(stone({x: 300, y: 300, vx: 100}));
    const b = w.add(stone({x: 312, y: 300, asleep: true}));
    assert.ok(w.collide(), 'nothing touched');
    assert.ok(b.x - a.x >= diameter - 1e-9, `still overlapping, ${b.x - a.x} apart`);
    assert.equal(b.asleep, false);
    assert.ok(b.vx > 0, 'the struck stone did not move off');
});

test('two sleeping stones lying together are left alone', () => {
    const w = world();
    const a = w.add(stone({x: 300, y: 300, asleep: true}));
    const b = w.add(stone({x: 312, y: 300, asleep: true}));
    assert.equal(w.collide(), false);
    assert.equal(a.x, 300);
    assert.equal(b.x, 312);
});

test('in the void, a stone over the edge flies on, unslowed, and is gone after voidFlightTime', () => {
    const w = world({isVoid: true});
    const s = w.add(stone({x: 300, y: 501, vy: 30}));
    w.advance(0.016);
    assert.ok(s.falling);
    // The world is done with it at once; it keeps its speed, and turns over.
    assert.ok(w.still());
    w.advance(0.016);
    assert.ok(w.fall(s) > 0 && w.fall(s) < 1);
    assert.equal(s.vy, 30);
    assert.ok(s.tumble !== 0);
    run(w, voidFlightTime + 0.1, () => s.gone);
    assert.ok(s.gone);
});

test('in space, a shoved stone glides across the board and over the edge; a nudged one runs out', () => {
    const shoved = world({isVoid: true, onBoard: spaceBoard});
    const s = shoved.add(stone({x: 300, y: 300, vx: 300}));
    run(shoved, 3, () => s.offBoard);
    assert.ok(s.offBoard && s.falling);
    const nudged = world({isVoid: true, onBoard: spaceBoard});
    const n = nudged.add(stone({x: 300, y: 300, vx: 40}));
    run(nudged, 3, () => nudged.speedOf(n) === 0);
    assert.equal(nudged.speedOf(n), 0);
    assert.ok(!n.offBoard && n.x > 310 && n.x < 400);
});

test('in space, a stone on the move tumbles, and lies flat again once it stops', () => {
    const w = world({isVoid: true, onBoard: spaceBoard});
    const s = w.add(stone({x: 300, y: 300, vx: 40}));
    w.advance(0.016);
    assert.ok(isTumbling(s) && s.spin > 0 && s.turned > 0);
    assert.ok(!w.still());
    run(w, 3, () => w.speedOf(s) === 0);
    assert.ok(isTumbling(s));
    run(w, 1, () => !isTumbling(s));
    assert.equal(s.tumble, 0);
    assert.equal(s.turned, 0);
    assert.ok(w.still());
});

test('a stone turned round keeps its tumble, read the other way', () => {
    const s = stone({x: 300, y: 300});
    setTumbling(s, -Math.PI/2, 6);
    s.tumble = 1;
    setTumbling(s, Math.PI/2, 6);
    assert.equal(s.tumble, -1);
    assert.ok(s.spin < 0);
    assert.equal(s.heading, 0);
});

test('a flying stone tumbles leading edge first, turned the nearer way round', () => {
    const w = world({isVoid: true});
    // Over the top edge, going up: the tumble is about the horizontal already.
    const up = w.add(stone({x: 300, y: 99, vy: -30}));
    // Over the bottom edge: the same, backwards, rather than turned right round.
    const down = w.add(stone({x: 300, y: 501, vy: 30}));
    // Over the right edge: turned a quarter, tumbling forwards.
    const right = w.add(stone({x: 501, y: 300, vx: 30}));
    // Over the left edge: turned the same quarter, tumbling backwards.
    const left = w.add(stone({x: 99, y: 300, vx: -30}));
    w.advance(0.016);
    assert.ok(Math.abs(up.heading) < 1e-9 && up.spin > 0);
    assert.ok(Math.abs(down.heading) < 1e-9 && down.spin < 0);
    assert.ok(Math.abs(right.heading - Math.PI/2) < 1e-9 && right.spin > 0);
    assert.ok(Math.abs(left.heading - Math.PI/2) < 1e-9 && left.spin < 0);
    // Faster, it tumbles faster.
    const fast = w.add(stone({x: 300, y: 501, vy: 300}));
    w.advance(0.016);
    assert.ok(Math.abs(fast.spin) > Math.abs(down.spin));
});

test('the flying stones can be taken out of the world to fly on elsewhere', () => {
    const w = world({isVoid: true});
    const flying = w.add(stone({x: 300, y: 501, vy: 30}));
    const staying = w.add(stone({x: 300, y: 300}));
    w.advance(0.016);
    assert.deepEqual(w.takeFalling(), [flying]);
    assert.deepEqual(w.stones, [staying]);
    assert.deepEqual(w.takeFalling(), []);
});

test('a stone off the screen is gone', () => {
    const w = world();
    const s = w.add(stone({x: 300, y: 795, vy: 400, offBoard: true, landed: true, leftAt: -1}));
    run(w, 1, () => s.gone);
    assert.ok(s.gone);
    assert.equal(w.live().length, 0);
});

test('sounds and haptics are told', () => {
    const heard = [];
    const w = world({
        edgeKick: diameter*5,
        sound: {land: (strength) => heard.push(['land', strength]), knock: (strength) => heard.push(['knock', strength])},
        haptic: (kind) => heard.push([kind])
    });
    w.add(stone({x: 300, y: 495, vy: 600}));
    w.add(stone({x: 200, y: 300, vx: 200}));
    w.add(stone({x: 230, y: 300, vx: -200}));
    run(w, 2);
    assert.deepEqual(heard.map(([kind]) => kind).sort(), ['knock', 'land', 'tick']);
});
