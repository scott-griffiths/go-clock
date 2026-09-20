// Sweeping the board: an arm laid across it wipes from the top edge to
// the bottom and off, gathering every stone before it and leaving them
// on the table below the board, where they land and skid to a stop, out
// of the arm's reach (or, in space, off into the dark as soon as they
// are touched: flight.js). The arm is
// cupped — its ends lead and its middle trails — so the stones it pushes
// are steered towards the middle as they go, and come off in a heap. A
// simulation (physics.js) rather than keyframes, so that the stones
// jostle and knock each other as they are gathered, and the heap is
// whatever they make of it. The arm is drawn as the hand's disc is
// (#arm), a bar the width of the board with its leading edge curved.
//
// A function of the clock (go-clock.js), which it leaves with the board
// bare, the heap on the table in play, and transform() due once the arm
// has lifted.

import {gridsize} from './board.js';
import {StoneWorld, flatBoard} from './physics.js';
import {$, setStyles, setVisible, setStoneShadow, cancelElementAnimations, tableTransform, drawOnTable} from './stone-dom.js';
import {drawFlying, flyOn, clearFlying} from './flight.js';
import {drawSinking, splash, sinkOn} from './water.js';

export function sweepBoard(clock) {
    if (clock.sweeping_board || clock.finger || typeof document === 'undefined') {
        return;
    }

    // Whatever the hand holds drops where it is and is swept with the rest.
    var held = clock.dropHeldStones();
    clock.sweeping_board = true;

    var goban = $('#goban');
    var board = clock.boardRect();
    var boardTop = clock.y_offset;
    var diameter = clock.goban_width/20;
    // The table: a phone in portrait has room for the stones below the
    // board; a wide screen may not, in which case they skid out of sight.
    var world = new StoneWorld({
        board: board,
        screen: clock.screenRect(),
        diameter: diameter,
        onBoard: flatBoard,
        grip: clock.table_grip,
        isVoid: clock.table_void,
        isWater: clock.table_water,
        sidesKeepOn: true,
        sound: clock.sound,
        onSplash: (stone, strength) => splash(goban, stone.x, stone.y, stone.r, strength, Math.atan2(stone.vy, stone.vx))
    });
    // The arm: its leading edge (at the ends; the middle trails by
    // `bow`) starts above the top of the board and wipes down to well
    // past the bottom, where it stops and lifts. It takes a moment to
    // come down onto the board first.
    var armDepth = diameter*1.6;
    var armWidth = clock.goban_width + diameter;
    var armLeft = board.left - diameter/2;
    var bow = diameter*1.5;
    var armStart = board.top - diameter;
    var armEnd = board.bottom + diameter + bow;
    var armDelay = 0.25;
    var armTime = 1.4;
    var armLift = 0.35;
    var armAt = (t) => {
        // Eased in and out over the wipe.
        var u = Math.min(1, Math.max(0, (t - armDelay)/armTime));
        var eased = u < 0.5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
        return armStart + (armEnd - armStart)*eased;
    };
    // How far the edge trails at `x`, 0 at the ends and `bow` in the
    // middle (a parabola), and its slope there.
    var trail = (x) => {
        var u = (x - (armLeft + armWidth/2))/(armWidth/2);
        return bow*(1 - u*u);
    };
    var lean = (x) => {
        var u = (x - (armLeft + armWidth/2))/(armWidth/2);
        return -2*bow*u/(armWidth/2);
    };
    var arm = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arm.id = 'arm';
    arm.setAttribute('viewBox', `0 0 ${armWidth} ${armDepth + bow}`);
    arm.setAttribute('aria-hidden', 'true');
    var armShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // Square across the top, and the edge below a curve rising to the
    // middle (a quadratic's control point sits twice as far as its peak).
    armShape.setAttribute('d', `M 0 ${armDepth*0.4} Q 0 0 ${armDepth*0.4} 0 H ${armWidth - armDepth*0.4} Q ${armWidth} 0 ${armWidth} ${armDepth*0.4} V ${armDepth + bow} Q ${armWidth/2} ${armDepth - bow} 0 ${armDepth + bow} Z`);
    arm.append(armShape);
    setStyles(arm, {left: armLeft, width: armWidth, height: armDepth + bow, top: armStart - armDepth - bow});
    arm.style.opacity = '0';
    goban.append(arm);
    // Lower stones pass in front of higher ones on the way down.
    var layer = (top) => String(12 + Math.round((top - boardTop)/clock.goban_height*80));

    for (var i = 0; i < clock.stones_shown.length; ++i) {
        if (clock.stones_shown[i] == 0) {
            continue;
        }
        var element = $('#p' + i);
        if (!element) {
            continue;
        }
        cancelElementAnimations(element);
        var left = parseFloat(element.style.left) || 0;
        var top = parseFloat(element.style.top) || 0;
        var size = parseFloat(element.style.width) || diameter;
        world.add({
            index: i,
            element: element,
            colour: clock.stones_shown[i],
            src: element.querySelector('img').src,
            startLeft: left,
            startTop: top,
            x: left + size/2,
            y: top + size/2,
            r: size/2,
            vx: 0,
            vy: 0,
            asleep: false,
            offBoard: false,
            landed: false,
            falling: false,
            gone: false,
            leftAt: 0
        });
        element.style.zIndex = layer(top);
        setVisible(element.querySelector('.stone-shadow'), true);
        setVisible(element.querySelector('img'), true);
    }

    // The stones already on the table are in the way of the ones coming
    // down; they lie still until struck, and the arm never reaches them.
    clock.table_stones.forEach((entry) => {
        world.add({
            index: -1,
            element: entry.element,
            colour: entry.colour,
            src: entry.src,
            startLeft: entry.x - diameter/2,
            startTop: entry.y - diameter/2,
            x: entry.x,
            y: entry.y,
            r: diameter/2,
            vx: 0,
            vy: 0,
            asleep: true,
            offBoard: true,
            landed: true,
            falling: false,
            gone: false,
            leftAt: 0
        });
    });
    clock.table_stones = [];

    // The stones the hand dropped lie on the board, loose, and slide
    // off with the others; they end up on the table like them.
    held.forEach((stone) => {
        stone.element.style.zIndex = layer(stone.y - stone.r);
        world.add({
            index: -1,
            element: stone.element,
            colour: stone.colour,
            src: stone.src,
            startLeft: stone.x - stone.r,
            startTop: stone.y - stone.r,
            x: stone.x,
            y: stone.y,
            r: stone.r,
            vx: 0,
            vy: 0,
            asleep: false,
            offBoard: false,
            landed: false,
            falling: false,
            gone: false,
            leftAt: 0
        });
    });

    // The grid points' elements go back to their points at the end, whatever
    // became of their stones.
    var pointStones = world.stones.filter((stone) => stone.index >= 0);
    var clear = () => {
        pointStones.forEach((stone) => {
            var element = stone.element;
            cancelElementAnimations(element);
            clearFlying(element);
            element.classList.remove('has-stone');
            element.style.removeProperty('z-index');
            element.style.removeProperty('transform');
            element.style.removeProperty('opacity');
            element.style.removeProperty('filter');
            setStoneShadow(element, 0);
            setVisible(element.querySelector('.stone-shadow'), false);
            setVisible(element.querySelector('img'), false);
        });

        clock.stones_shown = Array(gridsize*gridsize).fill(0);
        clock.reset_offsets();
        for (var i = 0; i < gridsize*gridsize; ++i) {
            clock.updateBoardPosition(i, false);
        }
        // The hands are at the heap, below the middle of the near edge.
        clock.hands.forEach((hand) => {
            hand.position = (gridsize - 1)*gridsize + (gridsize - 1)/2;
        });

        // The arm lifts away before the stones come back.
        window.setTimeout(() => {
            clock.sweeping_board = false;
            clock.transform();
        }, armLift*1000);
    };

    var finish = () => {
        arm.style.transition = `opacity ${armLift}s ease-out`;
        arm.style.opacity = '0';
        window.setTimeout(() => arm.remove(), armLift*1000 + 50);
        clock.sound?.setRumble(0);
        // A stone still on its way into the dark flies on by itself, a grid
        // point's by a loose element of its own, since the point's element
        // is about to go back to its point (clear() below).
        var loose = (stone) => stone.index < 0 ? stone
            : {...stone, index: -1, element: clock.looseStone(stone.src, stone.colour, stone.x, stone.y).element};
        flyOn(world.takeFalling().map(loose), world.elapsed, world);
        sinkOn(world.takeSinking().map(loose), world.elapsed, world);
        // The heap stays on the table, in play, and the board is bare.
        world.stones.forEach((stone) => {
            if (stone.gone) {
                if (stone.index < 0) {
                    stone.element.remove();
                }
                return;
            }
            var element = stone.element;
            if (stone.index < 0) {
                setStyles(element, {left: stone.x - stone.r, top: stone.y - stone.r});
            } else {
                element = clock.looseStone(stone.src, stone.colour, stone.x, stone.y).element;
            }
            element.style.transform = tableTransform();
            setStoneShadow(element.querySelector('.stone-shadow'), 0);
            clock.table_stones.push({
                element: element,
                colour: stone.colour,
                src: stone.src,
                x: stone.x,
                y: stone.y,
                coords: clock.boardCoords(stone.x, stone.y)
            });
        });
        clear();
    };

    // The arm's ends have come down from `from` to `to` in `dt` seconds:
    // every stone on the board its edge reaches is pushed ahead of it, at
    // its speed at least, and steered in towards the middle by the slope
    // of the edge where it touches; and the stones it pushes together
    // jostle apart. A stone over the edge is out of the arm's reach: it
    // lands where it falls, and the heap lies where it lands. Passes, as
    // the hand's shove: a stone pushed into another pushes that one on.
    var wipe = (from, to, dt) => {
        var speed = (to - from)/dt;
        if (speed <= 0) {
            return;
        }
        for (var pass = 0; pass < 3; ++pass) {
            var moved = false;
            world.stones.forEach((stone) => {
                if (!world.reachable(stone) || stone.offBoard) {
                    return;
                }
                var edge = to - trail(stone.x);
                if (stone.y - stone.r < edge) {
                    stone.asleep = false;
                    stone.y = edge + stone.r;
                    if (stone.vy < speed) {
                        stone.vy = speed;
                    }
                    // Along the edge's slope, towards the middle; a stone
                    // caught square on drifts a little to one side.
                    var inward = lean(stone.x)*speed;
                    if (inward > 0 ? stone.vx < inward : stone.vx > inward) {
                        stone.vx = inward;
                    }
                    if (Math.abs(stone.vx) < diameter*0.5) {
                        stone.vx += (Math.random() - 0.5)*diameter*0.6;
                    }
                    moved = true;
                }
            });
            var bumped = world.collide();
            world.stones.forEach((stone) => world.keepOffBoard(stone));
            if (!moved && !bumped) {
                break;
            }
        }
    };

    var last = null;
    var stillFor = 0;
    var step = (now) => {
        if (last === null) {
            last = now;
        }
        // However long the frame was (a throttled tab, a slow device),
        // the physics catches up with the clock, in steps short enough
        // to stay stable: a low frame rate makes the sweep choppy, not
        // slow. A frame longer than a quarter of a second is left behind.
        var frame = Math.min((now - last)/1000, 0.25);
        last = now;
        var steps = Math.max(1, Math.ceil(frame/0.032));
        for (var s = 0; s < steps; ++s) {
            var dt = frame/steps;
            var before = armAt(world.elapsed);
            world.advance(dt);
            wipe(before, armAt(world.elapsed), dt);
        }
        arm.style.top = `${armAt(world.elapsed) - armDepth - bow}px`;
        arm.style.opacity = world.elapsed < armDelay ? String(world.elapsed/armDelay) : '1';

        world.stones.forEach((stone) => {
            if (stone.gone) {
                // Skidded off the screen, or fallen away: a grid point's
                // element goes dark, a loose stone's goes.
                if (!stone.cleared) {
                    stone.cleared = true;
                    if (stone.index < 0) {
                        stone.element.remove();
                    } else {
                        setVisible(stone.element.querySelector('img'), false);
                        setVisible(stone.element.querySelector('.stone-shadow'), false);
                    }
                }
                return;
            }
            var translate = `translate(${stone.x - stone.r - stone.startLeft}px, ${stone.y - stone.r - stone.startTop}px)`;
            if (stone.falling) {
                drawFlying(stone.element, stone, world, translate);
                return;
            }
            if (stone.sinking) {
                drawSinking(stone.element, stone, world.sink(stone), translate);
            } else if (stone.offBoard) {
                // In the air for the drop off the edge, then on the table,
                // which is that little further away.
                drawOnTable(stone.element, world.drop(stone), translate);
            } else {
                stone.element.style.transform = translate;
            }
        });

        if (clock.sound) {
            // The rumble follows how much is sliding on the board.
            var sliding = 0;
            world.stones.forEach((stone) => {
                if (!stone.gone && !stone.asleep && !stone.offBoard) {
                    sliding += Math.min(1, world.speedOf(stone)/(clock.goban_height*0.8));
                }
            });
            clock.sound.setRumble(Math.min(1, sliding/6)*0.25);
        }

        // Done once the arm has stopped and the heap has lain still for
        // a moment, or, failing that, after a while.
        stillFor = world.still() ? stillFor + frame : 0;
        var settled = world.elapsed > armDelay + armTime && stillFor > 0.3;
        if (!settled && world.elapsed < 8) {
            window.requestAnimationFrame(step);
        } else {
            finish();
        }
    };

    if (world.stones.length === 0) {
        finish();
    } else {
        window.requestAnimationFrame(step);
    }
}
