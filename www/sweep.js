// Sweeping the board: tip it, far edge up, and let the stones slide off
// the near edge onto the table, where they skid to a stop. A simulation
// (physics.js) rather than keyframes, so that stones that let go first can
// knock the others loose on their way down, and the heap is whatever they
// make of it. The view is from above: gravity is into the screen, so only
// the tipped board pulls the stones anywhere; the table is flat.
//
// A function of the clock (go-clock.js), which it leaves with the board
// bare, the heap on the table in play, and transform() due once the board
// has settled flat.

import {gridsize} from './board.js';
import {StoneWorld, tippedBoard} from './physics.js';
import {$, setStyles, setVisible, setStoneShadow, cancelElementAnimations, tableTransform, drawFalling, drawOnTable} from './stone-dom.js';

export function sweepBoard(clock) {
    if (clock.sweeping_board || clock.finger || typeof document === 'undefined') {
        return;
    }

    // Whatever the hand holds drops where it is and is swept with the rest.
    var held = clock.dropHeldStones();
    clock.sweeping_board = true;

    var goban = $('#goban');
    var boardTop = clock.y_offset;
    var diameter = clock.goban_width/20;
    // Down the slope, in px/s²: a stone crosses the board in a second or
    // so. The tip leans a little towards the middle of the near edge as
    // well, so the stones gather as they slide and land in one heap.
    // The table: a phone in portrait has room for the stones below the
    // board; a wide screen may not, in which case they skid out of sight.
    var gravity = clock.goban_height*1.6;
    var world = new StoneWorld({
        board: clock.boardRect(),
        screen: clock.screenRect(),
        diameter: diameter,
        onBoard: tippedBoard({gravity: gravity, gather: gravity*0.4/(clock.goban_width/2)}),
        grip: clock.table_grip,
        isVoid: clock.table_void,
        sidesKeepOn: true,
        sound: clock.sound
    });
    // The tip takes most of a second; a stone loses its grip some time
    // after that, each a little differently.
    var release = () => 0.55 + Math.random()*0.7;
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
            asleep: true,
            release: release(),
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
    // down; they lie still until struck.
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
            release: Infinity,
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
            asleep: true,
            release: release(),
            offBoard: false,
            landed: false,
            falling: false,
            gone: false,
            leftAt: 0
        });
    });

    goban.classList.add('tipped');

    var clear = () => {
        world.stones.forEach((stone) => {
            if (stone.index < 0) {
                return;
            }
            var element = stone.element;
            cancelElementAnimations(element);
            element.classList.remove('has-stone');
            element.style.removeProperty('z-index');
            element.style.removeProperty('transform');
            element.style.removeProperty('opacity');
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

        // Let the board settle flat before the stones come back.
        window.setTimeout(() => {
            clock.sweeping_board = false;
            clock.transform();
        }, 900);
    };

    var finish = () => {
        goban.classList.remove('tipped');
        clock.sound?.setRumble(0);
        // The heap stays on the table, in play, and the board is bare.
        world.stones.forEach((stone) => {
            if (stone.falling) {
                // Still on its way into the dark: as good as gone.
                stone.gone = true;
            }
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
            // Whose time has come lets go, with a little wobble sideways.
            world.stones.forEach((stone) => {
                if (stone.asleep && world.elapsed >= stone.release) {
                    stone.asleep = false;
                    stone.vx = (Math.random() - 0.5)*diameter*0.8;
                }
            });
            world.advance(frame/steps);
        }

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
                drawFalling(stone.element, world.fall(stone), translate);
                return;
            }
            if (stone.offBoard) {
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

        // Done once every stone is off the board and the heap has lain
        // still for half a second, or, failing that, after a while.
        stillFor = world.still() ? stillFor + frame : 0;
        var settled = world.onBoardCount() === 0 && stillFor > 0.5;
        if (!settled && world.elapsed < 12) {
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
