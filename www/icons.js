// The toolbar's line icons, as SVG markup: one per clock face, drawn as
// each looks at 10:09 (hands or digits alike) and indexed as the views
// are (faces.js); one per speed; one per precision; one per shelf of
// games; and the rest of the buttons and toasts.
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
    // Analogue: the hour hand towards ten, the minute hand nine past.
    svg('<circle cx="12" cy="12" r="10"/><path d="M12 12l-4.1 -2.8M12 12l6.5 -4.7"/>'),
    // Jumping hour: ten lit on the ring, 09 within.
    svg(dots(12, 12, 9.75, {hollow: [10]}) + zero(7.7, 9, 6, 3.4) + nine(13, 9, 6, 3.4)),
    // Digital: 10 above, in the bigger figures, 09 below.
    svg(one(6.5, 2.5, 9) + zero(11.5, 2.5, 9, 5) + zero(8, 15, 6.5, 3.6) + nine(13.6, 15, 6.5, 3.6)),
    // Hybrid: 10:09 along the top, the seconds on a ring below.
    svg(one(2.4, 2.5, 5.5) + zero(6.5, 2.5, 5.5, 3) + '<path d="M12 4v0.01M12 6.5v0.01"/>'
        + zero(14.5, 2.5, 5.5, 3) + nine(19, 2.5, 5.5, 3)
        + dots(12, 16, 6.25, {filled: [0]}) + '<path d="M12 16v-3.6"/>')
];

// The speeds, slow to magic: a chevron, held back by a bar for slow, on
// its own for normal, doubled for fast, doubled and pointed with a bang
// for insane, and a bang and a query for magic.
export const speedIcons = [
    svg('<path d="M6.5 5v14M10 5l7 7 -7 7"/>'),
    svg('<path d="M8 5l7 7 -7 7"/>'),
    svg('<path d="M4.5 5l7 7 -7 7M12.5 5l7 7 -7 7"/>'),
    svg('<path d="M2.5 5l7 7 -7 7M9.5 5l7 7 -7 7M21 5v9M21 18.5v0.01"/>'),
    svg('<path d="M6.5 5v9M6.5 18.5v0.01M11.5 8.25a3.5 3.5 0 1 1 5 3.15c-1 0.5 -1.5 1.2 -1.5 2.35v0.3M15 18.5v0.01"/>')
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

export const precisionIcons = [
    svg(crossHairs(0, 0, 0)),
    svg(crossHairs(1.2, -0.9, 0.12)),
    svg(crossHairs(2.1, 1.6, 0.36, 0.8))
];

// The shelves of games (replay.js): a hanging scroll for the old castle
// games, a cup for the modern title matches and international finals, and
// a chip for the games an engine played.
export const gameIcons = {
    historical: svg('<path d="M4 4.5h16M4 19.5h16"/><path d="M6.5 4.5v15M17.5 4.5v15"/>'
        + '<path d="M9.5 8.5h5M9.5 12h5M9.5 15.5h3"/>'),
    modern: svg('<path d="M8 4h8v4.5a4 4 0 0 1 -8 0Z"/>'
        + '<path d="M8 5.75H5.25v1.25a3.5 3.5 0 0 0 2.9 3.45M16 5.75h2.75v1.25a3.5 3.5 0 0 1 -2.9 3.45"/>'
        + '<path d="M12 12.5v3.5M9.6 16h4.8l1.4 4h-7.6Z"/>'),
    ai: svg('<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10.5" y="10.5" width="3" height="3"/>'
        + '<path d="M10 7V3.75M14 7V3.75M10 20.25V17M14 20.25V17M7 10H3.75M7 14H3.75M20.25 10H17M20.25 14H17"/>')
};

// A cog: `teeth` of them round a ring, and the hole.
function cog(teeth, outer, inner) {
    let d = '';
    for (let i = 0; i < teeth; ++i) {
        const a = 2*Math.PI*i/teeth;
        const step = Math.PI/teeth;
        // Out along the tooth's leading flank, across its top, and back down.
        const points = [[inner, a - step*0.5], [outer, a - step*0.28], [outer, a + step*0.28], [inner, a + step*0.5]];
        for (const [r, theta] of points) {
            d += `${d ? 'L' : 'M'}${(12 + r*Math.sin(theta)).toFixed(2)} ${(12 - r*Math.cos(theta)).toFixed(2)}`;
        }
    }
    return `<path d="${d}Z"/><circle cx="12" cy="12" r="3"/>`;
}

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
    settings: svg(cog(8, 10.5, 7.75)),
    // A game replayed: the goban, with a play button over it.
    replay: svg(miniGoban() + '<path d="M8.75 7v10l8.25 -5Z" fill="currentColor" stroke="none"/>'),
    // The replay held where it is: two bars, beside the chevrons of the
    // playback's speeds (the speed icons); and let go again, a single
    // triangle.
    pause: svg('<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="2.5"/>'),
    play: svg('<path d="M8 5.5v13l10 -6.5Z" fill="currentColor" stroke="none"/>'),
    // Sound, on and off: a speaker, with waves coming off it or crossed out.
    sound: [
        svg('<path d="M4 9.25h3.4L12 5.25v13.5L7.4 14.75H4Z"/><path d="M15.5 9l5.5 5.5M21 9l-5.5 5.5"/>'),
        svg('<path d="M4 9.25h3.4L12 5.25v13.5L7.4 14.75H4Z"/><path d="M15.25 9.25a4.5 4.5 0 0 1 0 5.5M18 6.75a8 8 0 0 1 0 10.5"/>')
    ],
    // The background: a picture in a frame.
    background: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16.5l5 -5 4.5 4.5 3 -3 5.5 5.5"/><circle cx="15.5" cy="8.5" r="1.5"/>'),
    // The toggle for the rest of the row: a cross while they show, a
    // menu's three bars while they are tucked away.
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>')
};
