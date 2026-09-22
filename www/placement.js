// Where a stone lies on its point: not exactly on it, unless the precision
// is "exact", but a little off, as a hand would leave it. A stone lands
// with a small random offset (bigger the faster the hand and the more
// careless the placement); a stone that lands too close to a neighbour
// shoves it over a touch; and now and then, when the board is right and
// the hand has nothing to do, it nudges the stone furthest off its point
// straighter. The offsets live on the clock (`offsets`, one [dx, dy] per
// point, in board units, never so far that the stone rounds to another
// point); these are functions of it.

import {dist, gridsize, minx, maxx} from './board.js';

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

// Within the radius, and never so far along either axis that the stone
// rounds to the next point: everything that finds a stone's element by
// its coordinates (drawStone, eraseStone, getDrawnStoneSrc) relies on
// get_index(get_coords(i)) being i.
function clampOffset(clock, offset, maxRadius = maxOffsetRadius(clock)) {
    var radius = Math.sqrt(offset[0]*offset[0] + offset[1]*offset[1]);
    if (radius > maxRadius) {
        offset = [offset[0]/radius*maxRadius, offset[1]/radius*maxRadius];
    }
    return [
        Math.max(-0.49, Math.min(0.49, offset[0])),
        Math.max(-0.49, Math.min(0.49, offset[1]))
    ];
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

function coordsForOffset(clock, index, offset) {
    var x = index % gridsize;
    var y = (index - x)/gridsize;
    return [x + offset[0], y + offset[1]];
}

export function offsetRadius(clock, index) {
    var offset = clock.offsets[index];
    return Math.sqrt(offset[0]*offset[0] + offset[1]*offset[1]);
}

export function setLandingOffset(clock, index) {
    setOffset(clock, index, randomOffset(clock));
    clock.updateBoardPosition(index, false);
}

function alignmentTargetRadius(clock) {
    if (clock.placement == 0) {
        return 0.004;
    }
    if (clock.placement == 2) {
        return 0.07;
    }
    return 0.04;
}

// How far off its point a stone must lie before the idle hand nudges it
// straighter: well beyond anything a stone lands with in the current
// placement, so a stone put down perfectly well is left alone, and only
// one a finger left askew, or that was put down in a more careless mode,
// gets tidied.
export function alignmentTriggerRadius(clock) {
    return Math.max(disorderRadius(clock)*1.6, alignmentTargetRadius(clock) + 0.01);
}

export function alignedOffset(clock, index) {
    var offset = clock.offsets[index];
    var radius = offsetRadius(clock, index);
    if (clock.placement == 0 || radius == 0) {
        return [0, 0];
    }

    var targetRadius = alignmentTargetRadius(clock);
    var newRadius = Math.min(radius*0.3, targetRadius*0.45);
    return [offset[0]/radius*newRadius, offset[1]/radius*newRadius];
}

function findAlignmentMove(clock, hand, reserved) {
    // Careless hands do not go back to tidy up.
    if (clock.placement == 2) {
        return null;
    }

    var best = null;
    var triggerRadius = alignmentTriggerRadius(clock);
    for (var i = 0; i < clock.stones_shown.length; ++i) {
        if (clock.stones_shown[i] == 0 || reserved.has(i)) {
            continue;
        }

        var radius = offsetRadius(clock, i);
        var excess = radius - triggerRadius;
        if (excess <= 0) {
            continue;
        }

        var handDistance = dist(hand.position, i);
        var score = (handDistance + 1)/(excess*excess);
        if (!best || score < best.score) {
            best = {
                index: i,
                score: score,
                offset: alignedOffset(clock, i)
            };
        }
    }
    return best;
}

// The stone furthest off its point (beyond the trigger), if any, taken
// up by `hand` to be put down straighter; `reserved` points are another
// hand's business. Returns whether there was one.
export function alignIdleStone(clock, hand, reserved = new Set()) {
    var move = findAlignmentMove(clock, hand, reserved);
    if (!move) {
        return false;
    }

    hand.moving = true;
    hand.from = clock.get_coords(move.index);
    hand.to = coordsForOffset(clock, move.index, move.offset);
    hand.position = move.index;
    hand.colour = clock.stones_shown[move.index];
    hand.alignment_move = {
        index: move.index,
        offset: move.offset
    };
    clock.stones_shown[move.index] = 0;
    hand.clear_route = true;
    return true;
}

function stoneCollisionDistance(clock) {
    return (gridsize - 1)/(20*(maxx - minx))*0.98;
}

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
                var dy = coordsB[1] - coordsA[1];
                var distance = Math.sqrt(dx*dx + dy*dy);
                if (distance >= minDistance) {
                    continue;
                }
                if (distance == 0) {
                    dx = (indexB % gridsize) - (indexA % gridsize) || 1;
                    dy = ((indexB - indexB%gridsize) - (indexA - indexA%gridsize))/gridsize;
                    distance = Math.sqrt(dx*dx + dy*dy);
                }
                var push = (minDistance - distance + 0.01)/distance;
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

export function settleAfterLanding(clock, index) {
    relaxOverlaps(clock, index).forEach((changedIndex) => {
        clock.updateBoardPosition(changedIndex, true);
    });
}
