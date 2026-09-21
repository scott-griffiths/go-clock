// The two bowls the stones come from and go back to: a circle at either
// end of the board with a heap of stones in it. The heap is decoration —
// a real bowl holds a hundred and eighty and you cannot tell by looking
// whether one has left it — so taking a stone does not empty it and
// putting one back does not add to it. What the rest of the app wants
// from here is a point to reach into (bowlPoint) and how far away that
// is in board units (bowlDistance), so a trip to the bowl can be timed
// like any other move.

import {white} from './board.js';
import {setStyles, stoneImageSrc, tableStoneScale} from './stone-dom.js';

// Stones in a bowl's heap. Enough to look full, few enough to draw.
const heapSize = 24;

// A bowl is about a quarter of the board across, as a real one is, but
// never more than the space beside the board can hold.
const bowlShare = 0.15;

// Where the bowls go: in whichever margin is the wider, at opposite ends,
// and set off from each other the way two players' bowls end up — the
// near right of each side of the board. Returns px within #goban.
export function bowlLayout(clock) {
    const stone = clock.goban_width/20;
    const marginX = clock.x_offset;
    const marginY = clock.y_offset;
    const beside = marginX >= marginY;
    const margin = beside ? marginX : marginY;
    const radius = Math.max(stone*1.7, Math.min(clock.goban_width*bowlShare, margin*0.44));

    // A window with no margin worth the name — nearly square, so the board
    // fills it both ways — has nowhere to put a bowl but over the board's
    // own corner. Better there than half off the screen.
    const onScreen = (centre) => ({
        x: Math.max(radius, Math.min(clock.window_width - radius, centre.x)),
        y: Math.max(radius, Math.min(clock.window_height - radius, centre.y))
    });

    if (beside) {
        const near = clock.y_offset + clock.goban_height*0.62;
        const far = clock.y_offset + clock.goban_height*0.38;
        return {
            radius: radius,
            black: onScreen({x: marginX/2, y: near}),
            white: onScreen({x: clock.x_offset + clock.goban_width + marginX/2, y: far})
        };
    }
    const near = clock.x_offset + clock.goban_width*0.62;
    const far = clock.x_offset + clock.goban_width*0.38;
    return {
        radius: radius,
        black: onScreen({x: near, y: marginY/2}),
        white: onScreen({x: far, y: clock.y_offset + clock.goban_height + marginY/2})
    };
}

// A scatter of stones lying in a bowl: each a distance from the middle
// biased towards the rim, as stones settle into a curve, and none of them
// over the edge.
function heapPositions(radius, stone) {
    const positions = [];
    const reach = Math.max(0, radius - stone*0.62);
    for (let i = 0; i < heapSize; ++i) {
        const angle = Math.random()*2*Math.PI;
        const distance = reach*Math.sqrt(Math.random());
        positions.push([Math.cos(angle)*distance, Math.sin(angle)*distance]);
    }
    // Drawn from the back of the bowl forwards, so the near stones lie
    // over the far ones rather than under them.
    return positions.sort((a, b) => a[1] - b[1]);
}

function bowlElement(clock, centre, radius, colour) {
    const element = document.createElement('div');
    element.className = 'go-bowl';
    setStyles(element, {
        left: centre.x - radius,
        top: centre.y - radius,
        width: radius*2,
        height: radius*2
    });

    const stone = (clock.goban_width/20)*tableStoneScale;
    heapPositions(radius, stone).forEach(([dx, dy]) => {
        const image = document.createElement('img');
        image.className = 'bowl-stone';
        image.alt = '';
        image.src = stoneImageSrc(colour);
        setStyles(image, {
            left: radius + dx - stone/2,
            top: radius + dy - stone/2,
            width: stone,
            height: stone
        });
        element.append(image);
    });
    return element;
}

// The bowls for the board as it now is, appended to the goban. Called by
// draw() in go-clock.js, which has just emptied the goban element.
export function drawBowls(clock, goban) {
    const layout = bowlLayout(clock);
    clock.bowls = layout;
    goban.append(bowlElement(clock, layout.black, layout.radius, 3));
    goban.append(bowlElement(clock, layout.white, layout.radius, white));
}

function bowlCentre(clock, colour) {
    const layout = clock.bowls || bowlLayout(clock);
    return colour == white ? layout.white : layout.black;
}

// The px point a hand reaches into, or drops a stone onto: somewhere in
// the bowl rather than dead centre, so no two trips end alike.
export function bowlPoint(clock, colour) {
    const layout = clock.bowls || bowlLayout(clock);
    const centre = bowlCentre(clock, colour);
    const reach = layout.radius*0.45;
    const angle = Math.random()*2*Math.PI;
    const distance = reach*Math.sqrt(Math.random());
    return [centre.x + Math.cos(angle)*distance, centre.y + Math.sin(angle)*distance];
}

// How far the bowl is from a point, in board units, for a move to be
// timed by. Capped: the bowls sit well off the board, and a trip timed by
// the true distance would be slower than any move on the board and would
// drag the whole clock's cadence down with it.
const maxBowlDistance = 6;

export function bowlDistance(clock, colour, coords) {
    const centre = bowlCentre(clock, colour);
    const at = clock.boardCoords(centre.x, centre.y);
    const distance = Math.hypot(at[0] - coords[0], at[1] - coords[1]);
    return Math.min(distance, maxBowlDistance);
}
