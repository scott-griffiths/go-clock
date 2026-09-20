// The stones going into the water: on the water background a stone that
// goes over the edge splashes, sends out a ripple or two, and sinks out of
// sight (physics.js, `isWater`). A sinking stone is drawn turning lazily
// over (from the tumble sheets space uses, flight.js), and smaller, darker
// and fainter the deeper it is; the ripples are rings that widen and fade,
// elements of their own on the goban, and are gone when they have faded.
//
// The hand and the sweep draw their sinking stones with drawSinking()
// while they last, splash them with splash() as the world tells them to,
// and hand any still going under to sinkOn() when they finish, which
// sees them out of sight in a world of its own.

import {StoneWorld} from './physics.js';
import {$, setStyles} from './stone-dom.js';
import {drawTumbling} from './flight.js';

// A stone's element `sink` (0 to 1) of the way under: turning over (which
// takes its shadow: it is in the water, not over it), and shrinking,
// darkening and fading with depth. `translate` is any transform the
// element already needs.
export function drawSinking(element, stone, sink, translate = '') {
    drawTumbling(element, stone, translate, `scale(${1 - 0.45*sink})`);
    element.style.opacity = String(1 - sink*sink);
    element.style.filter = `brightness(${1 - 0.5*sink}) saturate(${1 - 0.6*sink})`;
}

// The splash of a stone of radius r going in at (x, y) on the goban, and
// how hard (`strength`, 0 to 1): two rings from where it went in, the
// second after the first, each widening and fading; a harder splash
// spreads further.
export function splash(goban, x, y, r, strength) {
    if (!Element.prototype.animate) {
        return;
    }
    const spread = 2.6 + 1.4*Math.min(1, strength);
    [0, 140].forEach((delay, i) => {
        const ring = document.createElement('div');
        ring.className = 'ripple';
        setStyles(ring, {left: x - r, top: y - r, width: r*2, height: r*2});
        goban.append(ring);
        const animation = ring.animate([
            {transform: 'scale(0.7)', opacity: 0.85},
            {transform: `scale(${spread - i*0.6})`, opacity: 0}
        ], {duration: 900 - i*150, delay, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards'});
        animation.addEventListener('finish', () => ring.remove(), {once: true});
        animation.addEventListener('cancel', () => ring.remove(), {once: true});
    });
}

// The stones still going under when their world is done with them (see
// StoneWorld.takeSinking) sink on, out of sight, in a world of their own.
// Each is drawn by its element, a loose one on the goban; `elapsed` is
// the world time the stones' sankAt is measured from, and the rest is the
// old world's lie of the land.
export function sinkOn(stones, elapsed, {board, screen, diameter}) {
    if (stones.length === 0 || typeof window === 'undefined') {
        return;
    }
    const goban = $('#goban');
    const world = new StoneWorld({
        board, screen, diameter,
        onBoard: () => {},
        isWater: true,
        onSplash: (stone, strength) => splash(goban, stone.x, stone.y, stone.r, strength)
    });
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
        let sinking = 0;
        world.stones.forEach((stone) => {
            if (stone.gone) {
                stone.element.remove();
                return;
            }
            ++sinking;
            setStyles(stone.element, {left: stone.x - stone.r, top: stone.y - stone.r});
            drawSinking(stone.element, stone, world.sink(stone));
        });
        if (sinking > 0) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
