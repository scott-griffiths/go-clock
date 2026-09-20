// A line icon per clock face, drawn as each looks at 10:09 (hands or
// digits alike), indexed as the views are (faces.js). In the face button
// to show which face is on the board, and beside each choice. Stroked
// in the text colour, so they take a button's colour when it is pressed.

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
