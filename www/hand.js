// The hand: a finger held on the board, driven by my-clock.js from the
// pointer events. It is a disc two stones wide that follows the pointer.
// Stones in its way are shoved aside and skid a little (physics.js),
// knocking into each other; any pushed over the edge drop onto the
// table and skid to a stop (or, in space, fly away the moment they are
// touched: flight.js). The hand
// stops what it is doing (the stone it held drops where it is), waits
// for the finger to go and the stones to lie still, and then carries on
// with the board as it finds it: a stone stays where it was left, and
// counts as being at the nearest point.
//
// Functions of the clock (go-clock.js), which keeps `finger` while one is
// down: the world of loose stones, where the pointer is, and whether it
// is still pressing.

import {gridsize, nearestFreePoint} from './board.js';
import {StoneWorld, flatBoard} from './physics.js';
import {$, setStyles, setVisible, setStoneShadow, cancelElementAnimations, elementCentre, colourOfImage,
        drawOnTable, drawOnBoard} from './stone-dom.js';
import {drawFlying, flyOn} from './flight.js';
import {drawSinking, splash, skimRipple, sinkOn} from './water.js';

// How long the stones lie as the finger left them before the clock
// tidies up, in ms.
const tidyDelay = 500;

// The finger at (px, py), having just moved `travel` px in `sdt` seconds:
// every reachable stone within reach of it is shoved clear. Only the
// finger's own disc is tested here - cheap enough for every substep of a
// frame (pushStones) - not what a shoved stone then does to its
// neighbours, which is left for settleStones to sort out once, at the
// end of the frame, rather than paying for it at every substep along the
// way. A moving finger clears its path at once; a finger that has just
// landed eases the stone out from under it. onBump(force), if given, is
// told of a shove hard enough to feel.
function shoveAt(world, radius, diameter, px, py, sdt, travel, onBump) {
    var give = Math.max(travel*1.5, diameter*0.12);
    // A little faster than the finger, at most; and a pointer that
    // jumps (a mouse, say) is not a finger that flicks.
    var speedCap = Math.min(travel/sdt*1.1 + diameter*3, diameter*40);
    world.stones.forEach((stone) => {
        if (!world.reachable(stone)) {
            return;
        }
        var dx = stone.x - px;
        var dy = stone.y - py;
        var distance = Math.hypot(dx, dy);
        var reach = radius + stone.r;
        if (distance >= reach) {
            return;
        }
        if (distance === 0) {
            dx = 1;
            dy = 0;
            distance = 1;
        }
        var nx = dx/distance;
        var ny = dy/distance;
        var correction = Math.min(reach - distance, give);
        stone.x += nx*correction;
        stone.y += ny*correction;
        // It leaves at least as fast as it was shoved; a stone
        // that had to be got going with some force is felt under
        // the finger.
        var wanted = Math.min(correction/sdt, speedCap);
        var along = stone.vx*nx + stone.vy*ny;
        if (along < wanted) {
            stone.vx += (wanted - along)*nx;
            stone.vy += (wanted - along)*ny;
            var force = (wanted - along)/(diameter*12);
            if (force > 0.25) {
                onBump?.(Math.min(1, force));
            }
        }
    });
}

// The stones shoveAt has shoved, this frame, over however many substeps:
// in up to three passes, each shoves its neighbours in turn, so a chain
// of touching stones passes a shove along rather than sitting piled on
// top of one another. Once per frame rather than once per substep -
// collide() is the expensive part of all this, and what it settles here
// does not depend on which substep first disturbed a stone, only on
// where every stone ended up once the finger had passed.
function settleStones(world) {
    for (var pass = 0; pass < 3; ++pass) {
        var bumped = world.collide();
        world.stones.forEach((stone) => world.keepOffBoard(stone));
        if (!bumped) {
            break;
        }
    }
}

// One animation frame of the finger easing from (fromX, fromY) to
// (toX, toY): in steps small enough that no stone is skipped over, so a
// finger that has jumped a long way since the last frame (a slow frame, a
// fast swipe) still clears every stone along the way rather than
// tunnelling through it. No page in here to draw the result on: hand.js
// draws each stone where this leaves it, and the performance test drives
// it directly.
export function pushStones(world, radius, diameter, fromX, fromY, toX, toY, frame, onBump) {
    var moveX = toX - fromX;
    var moveY = toY - fromY;
    var travel = Math.hypot(moveX, moveY);
    var substeps = Math.max(1, Math.ceil(travel/(diameter*0.25)));
    for (var s = 1; s <= substeps; ++s) {
        shoveAt(world, radius, diameter, fromX + moveX*s/substeps, fromY + moveY*s/substeps, frame/substeps, travel/substeps, onBump);
    }
    settleStones(world);
}

