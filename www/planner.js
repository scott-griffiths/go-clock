// What the hand does next: given the board as it is and as the face wants
// it, the one move that gets it nearer, chosen as the shortest trip for
// the hand — to the stone, and on to where it is wanted. Pure: go-clock.js
// turns the answer into a stone moving on the page.

import {white, black, dist, line, pointX, pointY, pointIndex} from './board.js';

// A stone is a wrong-colour pair's worth off when the board has one colour
// where the face wants the other.
function isWrongColourPair(diff) {
    return diff == black - white || diff == white - black;
}

// `shown` and `wanted` are boards (see board.js); `hand` the index of the
// point the hand is at; `tableStones` the stones lying on the table, each
// with a colour and `coords` in board units (beyond the grid); `reserved`
// the points another hand's move is touching, which this one keeps clear
// of; and `movesOnly` for a hand that only moves stones already on the
// screen (no bowl, no swaps). Returns:
//   {kind: 'table', entry, to}      the table stone `entry`, to the point `to`
//   {kind: 'move', from, to, lift}  a spare stone from one point to another;
//                                   slid, or lifted over if the way is
//                                   blocked or long
//   {kind: 'swap', source, target}  the stone at `source` takes `target`'s
//                                   place, pushing the wrong-coloured stone
//                                   there aside to come back to `source`
//   {kind: 'remove', from}          a stone to the bowl
//   {kind: 'add', to, colour}       a stone from the bowl
//   null                            the board is right
// Where two choices are equally good (the same trip), either may be
// taken, `random` (0 to 1, Math.random's kind) deciding: the hand has no
// favourite corner of the board.
export function planMove({shown, wanted, hand, tableStones = [], reserved = new Set(), movesOnly = false, random = Math.random}) {
    var diff = [];
    for (var i = 0; i < shown.length; ++i) {
        // A point another hand is at is neither wrong nor spare.
        diff.push(reserved.has(i) ? 0 : shown[i] - wanted[i]);
    }
    var trip = (from, to) => dist(hand, from) + dist(from, to);

    // A stone to move, from `from` to `to`: first, those on a point where
    // the other colour wants to be, to a point wanting their own; and a
    // spare stone of the right colour to a point wanting one.
    var move = chooser(random);
    for (var j = 0; j < diff.length; ++j) {
        if (isWrongColourPair(diff[j])) {
            var want = (diff[j] == black - white) ? -black : -white;
            for (var i = 0; i < diff.length; ++i) {
                if (diff[i] == want) {
                    move.offer({from: j, to: i}, trip(j, i));
                }
            }
        }
    }
    for (var i = 0; i < diff.length; ++i) {
        if (diff[i] == -white || diff[i] == -black) {
            for (var j = 0; j < diff.length; ++j) {
                if (diff[j] == -diff[i]) {
                    move.offer({from: j, to: i}, trip(j, i));
                }
            }
        }
    }

    // A stone on the table is as good as a spare on the board, by the same
    // measure; the board's own wins a tie.
    if (tableStones.length > 0) {
        var table = chooser(random);
        var handAt = [pointX(hand), pointY(hand)];
        for (var i = 0; i < diff.length; ++i) {
            if (diff[i] != -white && diff[i] != -black) {
                continue;
            }
            var target = [pointX(i), pointY(i)];
            tableStones.forEach((entry) => {
                if (entry.colour != -diff[i]) {
                    return;
                }
                table.offer({entry: entry, to: i}, Math.hypot(handAt[0] - entry.coords[0], handAt[1] - entry.coords[1])
                    + Math.hypot(target[0] - entry.coords[0], target[1] - entry.coords[1]));
            });
        }
        if (table.best && !(move.best && move.score <= table.score + tie)) {
            return {kind: 'table', entry: table.best.entry, to: table.best.to};
        }
    }
    if (move.best) {
        return {kind: 'move', from: move.best.from, to: move.best.to, lift: !routeIsClear(shown, move.best.from, move.best.to, reserved)};
    }
    if (movesOnly) {
        return null;
    }

    // No spare to be had: a wrong-coloured stone and a point wanting its
    // colour can change places.
    var swap = chooser(random);
    for (var j = 0; j < diff.length; ++j) {
        if (!isWrongColourPair(diff[j])) {
            continue;
        }
        for (var i = 0; i < diff.length; ++i) {
            if (diff[i] == -diff[j]) {
                swap.offer({source: j, target: i}, dist(hand, j) + dist(j, i) + dist(i, j));
            }
        }
    }
    if (swap.best) {
        return {kind: 'swap', source: swap.best.source, target: swap.best.target};
    }

    // No moving will help: the nearest point that is wrong gets a stone
    // from the bowl, or loses one to it.
    var nearest = chooser(random);
    for (var i = 0; i < diff.length; ++i) {
        if (diff[i] != 0) {
            nearest.offer(i, dist(hand, i));
        }
    }
    if (nearest.best === null) {
        return null;
    }
    var point = nearest.best;
    if (diff[point] != -white && diff[point] != -black) {
        return {kind: 'remove', from: point};
    }
    return {kind: 'add', to: point, colour: -diff[point]};
}

// Scores this close are the same trip: sums of square roots that are
// equal on paper can differ in the last bits.
const tie = 1e-9;

// The best of a run of candidates, by the lowest score, a tie going to
// any of the equals with the same chance: each new equal takes the place
// of the one held with a chance of one in however many there now are
// (reservoir sampling), so no list has to be kept.
export function chooser(random = Math.random) {
    var best = null;
    var score = Infinity;
    var equals = 0;
    return {
        offer(candidate, candidateScore) {
            if (candidateScore < score - tie) {
                best = candidate;
                score = candidateScore;
                equals = 1;
            } else if (candidateScore <= score + tie) {
                equals += 1;
                if (random()*equals < 1) {
                    best = candidate;
                }
            }
        },
        get best() {
            return best;
        },
        get score() {
            return score;
        }
    };
}

// Whether a stone can slide from one point to another: the line between
// them, with the corners of each diagonal step, has no stone on it (the
// stone's own point aside) and none about to land there (`reserved`), and
// it is not far — a long move is a lift.
export function routeIsClear(shown, from, to, reserved = new Set()) {
    if (dist(from, to) > 5) {
        return false;
    }
    var points = line(pointX(from), pointX(to), pointY(from), pointY(to));
    var num_points = points.length;
    for (var i = 0; i < num_points - 1; ++i) {
        if (points[i][0] != points[i+1][0] && points[i][1] != points[i+1][1]) {
            // Both x and y change: the corners of the step as well.
            points.push([points[i][0], points[i+1][1]]);
            points.push([points[i+1][0], points[i][1]]);
        }
    }
    return points.every(([x, y]) => {
        var index = pointIndex(x, y);
        return index == from || (shown[index] == 0 && !reserved.has(index));
    });
}
