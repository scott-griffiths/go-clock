// The stones tumbling in space: on the space background nothing holds a
// stone to the board, so one that is disturbed, wherever it is, flies
// away as it was going, end over end, low over the board at first
// (knocking others as it goes, which sends both up) and rising (nothing
// is below it) until it is too high to see. A flying stone is drawn from a sprite
// sheet of the stone turning over (scripts/make-stone-sprites.swift
// renders one for each stone image): a half turn in `frames` steps, which
// is the whole tumble, a stone's two faces being alike; and turned on the
// page to put the tumble along its path (`heading`, physics.js).
//
// The hand and the sweep draw their flying stones with drawFlying() while
// they last, and hand any still in the air to flyOn() when they finish,
// which sees them out of sight in a world of its own.

import {StoneWorld} from './physics.js';
import {setStyles, setVisible, stoneSrcs} from './stone-dom.js';

const frames = 18;
const columns = 6;
const rows = Math.ceil(frames/columns);

// The sheet for a stone image: its name with `_tumble` in it.
export function tumbleSheetSrc(stoneSrc) {
    return stoneSrc.replace(/_160\.png$/, '_tumble_160.png');
}

// The sheets are big, and only space wants them: fetched once space is
// chosen, ahead of the first stone over the edge.
let preloaded = false;
export function preloadTumbleSheets() {
    if (preloaded || typeof Image === 'undefined') {
        return;
    }
    preloaded = true;
    stoneSrcs.forEach((src) => {
        const image = new Image();
        image.src = tumbleSheetSrc(src);
    });
}

// A stone's element tumbling: the frame of the tumble it has reached,
// turned along its path (easing in, so it does not jump as it sets off). Its image and shadow give way to the sheet. `translate`
// is any transform the element already needs; `more` any more transform
// to follow.
export function drawTumbling(element, stone, translate = '', more = '') {
    const frame = ((Math.round(stone.tumble/Math.PI*frames) % frames) + frames) % frames;
    if (!element.classList.contains('flying')) {
        element.classList.add('flying');
        setVisible(element.querySelector('.stone-shadow'), false);
        setVisible(element.querySelector('img'), false);
        element.style.backgroundImage = `url("${tumbleSheetSrc(stone.src)}")`;
        element.style.backgroundSize = `${columns*100}% ${rows*100}%`;
    }
    const column = frame % columns;
    const row = (frame - column)/columns;
    element.style.backgroundPosition = `${columns > 1 ? column/(columns - 1)*100 : 0}% ${rows > 1 ? row/(rows - 1)*100 : 0}%`;
    element.style.transform = `${translate} rotate(${stone.heading*stone.turned}rad) ${more}`.trim();
}

// A stone's element in flight: tumbling, and larger for rising towards
// the eye, until at a certain height it fades from sight.
export function drawFlying(element, stone, world, translate = '') {
    const height = world.fall(stone);
    element.classList.add('rising');
    drawTumbling(element, stone, translate, `scale(${1 + 1.0*height})`);
    element.style.opacity = String(height < 0.55 ? 1 : 1 - (height - 0.55)/0.45);
}

// An element done with tumbling: back to an image and a shadow.
export function clearFlying(element) {
    element.classList.remove('flying');
    element.style.removeProperty('background-image');
    element.style.removeProperty('background-size');
    element.style.removeProperty('background-position');
}

// The stones still in the air when their world is done with them (see
// StoneWorld.takeFalling) fly on, out of sight, in a world of their own.
// Each is drawn by its element, a loose one on the goban; `elapsed` is
// the world time the stones' leftAt is measured from, and the rest is
// the old world's lie of the land.
export function flyOn(stones, elapsed, {board, screen, diameter}) {
    if (stones.length === 0 || typeof window === 'undefined') {
        return;
    }
    const world = new StoneWorld({board, screen, diameter, onBoard: () => {}, isVoid: true});
    world.elapsed = elapsed;
    stones.forEach((stone) => {
        setStyles(stone.element, {left: stone.x - stone.r, top: stone.y - stone.r, width: stone.r*2, height: stone.r*2});
        world.add(stone);
    });

    let last = null;
    const step = (now) => {
        if (last === null) {
            last = now;
        }
        world.advance(Math.min((now - last)/1000, 0.25));
        last = now;
        let flying = 0;
        world.stones.forEach((stone) => {
            if (stone.gone) {
                stone.element.remove();
                return;
            }
            ++flying;
            setStyles(stone.element, {left: stone.x - stone.r, top: stone.y - stone.r});
            drawFlying(stone.element, stone, world);
        });
        if (flying > 0) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
