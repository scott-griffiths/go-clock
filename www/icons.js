// The toolbar's line icons, as SVG markup: one per clock face, drawn as
// each looks at 10:09 (hands or digits alike) and indexed as the views
// are (faces.js); one per speed; one per precision; and the rest of the
// buttons and toasts.
// A setting's button wears the icon of its current choice, and so does
// each choice beside its name. Stroked in the text colour, so they take
// a button's colour when it is pressed.

const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

// Twelve dots round a ring, `filled` and `hollow` picking out particular
// hours (0 is twelve, clockwise).
function dots(cx, cy, r, {filled = [], hollow = []} = {}) {
    let out = '';
    for (let i = 0; i < 12; ++i) {
        const theta = i*Math.PI/6;
        const x = (cx + r*Math.sin(theta)).toFixed(2);
        const y = (cy - r*Math.cos(theta)).toFixed(2);
        if (hollow.includes(i)) {
            out += `<circle cx="${x}" cy="${y}" r="1.6"/>`;
        } else if (filled.includes(i)) {
            out += `<circle cx="${x}" cy="${y}" r="1.6" fill="currentColor" stroke="none"/>`;
        } else {
            out += `<circle cx="${x}" cy="${y}" r="0.85" fill="currentColor" stroke="none"/>`;
        }
    }
    return out;
}

// The digits, at a height: 1 and 0, and the 09 of nine minutes past.
const one = (x, top, h) => `<path d="M${x} ${top + h*0.22}l${h*0.2} -${h*0.22}v${h}"/>`;
const zero = (x, top, h, w) => `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${w/2}"/>`;
const nine = (x, top, h, w) => {
    const r = w/2;
    const cy = top + r;
    return `<circle cx="${x + r}" cy="${cy}" r="${r}"/>`
        + `<path d="M${x + w} ${cy}v${h - r - w*0.45}c0 ${w*0.35} -${w*0.35} ${w*0.45} -${w*0.9} ${w*0.45}"/>`;
};

export const faceIcons = [
    // Analogue: the hour hand towards ten, the minute hand nine past, in a
    // ring of dots for the hours, as the jumping hour's (the solid ring is
    // the clock's own icon, below).
    svg(dots(12, 12, 9.75) + '<path d="M12 12l-4.1 -2.8M12 12l6 -4.3"/>'),
    // Jumping hour: ten lit on the ring, 09 within.
    svg(dots(12, 12, 9.75, {hollow: [10]}) + zero(7.7, 9, 6, 3.4) + nine(13, 9, 6, 3.4)),
    // Digital: 10 above, in the bigger figures, 09 below.
    svg(one(6.5, 2.5, 9) + zero(11.5, 2.5, 9, 5) + zero(8, 15, 6.5, 3.6) + nine(13.6, 15, 6.5, 3.6)),
    // Hybrid: 10:09 along the top, the seconds on a ring below.
    svg(one(2.4, 2.5, 5.5) + zero(6.5, 2.5, 5.5, 3) + '<path d="M12 4v0.01M12 6.5v0.01"/>'
        + zero(14.5, 2.5, 5.5, 3) + nine(19, 2.5, 5.5, 3)
        + dots(12, 16, 6.25, {filled: [0]}) + '<path d="M12 16v-3.6"/>')
];

// The hand's speeds, slow to magic: a chevron held back by a bar for
// slow, on its own for normal, doubled for fast, and doubled and pointed
// with a bang for magic. Playback, which has its own pause, goes
// without the bar.
export const speedIcons = [
    svg('<path d="M6.5 5v14M10 5l7 7 -7 7"/>'),
    svg('<path d="M8 5l7 7 -7 7"/>'),
    svg('<path d="M4.5 5l7 7 -7 7M12.5 5l7 7 -7 7"/>'),
    svg('<path d="M2.5 5l7 7 -7 7M9.5 5l7 7 -7 7M21 5v9M21 18.5v0.01"/>')
];

// The precisions: a circle with cross hairs through its middle. Exact is
// drawn true; organic has the hairs a touch off centre and askew; and
// careless has them well off and the circle wobbly.
const crossHairs = (dx, dy, tilt, wobble = 0) => {
    const cx = 12 + dx;
    const cy = 12 + dy;
    const reach = 8.8;
    const hairs = [0, Math.PI/2].map((angle) => {
        const a = angle + tilt;
        const x = reach*Math.cos(a);
        const y = reach*Math.sin(a);
        return `<path d="M${(cx - x).toFixed(2)} ${(cy - y).toFixed(2)}L${(cx + x).toFixed(2)} ${(cy + y).toFixed(2)}"/>`;
    }).join('');
    // The circle as an ellipse leaning over, when it is not drawn true.
    const circle = wobble
        ? `<ellipse cx="12" cy="12" rx="${(8.5 + wobble).toFixed(2)}" ry="${(8.5 - wobble).toFixed(2)}" transform="rotate(${(tilt*57.3 - 25).toFixed(1)} 12 12)"/>`
        : '<circle cx="12" cy="12" r="8.5"/>';
    return circle + hairs;
};

