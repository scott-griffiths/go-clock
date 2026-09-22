// The stones on the page: the images they are drawn with, the elements
// that hold them, their shadows, and the little animation helper that
// moves an element and settles its style where it stopped. go-clock.js,
// sweep.js and hand.js all draw with these; nothing here knows about the
// time or the grid.

import {white, black, gridsize, minx, maxx, miny, maxy} from './board.js';

const ext = "images/";

// The stones are 160px, for a board on a retina screen where one is drawn
// at up to 50 CSS pixels; resources/ has them at full size. The size is in
// the name because the service worker caches images by name for good.
const primaryWhiteStoneSrc = ext + "white_stone0_160.png";
const alternateWhiteStoneSrcs = [
    ext + "white_stone1_160.png",
    ext + "white_stone2_160.png",
    ext + "white_stone3_160.png"
];
const blackStoneSrc = ext + "black_stone1_160.png";
export const stoneSrcs = [primaryWhiteStoneSrc, ...alternateWhiteStoneSrcs, blackStoneSrc];

// The computer board: no picture, a plain rectangle the shape of the
// goban image with the same grid drawn on it, and the star points bold;
// and its stones, plain discs with a thin black rim. All drawn as SVG.
export const gobanImageSrc = ext + "goban_1200.jpg";
const boardWidth = 800;
const boardHeight = 857;
function svgSrc(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
export const computerBoardSrc = (() => {
    const lines = [];
    for (let i = 0; i < gridsize; ++i) {
        const x = (minx + i*(maxx - minx)/(gridsize - 1))*boardWidth;
        const y = (miny + i*(maxy - miny)/(gridsize - 1))*boardHeight;
        lines.push(`<line x1="${x.toFixed(1)}" y1="${(miny*boardHeight).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(maxy*boardHeight).toFixed(1)}"/>`);
        lines.push(`<line x1="${(minx*boardWidth).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(maxx*boardWidth).toFixed(1)}" y2="${y.toFixed(1)}"/>`);
    }
    const stars = [];
    [3, 9, 15].forEach((i) => [3, 9, 15].forEach((j) => {
        const x = (minx + i*(maxx - minx)/(gridsize - 1))*boardWidth;
        const y = (miny + j*(maxy - miny)/(gridsize - 1))*boardHeight;
        stars.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>`);
    }));
    return svgSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boardWidth} ${boardHeight}">`
        + `<rect width="${boardWidth}" height="${boardHeight}" fill="#dcb35c"/>`
        + `<g stroke="#000" stroke-width="1.6">${lines.join('')}</g>`
        + `<g fill="#000">${stars.join('')}</g></svg>`);
})();
const flatStoneSrc = (fill) => svgSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">`
    + `<circle cx="80" cy="80" r="77" fill="${fill}" stroke="#000" stroke-width="3"/></svg>`);
export const flatWhiteStoneSrc = flatStoneSrc('#fff');
export const flatBlackStoneSrc = flatStoneSrc('#000');
export function isFlatStoneSrc(src) {
    return src === flatWhiteStoneSrc || src === flatBlackStoneSrc;
}

// Whether the stones are the computer's flat discs (set by my-clock.js
// with the board): stoneImageSrc() gives those, and physics.js is told
// they do not ride up on each other.
let flatStones = false;
export function setFlatStones(on) {
    flatStones = on;
}

// The board image, and the stone images fetched ahead of their first use.
// Only in a browser: the modules this one serves also run under node for
// the tests, where there is no Image.
export let gobanImage = null;
if (typeof Image !== 'undefined') {
    stoneSrcs.forEach((src) => {
        const image = new Image();
        image.src = src;
    });
    gobanImage = new Image();
    gobanImage.src = gobanImageSrc;
}

// The table is a little further from the eye than the board, so a stone
// lying on it is drawn a little smaller: the transform for one that has
// dropped this far (0 to 1) off the edge; and one that has ridden `lift`
// (0 to 1, physics.js) of the way up onto another stone is that much
// nearer, and a little bigger for it.
export const tableStoneScale = 0.92;
export const rideScale = 0.07;
export function tableTransform(drop = 1, lift = 0) {
    const table = 1 - (1 - tableStoneScale)*Math.max(0, Math.min(1, drop));
    return `scale(${table*(1 + rideScale*lift)})`;
}

export const $ = (selector, scope = document) => scope.querySelector(selector);

// Inline styles, with a bare number meaning pixels.
export function setStyles(element, styles) {
    Object.entries(styles).forEach(([property, value]) => {
        if (value !== undefined) {
            element.style[property] = typeof value === 'number' ? `${value}px` : value;
        }
    });
}

export function setVisible(element, visible) {
    element.hidden = !visible;
}

// How high a carried stone rises, in the units of a stone's `height`:
// each unit is a twentieth more across, and a little higher up the board.
export const maxLift = 14;

// A stone's shadow, for a stone `height` (0 to maxLift) off the board:
// further away, softer and fainter the higher it is. The CSS reads these.
export function setStoneShadow(element, height = 0) {
    const lift = Math.min(height, maxLift);
    const liftRatio = lift/maxLift;
    const fade = Math.pow(1 - liftRatio, 1.4);
    element.style.setProperty('--stone-shadow-scale', 1);
    element.style.setProperty('--stone-shadow-opacity', Math.max(0.02, 0.72*fade));
    element.style.setProperty('--stone-shadow-fill-alpha', Math.max(0.01, 0.34*fade));
    element.style.setProperty('--stone-shadow-blur-alpha', Math.max(0.01, 0.4*fade));
    element.style.setProperty('--stone-shadow-blur-size', `${3 + lift*0.8}px`);
    element.style.setProperty('--stone-shadow-spread-size', `${1 - lift*0.06}px`);
    element.style.setProperty('--stone-shadow-offset-x', `${1.25 + lift*0.45}px`);
    element.style.setProperty('--stone-shadow-offset-y', `${1.75 + lift*0.4}px`);
}

// Half the white stones are the plain one, the rest one of three others.
function randomWhiteStoneSrc() {
    if (Math.random() < 0.5) {
        return primaryWhiteStoneSrc;
    }
    return alternateWhiteStoneSrcs[Math.floor(Math.random()*alternateWhiteStoneSrcs.length)];
}

// The image for a stone of this colour: the one it already has, if any
// (unless the stones have changed under it, flat to real or back).
export function stoneImageSrc(colour, preferredSrc = null) {
    if (flatStones) {
        return colour == white ? flatWhiteStoneSrc : flatBlackStoneSrc;
    }
    if (colour == white) {
        return preferredSrc && !isFlatStoneSrc(preferredSrc) ? preferredSrc : randomWhiteStoneSrc();
    }
    return blackStoneSrc;
}

// A stone's colour, read off its image.
export function colourOfImage(image) {
    return image.src.includes('black_stone') || image.src === flatBlackStoneSrc ? black : white;
}

export function cancelElementAnimations(element) {
    element.getAnimations?.().forEach((animation) => animation.cancel());
}

// Animates an element's style properties to `vars` over `duration`
// seconds, then writes them in as its style and calls onComplete. Pixel
// properties take bare numbers. Any animation already on the element is
// cancelled first unless `cancelExisting` is false.
export function animateElement(target, duration, vars) {
    const element = typeof target === 'string' ? $(target) : target;
    if (!element) {
        vars.onComplete?.();
        return;
    }

    const {delay = 0, easing = 'ease', onComplete, cancelExisting = true, ...styleProps} = vars;
    if (cancelExisting) {
        cancelElementAnimations(element);
    }

    const finalStyles = {};
    Object.entries(styleProps).forEach(([property, value]) => {
        finalStyles[property] = typeof value === 'number' && property !== 'opacity' ? `${value}px` : String(value);
    });

    const animation = element.animate(finalStyles, {
        duration: duration * 1000,
        delay: delay * 1000,
        easing,
        fill: 'forwards'
    });

    animation.addEventListener('finish', () => {
        setStyles(element, finalStyles);
        animation.cancel();
        onComplete?.();
    }, {once: true});
}

// Where an element's stone is now, mid-animation or not: its centre, in
// px within the goban element.
export function elementCentre(element, fallbackSize) {
    const style = getComputedStyle(element);
    const size = parseFloat(style.width) || fallbackSize;
    return [parseFloat(style.left) + size/2, parseFloat(style.top) + size/2];
}

// An element that holds a stone: a shadow beneath an image. The shadow
// starts hidden; the image is shown unless `imageHidden`.
export function stoneElement({id, className = '', position = 'absolute', imageHidden = false, hidden = false}) {
    const element = document.createElement('div');
    if (id) {
        element.id = id;
    }
    if (className) {
        element.className = className;
    }
    element.style.position = position;
    const shadow = document.createElement('div');
    shadow.className = 'stone-shadow';
    setVisible(shadow, false);
    element.append(shadow);
    const image = document.createElement('img');
    image.className = 'stone';
    image.alt = '';
    setVisible(image, !imageHidden);
    element.append(image);
    setVisible(element, !hidden);
    return element;
}

// A stone free of the grid, drawn by an element of its own on the goban:
// the element and the record the physics moves it by (see physics.js),
// centred at (x, y) px.
export function looseStone(goban, diameter, src, colour, x, y) {
    const element = stoneElement({className: 'board_pos loose-stone'});
    setStyles(element, {
        left: x - diameter/2,
        top: y - diameter/2,
        width: diameter,
        height: diameter
    });
    const shadow = element.querySelector('.stone-shadow');
    setStoneShadow(shadow, 0);
    setVisible(shadow, true);
    element.querySelector('img').src = src;
    goban.append(element);
    return {
        element: element,
        src: src,
        colour: colour,
        x: x,
        y: y,
        r: diameter/2,
        vx: 0,
        vy: 0,
        offBoard: false,
        leftAt: 0,
        landed: false,
        gone: false
    };
}

// A stone's element as it lies on the table, or drops onto it: `drop`
// (0 to 1) of the way down, the shadow up in the air and the stone that
// little smaller for being further away; and up on another stone by
// `lift`, if it has ridden up one.
export function drawOnTable(element, drop, translate = '', lift = 0) {
    setStoneShadow(element, drop < 1 ? 8*Math.sin(drop*Math.PI) : rideHeight*lift);
    element.style.transform = `${translate} ${tableTransform(drop, lift)}`.trim();
    element.classList.toggle('riding', lift > 0);
}

// How high a stone ridden fully up onto another stands, in the units of
// setStoneShadow: a bit of a stone's thickness, not a hand's lift.
export const rideHeight = 3;

// A stone's element as it lies on the board, ridden `lift` of the way up
// onto another stone or not, and drawn over the one beneath if so.
export function drawOnBoard(element, lift, translate = '') {
    const scale = lift > 0 ? `scale(${1 + rideScale*lift})` : '';
    element.style.transform = `${translate} ${scale}`.trim();
    if (lift > 0 || element.classList.contains('riding')) {
        setStoneShadow(element, rideHeight*lift);
        element.classList.toggle('riding', lift > 0);
    }
}