export function fingerDown(clock, clientX, clientY) {
    if (clock.sweeping_board || typeof document === 'undefined') {
        return false;
    }
    if (clock.finger) {
        // The last finger has lifted, but its stones are still sliding:
        // this one takes them on where they are, rather than waiting.
        if (clock.finger.pressing) {
            return false;
        }
        pressAgain(clock, clock.finger, clientX, clientY);
        return true;
    }
    var goban = $('#goban');
    var rect = goban.getBoundingClientRect();
    var diameter = clock.goban_width/20;
    var radius = clock.fingerRadius();
    window.clearTimeout(clock.idle_timer);

    // A shoved stone that goes over the edge tips outward as it falls,
    // so it lands clear of the side. In space nothing holds a stone to
    // the board: a shove sends it straight off into the dark.
    var world = new StoneWorld({
        board: clock.boardRect(),
        screen: clock.screenRect(),
        diameter: diameter,
        onBoard: flatBoard,
        grip: clock.table_grip,
        isVoid: clock.table_void,
        isWater: clock.table_water,
        flat: clock.flat_stones,
        edgeKick: diameter*5,
        sound: clock.sound,
        onSplash: (stone, strength, skim = false) => skim
            ? skimRipple(goban, stone.x, stone.y, stone.r, strength)
            : splash(goban, stone.x, stone.y, stone.r, strength, Math.atan2(stone.vy, stone.vx))
    });

    // Whatever the hand was doing stops, and the stone it held drops
    // where it is; so does one it was pushing aside.
    clock.dropHeldStones().forEach((stone) => world.add(stone));

    // The stones on the table are in it too.
    clock.table_stones.forEach((entry) => {
        var stone = clock.looseStone(entry.src, entry.colour, entry.x, entry.y);
        entry.element.remove();
        stone.offBoard = true;
        stone.landed = true;
        stone.lift = entry.lift || 0;
        world.add(stone);
    });
    clock.table_stones = [];

    // The stones on the board come loose; their points are hidden until
    // the finger has gone. A stone drawn on a point the model has as
    // empty is a stone all the same (it should not happen, but a stuck
    // stone that nothing can move is worse than a spare): its colour is
    // read off its image.
    for (var i = 0; i < clock.stones_shown.length; ++i) {
        var element = $('#p' + i);
        var image = element.querySelector('img');
        var colour = clock.stones_shown[i];
        if (colour == 0 && !image.hidden && image.src) {
            colour = colourOfImage(image);
        }
        if (colour == 0) {
            continue;
        }
        var at = elementCentre(element, diameter);
        cancelElementAnimations(element);
        world.add(clock.looseStone(image.src, colour, at[0], at[1]));
        setVisible(element.querySelector('.stone-shadow'), false);
        setVisible(image, false);
    }

    var disc = $('#finger');
    showDisc(disc, radius, clientX - rect.left, clientY - rect.top);

    var finger = {
        world: world,
        left: rect.left,
        top: rect.top,
        x: clientX - rect.left,
        y: clientY - rect.top,
        targetX: clientX - rect.left,
        targetY: clientY - rect.top,
        pressing: true,
        releasedAt: 0,
        frame: null
    };
    clock.finger = finger;

    var last = null;
    var step = (now) => {
        if (clock.finger !== finger) {
            return;
        }
        if (last === null) {
            last = now;
        }
        // As in the sweep: the physics keeps up with the clock whatever
        // the frame rate, in steps short enough to stay stable.
        var frame = Math.max(0.001, Math.min((now - last)/1000, 0.25));
        last = now;

        if (finger.pressing) {
            // Towards where the pointer is, in steps small enough that
            // no stone is skipped over.
            pushStones(world, radius, diameter, finger.x, finger.y, finger.targetX, finger.targetY, frame,
                (force) => clock.haptic?.('bump', force));
            finger.x = finger.targetX;
            finger.y = finger.targetY;
            setStyles(disc, {left: finger.x - radius, top: finger.y - radius});
        }

        var steps = Math.max(1, Math.ceil(frame/0.032));
        for (var s = 0; s < steps; ++s) {
            world.advance(frame/steps);
        }

        var sliding = 0;
        world.stones.forEach((stone) => {
            if (stone.gone) {
                // Off the screen (the table goes on unseen) or fallen away.
                if (!stone.cleared) {
                    stone.cleared = true;
                    stone.element.remove();
                }
                return;
            }
            setStyles(stone.element, {left: stone.x - stone.r, top: stone.y - stone.r});
            if (stone.falling) {
                drawFlying(stone.element, stone, world);
                return;
            }
            if (stone.sinking) {
                drawSinking(stone.element, stone, world.sink(stone));
            } else if (stone.offBoard) {
                drawOnTable(stone.element, world.drop(stone), '', stone.lift);
            } else {
                drawOnBoard(stone.element, stone.lift);
                sliding += Math.min(1, world.speedOf(stone)/(diameter*10));
            }
        });
        clock.sound?.setRumble(Math.min(1, sliding/4)*0.2);

        // Done once the finger has gone and everything lies still (or,
        // failing that, after a while).
        if (finger.pressing || (!world.still() && world.elapsed - finger.releasedAt < 6)) {
            finger.frame = window.requestAnimationFrame(step);
        } else {
            clock.endFinger();
        }
    };
    finger.frame = window.requestAnimationFrame(step);
    return true;
}

