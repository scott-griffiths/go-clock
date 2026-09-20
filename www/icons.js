// The toolbar's line icons, as SVG markup: one per clock face, drawn as
// each looks at 10:09 (hands or digits alike) and indexed as the views
// are (faces.js); one per speed; and the rest of the buttons and toasts.
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

// The speeds, slow to insane: a chevron, laid open for slow, doubled for
// fast, and doubled and pointed with a bang for insane.
export const speedIcons = [
    svg('<path d="M6 6.5l11 5.5 -11 5.5"/>'),
    svg('<path d="M8 5l7 7 -7 7"/>'),
    svg('<path d="M4.5 5l7 7 -7 7M12.5 5l7 7 -7 7"/>'),
    svg('<path d="M2.5 5l7 7 -7 7M9.5 5l7 7 -7 7M21 5v9M21 18.5v0.01"/>')
];

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

export const icons = {
    settings: svg(cog(8, 10.5, 7.75)),
    // A game replayed: play.
    replay: svg('<path d="M7.5 4.5l12 7.5 -12 7.5Z"/>'),
    // The background: a picture in a frame.
    background: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16.5l5 -5 4.5 4.5 3 -3 5.5 5.5"/><circle cx="15.5" cy="8.5" r="1.5"/>'),
    // The toggle for the rest of the row: a cross while they show, a
    // menu's three bars while they are tucked away.
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>')
};
