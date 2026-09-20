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

// The splash of a stone of radius r going in at (x, y) on the goban,
// how hard (`strength`, 0 to 1) and which way it was going (`direction`,
// an angle clockwise with y down). A stone going in with some speed
// throws its splash ahead of it: the rings spread from a little in front
// of where it went in, longer along its path than across it, and a
// harder splash flings a few drops on ahead in a cone, each making a
// small ring of its own where it comes down. A stone dropped straight in
// makes an even splash. Every ring widens and fades and is then gone.
export function splash(goban, x, y, r, strength, direction = 0) {
    if (!Element.prototype.animate) {
        return;
    }
    const force = Math.min(1, strength);
    const ahead = [Math.cos(direction), Math.sin(direction)];
    const spread = 2.6 + 1.4*force;
    [0, 140].forEach((delay, i) => {
        ring(goban, x + ahead[0]*r*0.6*force, y + ahead[1]*r*0.6*force, r, {
            spread: spread - i*0.6,
            stretch: 1 + 0.5*force,
            direction,
            duration: 900 - i*150,
            delay,
            opacity: 0.85
        });
    });
    const drops = Math.round(force*4.5);
    for (let i = 0; i < drops; ++i) {
        const angle = direction + (Math.random() - 0.5)*Math.PI*0.45;
        const reach = r*(1.6 + Math.random()*2.6)*(0.6 + 0.4*force);
        const size = r*(0.28 + Math.random()*0.2);
        const flight = 220 + Math.random()*180;
        drop(goban, x, y, x + Math.cos(angle)*reach, y + Math.sin(angle)*reach, size, flight);
    }
}

// One ring, r (a stone's radius) across to start, widening to `spread`
// times that, `stretch` times longer along `direction` than across it,
// fading as it goes.
function ring(goban, x, y, r, {spread, stretch = 1, direction = 0, duration, delay = 0, opacity}) {
    const element = document.createElement('div');
    element.className = 'ripple';
    setStyles(element, {left: x - r, top: y - r, width: r*2, height: r*2});
    goban.append(element);
    const shape = (scale) => `rotate(${direction}rad) scale(${scale*stretch}, ${scale})`;
    const animation = element.animate([
        {transform: shape(0.7), opacity},
        {transform: shape(spread), opacity: 0}
    ], {duration, delay, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards'});
    const remove = () => element.remove();
    animation.addEventListener('finish', remove, {once: true});
    animation.addEventListener('cancel', remove, {once: true});
}

// A drop of water flung from (x, y) to (toX, toY) in `flight` ms: up and
// over (it swells as it rises and shrinks as it falls) and, as it comes
// down, a small ring where it lands.
function drop(goban, x, y, toX, toY, size, flight) {
    const element = document.createElement('div');
    element.className = 'droplet';
    setStyles(element, {left: x - size/2, top: y - size/2, width: size, height: size});
    goban.append(element);
    const dx = toX - x;
    const dy = toY - y;
    const animation = element.animate([
        {transform: 'translate(0, 0) scale(0.6)', opacity: 0.9},
        {transform: `translate(${dx*0.5}px, ${dy*0.5}px) scale(1.3)`, opacity: 0.95, offset: 0.45},
        {transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.4}
    ], {duration: flight, easing: 'ease-out', fill: 'forwards'});
    const land = () => {
        element.remove();
        ring(goban, toX, toY, size*1.2, {spread: 2.4, duration: 520, opacity: 0.55});
    };
    animation.addEventListener('finish', land, {once: true});
    animation.addEventListener('cancel', () => element.remove(), {once: true});
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
        onSplash: (stone, strength) => splash(goban, stone.x, stone.y, stone.r, strength, Math.atan2(stone.vy, stone.vx))
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
