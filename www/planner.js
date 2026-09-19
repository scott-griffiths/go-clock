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
// with a colour and `coords` in board units (beyond the grid). Returns:
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
export function planMove({shown, wanted, hand, tableStones = []}) {
    var diff = [];
    for (var i = 0; i < shown.length; ++i) {
        diff.push(shown[i] - wanted[i]);
    }
    var trip = (from, to) => dist(hand, from) + dist(from, to);

    var best_i = -1;
    var best_j = -1;
    // First, stones on a point where the other colour wants to be, to a
    // point wanting their own.
    for (var j = 0; j < diff.length; ++j) {
        if (isWrongColourPair(diff[j])) {
            var want = (diff[j] == black - white) ? -black : -white;
            for (var i = 0; i < diff.length; ++i) {
                if (diff[i] == want && (best_j == -1 || trip(j, i) < trip(best_j, best_i))) {
                    best_i = i;
                    best_j = j;
                }
            }
        }
    }
    // Then a spare stone of the right colour to a point wanting one.
    for (var i = 0; i < diff.length; ++i) {
        if (diff[i] == -white || diff[i] == -black) {
            for (var j = 0; j < diff.length; ++j) {
                if (diff[j] == -diff[i] && (best_j == -1 || trip(j, i) < trip(best_j, best_i))) {
                    best_j = j;
                    best_i = i;
                }
            }
        }
    }

    // A stone on the table is as good as a spare on the board, by the same
    // measure; the board's own wins a tie.
    var best_table = null;
    var best_table_i = -1;
    var best_table_score = Infinity;
    if (tableStones.length > 0) {
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
                var score = Math.hypot(handAt[0] - entry.coords[0], handAt[1] - entry.coords[1])
                    + Math.hypot(target[0] - entry.coords[0], target[1] - entry.coords[1]);
                if (score < best_table_score) {
                    best_table = entry;
                    best_table_i = i;
                    best_table_score = score;
                }
            });
        }
        if (best_table && best_j != -1 && trip(best_j, best_i) <= best_table_score) {
            best_table = null;
        }
    }
    if (best_table) {
        return {kind: 'table', entry: best_table, to: best_table_i};
    }
    if (best_j != -1) {
        return {kind: 'move', from: best_j, to: best_i, lift: !routeIsClear(shown, best_j, best_i)};
    }

    // No spare to be had: a wrong-coloured stone and a point wanting its
    // colour can change places.
    var best_swap = null;
    for (var j = 0; j < diff.length; ++j) {
        if (!isWrongColourPair(diff[j])) {
            continue;
        }
        for (var i = 0; i < diff.length; ++i) {
            if (diff[i] != -diff[j]) {
                continue;
            }
            var score = dist(hand, j) + dist(j, i) + dist(i, j);
            if (!best_swap || score < best_swap.score) {
                best_swap = {source: j, target: i, score: score};
            }
        }
    }
    if (best_swap) {
        return {kind: 'swap', source: best_swap.source, target: best_swap.target};
    }

    // No moving will help: the nearest point that is wrong gets a stone
    // from the bowl, or loses one to it.
    var nearest = -1;
    for (var i = 0; i < diff.length; ++i) {
        if (diff[i] != 0 && (nearest == -1 || dist(hand, i) < dist(hand, nearest))) {
            nearest = i;
        }
    }
    if (nearest == -1) {
        return null;
    }
    if (diff[nearest] != -white && diff[nearest] != -black) {
        return {kind: 'remove', from: nearest};
    }
    return {kind: 'add', to: nearest, colour: -diff[nearest]};
}

// Whether a stone can slide from one point to another: the line between
// them, with the corners of each diagonal step, has no stone on it (the
// stone's own point aside), and it is not far — a long move is a lift.
export function routeIsClear(shown, from, to) {
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
        return index == from || shown[index] == 0;
    });
}
