// Where a stone lies on its point: not exactly on it, unless the precision
// is "exact", but a little off, as a hand would leave it. A stone lands
// with a small random offset (bigger the faster the hand and the more
// careless the placement), and a stone that lands too close to a
// neighbour shoves it over a touch. A stone is never straightened once
// it lies: one a finger left askew stays so until the hand next moves it.
// The offsets live on the clock (`offsets`, one [dx, dy] per point, in
// board units); these are functions of it.

import {gridsize, minx, maxx, miny, maxy} from './board.js';

function disorderRadius(clock) {
    if (clock.placement == 0) {
        return 0;
    }
    // Haste makes for sloppier landings, up to a speed of 80 (the insane
    // setting is well past that, and as sloppy as it gets).
    var speedRatio = Math.pow(Math.max(0, Math.min(1, (clock.speed - 12)/68)), 0.7);
    if (clock.placement == 2) {
        return 0.045 + 0.145*speedRatio;
    }
    return 0.02 + 0.085*speedRatio;
}

function maxOffsetRadius(clock) {
    if (clock.placement == 0) {
        return 0;
    }
    if (clock.placement == 2) {
        return 0.28;
    }
    return 0.18;
}

function randomOffset(clock) {
    if (clock.placement == 0) {
        return [0, 0];
    }
    var radius = disorderRadius(clock)*Math.sqrt(Math.random());
    var angle = Math.random()*Math.PI*2;
    return [Math.cos(angle)*radius, Math.sin(angle)*radius];
}

// Within the radius. (A stone a finger left further off than a hand
// would is let lie there: the coordinates carry their point's index, see
// get_coords, so it need not round back to it.)
function clampOffset(clock, offset, maxRadius = maxOffsetRadius(clock)) {
    var radius = Math.sqrt(offset[0]*offset[0] + offset[1]*offset[1]);
    if (radius > maxRadius) {
        offset = [offset[0]/radius*maxRadius, offset[1]/radius*maxRadius];
    }
    return offset;
}

export function setOffset(clock, index, offset) {
    clock.offsets[index] = clampOffset(clock, offset);
}

function adjustOffset(clock, index, dx, dy) {
    var current = clock.offsets[index];
    // A stone a finger left well off its point is not pulled in by a nudge.
    var maxRadius = Math.max(maxOffsetRadius(clock), Math.hypot(current[0], current[1]));
    clock.offsets[index] = clampOffset(clock, [current[0] + dx, current[1] + dy], maxRadius);
}

export function setLandingOffset(clock, index) {
    setOffset(clock, index, randomOffset(clock));
    clock.updateBoardPosition(index, false);
}

function stoneCollisionDistance(clock) {
    return (gridsize - 1)/(20*(maxx - minx))*0.98;
}

// A point's height as a proportion of its width: the board is taller
// than it is wide (857 by 800), so a step down it is further than a step
// across. Distances between stones are measured in widths, or two a
// finger left just touching one above the other count as overlapping and
// are shoved apart by the next stone to land near them.
const pointAspect = (maxy - miny)*857/((maxx - minx)*800);

function nearbyOccupiedIndexes(clock, seedIndex) {
    var indexes = new Set([seedIndex]);
    var seedX = seedIndex % gridsize;
    var seedY = (seedIndex - seedX)/gridsize;
    for (var i = 0; i < clock.stones_shown.length; ++i) {
        if (clock.stones_shown[i] == 0 || i == seedIndex) {
            continue;
        }
        var x = i % gridsize;
        var y = (i - x)/gridsize;
        if (Math.abs(x - seedX) <= 2 && Math.abs(y - seedY) <= 2) {
            indexes.add(i);
        }
    }
    return [...indexes];
}

function relaxOverlaps(clock, seedIndex) {
    if (clock.placement == 0) {
        return new Set();
    }
    var changed = new Set();
    var minDistance = stoneCollisionDistance(clock);
    var indexes = nearbyOccupiedIndexes(clock, seedIndex);
    for (var pass = 0; pass < 4; ++pass) {
        for (var a = 0; a < indexes.length; ++a) {
            for (var b = a + 1; b < indexes.length; ++b) {
                var indexA = indexes[a];
                var indexB = indexes[b];
                if (clock.stones_shown[indexA] == 0 || clock.stones_shown[indexB] == 0) {
                    continue;
                }
                var coordsA = clock.get_coords(indexA);
                var coordsB = clock.get_coords(indexB);
                var dx = coordsB[0] - coordsA[0];
                var dy = (coordsB[1] - coordsA[1])*pointAspect;
                var distance = Math.sqrt(dx*dx + dy*dy);
                if (distance >= minDistance) {
                    continue;
                }
                if (distance == 0) {
                    dx = (indexB % gridsize) - (indexA % gridsize) || 1;
                    dy = ((indexB - indexB%gridsize) - (indexA - indexA%gridsize))/gridsize*pointAspect;
                    distance = Math.sqrt(dx*dx + dy*dy);
                }
                var push = (minDistance - distance + 0.01)/distance;
                // Back from widths to points.
                dy /= pointAspect;
                var pushA = indexA == seedIndex ? 0 : 0.5;
                var pushB = indexB == seedIndex ? 0 : 0.5;
                if (indexA == seedIndex || indexB == seedIndex) {
                    pushA = indexA == seedIndex ? 0 : 1;
                    pushB = indexB == seedIndex ? 0 : 1;
                }
                adjustOffset(clock, indexA, -dx*push*pushA, -dy*push*pushA);
                adjustOffset(clock, indexB, dx*push*pushB, dy*push*pushB);
                changed.add(indexA);
                changed.add(indexB);
            }
        }
    }
    return changed;
}

// Every stone on the board put down again at once, as the precision now
// has it (the precision just changed: my-clock.js): exact, right on its
// point; otherwise a fresh offset of the size this precision gives, with
// neighbours eased apart where two would overlap. `reserved` points are
// a hand's business, and left alone. Returns the points whose stones
// have new offsets, for the clock to move them there.
export function redistribute(clock, reserved = new Set()) {
    var placed = [];
    for (var i = 0; i < clock.stones_shown.length; ++i) {
        if (clock.stones_shown[i] != 0 && !reserved.has(i)) {
            setOffset(clock, i, randomOffset(clock));
            placed.push(i);
        }
    }
    placed.forEach((index) => relaxOverlaps(clock, index));
    return placed;
}

export function settleAfterLanding(clock, index) {
    relaxOverlaps(clock, index).forEach((changedIndex) => {
        clock.updateBoardPosition(changedIndex, true);
    });
}
