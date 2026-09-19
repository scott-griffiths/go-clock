// The hand: a finger held on the board, driven by my-clock.js from the
// pointer events. It is a disc two stones wide that follows the pointer.
// Stones in its way are shoved aside and skid a little (physics.js),
// knocking into each other; any pushed over the edge drop onto the
// table and skid to a stop (or, in space, fly away: flight.js). The hand
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
import {$, setStyles, setVisible, setStoneShadow, cancelElementAnimations, elementCentre, colourOfImage, tableTransform,
        drawOnTable} from './stone-dom.js';
import {drawFlying, flyOn} from './flight.js';

export function fingerDown(clock, clientX, clientY) {
    if (clock.sweeping_board || clock.finger || typeof document === 'undefined') {
        return false;
    }
    var goban = $('#goban');
    var rect = goban.getBoundingClientRect();
    var diameter = clock.goban_width/20;
    var radius = clock.fingerRadius();
    window.clearTimeout(clock.idle_timer);

    // A shoved stone that goes over the edge tips outward as it falls,
    // so it lands clear of the side.
    var world = new StoneWorld({
        board: clock.boardRect(),
        screen: clock.screenRect(),
        diameter: diameter,
        onBoard: flatBoard,
        grip: clock.table_grip,
        isVoid: clock.table_void,
        edgeKick: diameter*5,
        sound: clock.sound,
        haptic: clock.haptic
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
    setStyles(disc, {width: radius*2, height: radius*2, left: clientX - rect.left - radius, top: clientY - rect.top - radius});
    setVisible(disc, true);
    cancelElementAnimations(disc);
    disc.animate?.([{opacity: 0, transform: 'scale(0.7)'}, {opacity: 1, transform: 'scale(1)'}], {duration: 160, easing: 'ease-out'});

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

    // The finger at (px, py), having just moved `travel` px in `sdt`
    // seconds: stones under it are shoved out, and they shove their
    // neighbours. A moving finger clears its path at once; a finger
    // that has just landed eases the stone out from under it.
    var shove = (px, py, sdt, travel) => {
        var give = Math.max(travel*1.5, diameter*0.12);
        // A little faster than the finger, at most; and a pointer that
        // jumps (a mouse, say) is not a finger that flicks.
        var speedCap = Math.min(travel/sdt*1.1 + diameter*3, diameter*40);
        for (var pass = 0; pass < 3; ++pass) {
            var moved = false;
            world.stones.forEach((stone) => {
                if (stone.gone || stone.falling) {
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
                // It leaves at least as fast as it was shoved.
                var wanted = Math.min(correction/sdt, speedCap);
                var along = stone.vx*nx + stone.vy*ny;
                if (along < wanted) {
                    stone.vx += (wanted - along)*nx;
                    stone.vy += (wanted - along)*ny;
                }
                moved = true;
            });
            var bumped = world.collide();
            world.stones.forEach((stone) => world.keepOffBoard(stone));
            if (!moved && !bumped) {
                break;
            }
        }
    };

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
            var moveX = finger.targetX - finger.x;
            var moveY = finger.targetY - finger.y;
            var travel = Math.hypot(moveX, moveY);
            var substeps = Math.max(1, Math.ceil(travel/(diameter*0.25)));
            for (var s = 1; s <= substeps; ++s) {
                shove(finger.x + moveX*s/substeps, finger.y + moveY*s/substeps, frame/substeps, travel/substeps);
            }
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
            if (stone.offBoard) {
                drawOnTable(stone.element, world.drop(stone));
            } else {
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
    // A stone still flying off into space flies on by itself.
    var world = finger.world;
    flyOn(world.takeFalling(), world.elapsed, world);
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
        setStoneShadow(stone.element.querySelector('.stone-shadow'), 0);
        stone.element.style.transform = tableTransform();
        clock.table_stones.push({
            element: stone.element,
            colour: stone.colour,
            src: stone.src,
            x: stone.x,
            y: stone.y,
            coords: clock.boardCoords(stone.x, stone.y)
        });
    });

    clock.transform();
}
