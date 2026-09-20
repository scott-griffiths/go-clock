// The stone simulation, stone by stone: a flat board slows a shoved stone
// to a stop, a stone over the edge drops and lands and stops on the table,
// the board's side keeps a table stone off, a stone pushed off the edge lands on
// the table, two stones in each other's way part, and in the
// void a stone over the edge flies on, end over end, and is gone; and on
// water a stone over the edge splashes, sinks and is gone.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StoneWorld, flatBoard, setTumbling, dropTime, voidFlightTime, lowHeight, sinkTime} from '../www/physics.js';

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

test('a stone pushed off the bottom edge drops onto the table and skids to a stop', () => {
    const w = world({sidesKeepOn: true});
    const s = w.add(stone({x: 300, y: 490, vy: 400}));
    run(w, 3, () => w.still());
    assert.ok(s.offBoard && s.landed);
    assert.ok(s.y - s.r >= board.bottom);
    assert.equal(w.speedOf(s), 0);
});

test('the sides keep a stone on the board being swept', () => {
    const w = world({sidesKeepOn: true});
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

test('in the void, a stone over the edge flies on, unslowed and unkicked, and is gone after voidFlightTime', () => {
    const w = world({isVoid: true, edgeKick: 100});
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

test('in space, a flying stone skims low and knocks a stone in its way, which sends both up', () => {
    const w = world({isVoid: true});
    const flier = w.add(stone({x: 300, y: 300, vx: 200}));
    const struck = w.add(stone({x: 340, y: 300}));
    run(w, 1, () => struck.falling);
    assert.ok(flier.falling && struck.falling);
    assert.ok(struck.vx > 0);
    // Knocked up: both climb faster than a stone left alone.
    assert.ok(flier.climb > 1/voidFlightTime && struck.climb > 1/voidFlightTime);
    assert.ok(w.fall(flier) < lowHeight);
    // Too high now, and nothing more to it: a stone under its path is untouched.
    flier.height = lowHeight;
    const under = w.add(stone({x: flier.x + 12, y: 300}));
    w.advance(0.016);
    assert.ok(!under.offBoard && under.vx === 0);
});

test('in space, a stone flies off the moment it moves, wherever it is on the board', () => {
    const w = world({isVoid: true, onBoard: flatBoard});
    const nudged = w.add(stone({x: 300, y: 300, vx: 40}));
    const still = w.add(stone({x: 200, y: 200}));
    w.advance(0.016);
    assert.ok(nudged.offBoard && nudged.falling);
    assert.ok(nudged.spin > 0 && nudged.turned > 0);
    // The board's friction never gets hold of it.
    assert.equal(nudged.vx, 40);
    assert.ok(!still.offBoard);
    run(w, voidFlightTime + 0.1, () => nudged.gone);
    assert.ok(nudged.gone && !still.offBoard);
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

test('on water, a stone over the edge splashes as it lands, is out of reach, and is gone after sinkTime', () => {
    const splashes = [];
    const w = world({
        isWater: true,
        edgeKick: diameter*5,
        sound: {splash: (strength) => splashes.push(['sound', strength]), knock: () => {}},
        onSplash: (s, strength) => splashes.push([s, strength])
    });
    const s = w.add(stone({x: 300, y: 495, vy: 300}));
    const other = w.add(stone({x: 300, y: 600, asleep: true}));
    run(w, 1, () => s.sinking);
    assert.ok(s.sinking, 'it never splashed');
    assert.ok(!w.still(), 'the world is not still while it sinks');
    assert.equal(splashes.length, 2);
    assert.equal(splashes[1][0], s);
    assert.ok(splashes[0][1] > 0);
    // Braked hard: nothing like the speed it went in with.
    assert.ok(s.vy < 300*0.3);
    const splashY = s.y;
    assert.ok(!w.reachable(s));
    run(w, sinkTime + 0.05, () => s.gone);
    assert.ok(s.gone, 'it never sank');
    assert.ok(w.sink(s) === 1);
    // It drifted only a little further, and the stone in its path was
    // never struck.
    assert.ok(s.y - splashY < diameter*2, `it drifted ${s.y - splashY}`);
    assert.ok(other.asleep);
    assert.ok(w.still());
});

test('the sinking stones can be taken out of the world to sink on elsewhere', () => {
    const w = world({isWater: true});
    const s = w.add(stone({x: 300, y: 501, vy: 30}));
    run(w, 1, () => s.sinking);
    assert.ok(s.sinking);
    assert.deepEqual(w.takeSinking(), [s]);
    assert.equal(w.stones.length, 0);
    assert.ok(w.still());
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
