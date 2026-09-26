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
// A flat stone's outline is its own, a pixel or so wide on a phone, and
// grows with the stone as it is lifted: the shadow, which fades as it
// rises, is not left to draw the edge of a white one.
const flatStoneSrc = (fill) => svgSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">`
    + `<circle cx="80" cy="80" r="75.5" fill="${fill}" stroke="#000" stroke-width="9"/></svg>`);
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

// How high a stone carried `points` across the board is lifted at the
// top of its arc (moves.js, magic.js): a little higher the further it
// goes, but not so high that it looms, many at once in magic.
export function carryHeight(points) {
    return Math.min(8, 4 + points/3);
}

// For looking at how the shadows behave: true draws them in solid red
// with a crisp edge, in exactly the place and size they otherwise have.
export const shadowDebug = false;
const shadowRgb = shadowDebug ? '220 0 0' : '0 0 0';

// A stone's shadow, for a stone `height` (0 to maxLift) off the board:
// further away, softer and fainter the higher it is, but still there to
// see all the way up, so it does not seem to arrive only as the stone
// lands. The look at a height, as numbers.
function shadowLook(height) {
    const lift = Math.max(0, Math.min(height, maxLift));
    const t = lift/maxLift;
    if (shadowDebug) {
        return {
            opacity: 0.9,
            fill: 0.9,
            glow: 0.9,
            blur: 0.5,
            spread: 1 - lift*0.06,
            dx: 1.25 + lift*0.45,
            dy: 1.75 + lift*0.4
        };
    }
    return {
        opacity: 0.72*(1 - 0.5*t),
        fill: 0.34*(1 - 0.45*t),
        glow: 0.4*(1 - 0.25*t),
        blur: 3 + lift*0.8,
        spread: 1 - lift*0.06,
        dx: 1.25 + lift*0.45,
        dy: 1.75 + lift*0.4
    };
}

// The shadow element of a stone's element (or the shadow itself): the
// look is set on it, not left to be inherited, since it has its own.
function shadowOf(element) {
    return element.classList.contains('stone-shadow') ? element : element.querySelector('.stone-shadow') ?? element;
}

// The camera is focused on the board's surface: a stone lifted off it,
// nearer the eye, is out of focus, the more so the higher it is; its
// shadow, lying on the surface, stays sharp, and so does a stone on the
// table, further off than the board. The blur at a height, in px: a share
// of the stone's own width at the most (maxLift), so it looks the same on
// any screen.
export const liftBlur = 0.12;
function liftBlurAt(stone, height) {
    const width = parseFloat(stone.parentElement?.style.width) || 0;
    return Math.round(Math.max(0, Math.min(height, maxLift))/maxLift*liftBlur*width*10)/10;
}
const blurFilter = (px) => (px > 0 ? `blur(${px}px)` : '');

// The stone image beside a shadow, which the blur is on.
function stoneBeside(shadow) {
    return shadow.parentElement?.querySelector(':scope > img') ?? null;
}

// The stone as sharp or as soft as `height` makes it; any animation of
// it (animateStoneShadow) called off. Set only when it changes: the hand
// and the sweep draw every stone every frame.
function setLiftFocus(shadow, height) {
    const stone = stoneBeside(shadow);
    if (!stone) {
        return;
    }
    if (stone.focusAnimation) {
        stone.focusAnimation.cancel();
        stone.focusAnimation = null;
    }
    const filter = blurFilter(liftBlurAt(stone, height));
    if (stone.style.filter !== filter) {
        stone.style.filter = filter;
    }
}

// The shadow set to its look at `height`, and the stone its focus, for
// how far it stands above the board's surface (`above`: the height,
// unless it is below the board, on the table). The CSS reads these; any
// animation of either (animateStoneShadow) is called off.
export function setStoneShadow(element, height = 0, above = height) {
    const shadow = shadowOf(element);
    if (shadow.shadowAnimation) {
        shadow.shadowAnimation.cancel();
        shadow.shadowAnimation = null;
    }
    setLiftFocus(shadow, above);
    const look = shadowLook(height);
    shadow.style.setProperty('--stone-shadow-opacity', look.opacity);
    shadow.style.setProperty('--stone-shadow-rgb', shadowRgb);
    shadow.style.setProperty('--stone-shadow-fill-alpha', look.fill);
    shadow.style.setProperty('--stone-shadow-blur-alpha', look.glow);
    shadow.style.setProperty('--stone-shadow-blur-size', `${look.blur}px`);
    shadow.style.setProperty('--stone-shadow-spread-size', `${look.spread}px`);
    shadow.style.setProperty('--stone-shadow-offset-x', `${look.dx}px`);
    shadow.style.setProperty('--stone-shadow-offset-y', `${look.dy}px`);
    if (height > 0) {
        trackShadow(shadow);
    }
}

// Where a lifted stone's shadow falls: on the board, beneath it. A stone
// is drawn bigger the higher it is, and pushed out from the middle of the
// board as it grows (pixelStonePosition, go-clock.js), so its size says
// how high it is and where the point beneath it is; its shadow lies there
// on the board, as big as the stone is there, and further off down and
// to the right the higher it is, the light being up to the left. The
// board's own measures, set with each draw (go-clock.js): a stone's width
// lying on it, and its middle, in the goban element's px.
let board = null;
export function setShadowBoard(geometry) {
    board = geometry;
}

// How far a shadow falls from beneath its stone, for each unit of height
// (as maxLift), in stone widths across and down.
const shadowFall = [0.16, 0.19];