// The hand's disc, landing at (x, y) in the goban.
function showDisc(disc, radius, x, y) {
    setStyles(disc, {width: radius*2, height: radius*2, left: x - radius, top: y - radius});
    setVisible(disc, true);
    cancelElementAnimations(disc);
    disc.animate?.([{opacity: 0, transform: 'scale(0.7)'}, {opacity: 1, transform: 'scale(1)'}], {duration: 160, easing: 'ease-out'});
}

// A finger down again before the last one's stones have come to rest:
// the same hand, landing afresh where the pointer is, with the stones as
// they lie (its loop is still running, and picks up from the new point).
function pressAgain(clock, finger, clientX, clientY) {
    finger.x = finger.targetX = clientX - finger.left;
    finger.y = finger.targetY = clientY - finger.top;
    finger.pressing = true;
    finger.releasedAt = 0;
    showDisc($('#finger'), clock.fingerRadius(), finger.x, finger.y);
}

export function fingerMove(clock, clientX, clientY) {
    var finger = clock.finger;
    if (!finger || !finger.pressing) {
        return;
    }
    finger.targetX = clientX - finger.left;
    finger.targetY = clientY - finger.top;
}

export function fingerUp(clock) {
    var finger = clock.finger;
    if (!finger || !finger.pressing) {
        return;
    }
    finger.pressing = false;
    finger.releasedAt = finger.world.elapsed;
    setVisible($('#finger'), false);
}

// The finger has gone and the stones lie still: read the board as it
// is. Each stone stays put and is recorded at its nearest point, with
// its displacement as its offset; only when two stones share a nearest
// point does the second take the next free one, with a short slide.
// Fallen stones stay on the table, in play.
export function endFinger(clock) {
    var finger = clock.finger;
    if (!finger) {
        return;
    }
    clock.finger = null;
    window.cancelAnimationFrame(finger.frame);
    setVisible($('#finger'), false);
    clock.sound?.setRumble(0);

    clock.stones_shown = Array(gridsize*gridsize).fill(0);
    clock.reset_offsets();
    var taken = new Set();
    // A stone still flying off into space flies on by itself; one still
    // going under the water sinks on.
    var world = finger.world;
    flyOn(world.takeFalling(), world.elapsed, world);
    sinkOn(world.takeSinking(), world.elapsed, world);
    var stones = world.stones;
    var fallen = stones.filter((stone) => !stone.gone && stone.offBoard);
    var placements = stones
        .filter((stone) => !stone.gone && !stone.offBoard)
        .map((stone) => {
            var coords = clock.boardCoords(stone.x, stone.y);
            var slack = Math.hypot(coords[0] - Math.round(coords[0]), coords[1] - Math.round(coords[1]));
            return {stone: stone, coords: coords, slack: slack};
        });
    // The stones nearest their points claim them first.
    placements.sort((a, b) => a.slack - b.slack);
    placements.forEach(({stone, coords}) => {
        var index = nearestFreePoint(coords, taken);
        if (index < 0) {
            // Every point on the grid taken (it would take 361 stones):
            // it might as well have fallen.
            stone.offBoard = true;
            fallen.push(stone);
            return;
        }
        taken.add(index);
        var ix = index % gridsize;
        var iy = (index - ix)/gridsize;
        var offset = [
            Math.max(-0.49, Math.min(0.49, coords[0] - ix)),
            Math.max(-0.49, Math.min(0.49, coords[1] - iy))
        ];
        var slides = Math.abs(offset[0] - (coords[0] - ix)) > 0.001 || Math.abs(offset[1] - (coords[1] - iy)) > 0.001;
        clock.offsets[index] = offset;
        clock.stones_shown[index] = stone.colour;
        var position = $('#p' + index);
        var image = position.querySelector('img');
        var shadow = position.querySelector('.stone-shadow');
        image.style.removeProperty('filter');
        image.src = stone.src;
        setStoneShadow(shadow, 0);
        position.classList.add('has-stone');
        setVisible(shadow, true);
        setVisible(image, true);
        // Where it lies, and then, if its point was taken, the short
        // way to the next one.
        setStyles(position, {left: stone.x - stone.r, top: stone.y - stone.r, width: stone.r*2, height: stone.r*2});
        clock.updateBoardPosition(index, slides);
        stone.element.remove();
    });
    for (var i = 0; i < gridsize*gridsize; ++i) {
        if (!taken.has(i)) {
            clock.updateBoardPosition(i, false);
        }
    }

    fallen.forEach((stone) => {
        drawOnTable(stone.element, 1, '', stone.lift);
        clock.table_stones.push({
            element: stone.element,
            colour: stone.colour,
            src: stone.src,
            x: stone.x,
            y: stone.y,
            lift: stone.lift,
            coords: clock.boardCoords(stone.x, stone.y)
        });
    });

    // A moment for the board as it was left, before the clock tidies it
    // (a finger down again first takes the board on as it is).
    window.clearTimeout(clock.idle_timer);
    clock.idle_timer = window.setTimeout(() => clock.transform(), tidyDelay);
}