// The backgrounds: a tall pine and a short one for wood, a tuft of long
// grass bent over at the tips, a snowflake for ice, a couple of waves for
// water, and a pair of sparkles for space.
export const backgroundIcons = [
    svg('<path d="M8.25 2.5L13 15.5H3.5ZM8.25 15.5v5M17 8.5l3.5 8h-7ZM17 16.5v4"/>'),
    svg('<path d="M4 20.5h16"/><path d="M12 20.5C11.5 13 12.5 6.5 16 4.5M10.5 20.5C10 13 7 8 3.5 10'
        + 'M13.5 20.5C14 14 17.5 9.5 20.5 11.5M11 20.5C10.5 14 9.5 8.5 7 5.5"/>'),
    svg('<path d="M12 3v18M4.8 7.5l14.4 9M19.2 7.5l-14.4 9"/>'
        + '<path d="M9.8 4.6l2.2 1.3 2.2-1.3M9.8 19.4l2.2-1.3 2.2 1.3"/>'
        + '<path d="M5.6 9.7l.3-2.5 2.3-1M5.6 14.3l.3 2.5 2.3 1M18.4 9.7l-.3-2.5-2.3-1M18.4 14.3l-.3 2.5-2.3 1"/>'),
    svg('<path d="M2.5 9c1.8-2 3.8-2 5.6 0s3.8 2 5.6 0 3.8-2 5.6 0"/>'
        + '<path d="M2.5 15c1.8-2 3.8-2 5.6 0s3.8 2 5.6 0 3.8-2 5.6 0"/>'),
    svg('<path d="M8 4l1.3 3.7L13 9l-3.7 1.3L8 14l-1.3-3.7L3 9l3.7-1.3Z" fill="currentColor" stroke="none"/>'
        + '<path d="M17 12.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9Z" fill="currentColor" stroke="none"/>')
];

// The board's wood, each stood in front of the board it makes: the board
// just its edges, up and to the right, broken off with a gap where they
// would pass behind. The wood is drawn full size and shrunk into the
// corner, its lines kept as thick as the other icons'.
const behind = {left: 6, top: 1.5, right: 22.5, bottom: 18};
const inFront = {scale: 0.85, x: -1.5, y: 4.2, gapTop: 3, gapRight: 1.5};

function onBoard(body) {
    const {left, top, right, bottom} = behind;
    const {scale, x, y, gapTop, gapRight} = inFront;
    // Where the wood's 24 box (less its usual 3 margin) lands, and so where
    // the left and bottom edges stop short of it.
    const stopY = y + 3*scale - gapTop;
    const startX = x + 21*scale + gapRight;
    return svg(`<path d="M${left} ${stopY}V${top}H${right}V${bottom}H${startX}" stroke-width="1.1"/>`
        + `<g transform="translate(${x} ${y}) scale(${scale})" stroke-width="${(1.5/scale).toFixed(2)}">${body}</g>`);
}

// A broad, cloud-shaped canopy on a forked trunk for oak, a tiered
// conifer for kaya (a real tree, the one Go boards are prized for), and
// a robot's head on its neck and shoulders for the computer's own plain
// board.
export const woodIcons = [
    onBoard('<path d="M7 12a3.3 3.3 0 0 1 1.3-6.2 4 4 0 0 1 7.4 0A3.3 3.3 0 0 1 17 12a3 3 0 0 1-2.4 4.8H9.4A3 3 0 0 1 7 12Z"/>'
        + '<path d="M12 21V13M12 16.8l-2.2-2.2M12 15.4l2-1.8"/>'),
    onBoard('<path d="M12 3l4 5.3h-2.6L17 12.7h-2.8L18 18H6l3.8-5.3H7l3.6-4.4H8Z"/><path d="M10.8 18v3.5h2.4V18"/>'),
    onBoard('<rect x="5" y="5.5" width="14" height="10" rx="2.5"/><path d="M12 5.5V3.5"/>'
        + '<circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/>'
        + '<circle cx="9.3" cy="9.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.7" cy="9.5" r="1.2" fill="currentColor" stroke="none"/>'
        + '<path d="M10.5 12.5h3M12 15.5v2.5M5.5 22c0-2.5 2.8-4 6.5-4s6.5 1.5 6.5 4"/>')
];