// The shadows of stones that are, or are going to be, off the board,
// placed every frame while they are: a stone's height changes with every
// step of whatever is moving it (moves.js, magic.js, the replay, the hand).
const lifted = new Set();
let shadowFrame = null;
function trackShadow(shadow) {
    lifted.add(shadow);
    if (shadowFrame === null && typeof requestAnimationFrame !== 'undefined') {
        shadowFrame = requestAnimationFrame(placeShadows);
    }
}
function placeShadows() {
    shadowFrame = null;
    // The goban's own box: stones are measured from it, and in its own px
    // (a stand-in for a rebuild scales it all: go-clock.js).
    const goban = typeof document !== 'undefined' && document.getElementById('goban');
    const gobanBox = goban?.getBoundingClientRect();
    const zoom = gobanBox && goban.offsetWidth ? gobanBox.width/goban.offsetWidth : 1;
    lifted.forEach((shadow) => {
        if (placeShadow(shadow, gobanBox, zoom)) {
            lifted.delete(shadow);
        }
    });
    if (lifted.size > 0) {
        shadowFrame = requestAnimationFrame(placeShadows);
    }
}

// One shadow put where it falls; returns whether its stone is down (or
// gone) and done with, its shadow back under it as a stone lying on the
// board has it. Measured from the stone's painted box, not its layout
// one: that is in whole px, and a stone's height from its width would go
// up in steps.
function placeShadow(shadow, gobanBox, zoom) {
    const stone = shadow.parentElement;
    const box = stone?.isConnected && !stone.hidden ? stone.getBoundingClientRect() : null;
    const width = box ? box.width/zoom : 0;
    const scale = board && gobanBox && width ? width/board.diameter : 1;
    if (!box || scale < 1.01) {
        if (shadow.style.transform) {
            shadow.style.transform = '';
        }
        return !box || (stone.getAnimations().length == 0 && shadow.getAnimations().length == 0);
    }
    // Its middle, the point beneath it, and its height.
    const cx = (box.left - gobanBox.left)/zoom + width/2;
    const cy = (box.top - gobanBox.top)/zoom + box.height/zoom/2;
    const gx = board.centreX + (cx - board.centreX)/scale;
    const gy = board.centreY + (cy - board.centreY)/scale;
    const height = (scale - 1)*20;
    const sx = gx + shadowFall[0]*board.diameter*height;
    const sy = gy + shadowFall[1]*board.diameter*height;
    shadow.style.transform = `translate(${(sx - cx).toFixed(2)}px, ${(sy - cy).toFixed(2)}px) scale(${(1/scale).toFixed(4)})`;
    return false;
}

// The shadow following its stone from `from` to `to` high over
// `duration` seconds, eased as the stone is, so it rises and comes down
// with it rather than jumping at either end; and the stone going out of
// focus and back as it does. Left set to `to`.
export function animateStoneShadow(element, from, to, duration, {easing = 'ease', delay = 0} = {}) {
    const shadow = shadowOf(element);
    setStoneShadow(shadow, to);
    if (!shadow.animate || duration <= 0) {
        return;
    }
    // The look is not linear in the height: a few steps along the way.
    const steps = 6;
    const keyframes = [];
    for (let i = 0; i <= steps; ++i) {
        const look = shadowLook(from + (to - from)*i/steps);
        // Its place is placeShadow's, every frame.
        keyframes.push({
            opacity: look.opacity,
            backgroundColor: `rgb(${shadowRgb} / ${look.fill})`,
            boxShadow: `0 0 ${look.blur}px ${look.spread}px rgb(${shadowRgb} / ${look.glow})`
        });
    }
    const timing = {duration: duration*1000, delay: delay*1000, easing, fill: 'backwards'};
    const animation = shadow.animate(keyframes, timing);
    trackShadow(shadow);
    shadow.shadowAnimation = animation;
    animation.addEventListener('finish', () => {
        if (shadow.shadowAnimation === animation) {
            shadow.shadowAnimation = null;
        }
    }, {once: true});
    const stone = stoneBeside(shadow);
    if (stone?.animate) {
        const focus = stone.animate([
            {filter: blurFilter(liftBlurAt(stone, from)) || 'blur(0px)'},
            {filter: blurFilter(liftBlurAt(stone, to)) || 'blur(0px)'}
        ], timing);
        stone.focusAnimation = focus;
        focus.addEventListener('finish', () => {
            if (stone.focusAnimation === focus) {
                stone.focusAnimation = null;
            }
        }, {once: true});
    }
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
// px within the goban element (gobanRect: goban.getBoundingClientRect()).
// Read from the element's actual painted box, not a computed style: a
// left/top Web Animation is not reliably reflected in computed style
// mid-flight in every engine, and a stale read here is a stone that
// visibly jumps back to where it started the moment a finger picks it up
// out from under a move already under way. Falls back to the old,
// computed-style reading for a hidden element, whose box is empty.
export function elementCentre(element, fallbackSize, gobanRect) {
    const rect = element.getBoundingClientRect();
    if (gobanRect && (rect.width || rect.height)) {
        const size = rect.width || fallbackSize;
        return [rect.left - gobanRect.left + size/2, rect.top - gobanRect.top + size/2];
    }
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
    // Going down, and lying, below the board: never nearer the eye.
    setStoneShadow(element, drop < 1 ? 8*Math.sin(drop*Math.PI) : rideHeight*lift, 0);
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