export const precisionIcons = [
    svg(crossHairs(0, 0, 0)),
    svg(crossHairs(1.2, -0.9, 0.12)),
    svg(crossHairs(2.1, 1.6, 0.36, 0.8))
];

// The board the games are played on, empty and cut down to five lines a
// side, drawn finer than the rest.
function miniGoban() {
    const first = 3;
    const last = 21;
    let body = `<g stroke-width="0.9"><rect x="${first}" y="${first}" width="${last - first}" height="${last - first}" rx="0.5"/>`;
    [7.5, 12, 16.5].forEach((at) => {
        body += `<path d="M${at} ${first}V${last}M${first} ${at}H${last}"/>`;
    });
    return body + '</g>';
}

export const icons = {
    // The tools icon: a wrench, for what is done with the clock rather
    // than how it looks, in outline like the rest.
    tools: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z"/>'),
    // The clock, as a tool beside the replay: a clock face, its hands at
    // ten past ten, whichever face is showing.
    clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 12l-4.1 -2.8M12 12l6.5 -4.7"/>'),
    // The board's own settings: the goban, bare.
    board: svg(miniGoban()),
    // A game replayed: the goban, with a play button over it.
    replay: svg(miniGoban() + '<path d="M8.75 7v10l8.25 -5Z" fill="currentColor" stroke="none"/>'),
    // The stopwatch: its case, the crown on top that starts and stops it,
    // the button beside that, and the hand a third of the way round.
    stopwatch: svg('<circle cx="12" cy="13.5" r="8"/><path d="M12 5.5V3M9.5 2.5h5M17.7 7.8l1.4 -1.4"/>'
        + '<path d="M12 13.5l3.9 -2.25"/><circle cx="12" cy="13.5" r="1" fill="currentColor" stroke="none"/>'),
    // The gallery: a picture in its frame, of a sun over the hills.
    gallery: svg('<rect x="3" y="4.5" width="18" height="15" rx="1.5"/><circle cx="15.5" cy="9" r="1.6"/>'
        + '<path d="M3.5 17l5 -5 4 4 2.5 -2.5 5.5 5"/>'),
    // Back a picture, and on one: a bar and a triangle pointing at it.
    back: svg('<path d="M6.5 6v12" stroke-width="2"/><path d="M18 5.5v13L8.5 12Z" fill="currentColor" stroke="none"/>'),
    next: svg('<path d="M17.5 6v12" stroke-width="2"/><path d="M6 5.5v13L15.5 12Z" fill="currentColor" stroke="none"/>'),
    // The stopwatch put back to nothing: an arrow round anticlockwise.
    reset: svg('<path d="M5.2 15.5a7.5 7.5 0 1 0 1.1 -8.3L3.5 10"/><path d="M3.5 5v5h5"/>'),
    // The replay held, or playing: a play triangle, for the button that
    // would set it going again; two bars, for the one that would hold it.
    play: svg('<path d="M7.5 5v14l11.5 -7Z" fill="currentColor" stroke="none"/>'),
    pause: svg('<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="2.5"/>'),
    // Sound, on and off: a speaker, with waves coming off it or crossed out.
    sound: [
        svg('<path d="M4 9.25h3.4L12 5.25v13.5L7.4 14.75H4Z"/><path d="M15.5 9l5.5 5.5M21 9l-5.5 5.5"/>'),
        svg('<path d="M4 9.25h3.4L12 5.25v13.5L7.4 14.75H4Z"/><path d="M15.25 9.25a4.5 4.5 0 0 1 0 5.5M18 6.75a8 8 0 0 1 0 10.5"/>')
    ],
    // About: an "i" in a ring.
    about: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>'),
    // The clock's hours, 12 or 24, in figures.
    hours: ['12', '24'].map((figures) => svg(`<text x="12" y="16.3" text-anchor="middle" font-size="12" font-weight="700" font-family="system-ui, sans-serif" fill="currentColor" stroke="none">${figures}</text>`)),
    // The seconds, off and on: a dial with its second hand, crossed out
    // while they are hidden.
    seconds: [
        svg('<circle cx="12" cy="12" r="8.5"/>' + dots(12, 12, 6.2) + '<path d="M4 20L20 4"/>'),
        svg('<circle cx="12" cy="12" r="8.5"/>' + dots(12, 12, 6.2) + '<path d="M12 12V5.5" stroke-width="1.2"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>')
    ]
};
