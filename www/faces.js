// The clock faces: which stones the board should show for a time. Pure
// arithmetic on the grid; go-clock.js asks for the face and works out how
// to get the board there. The digits are drawn with stones in three sizes.

import {white, black, line, emptyBoard, gridsize} from './board.js';

export const ANALOGUE = 0;
export const JUMPING_HOUR = 1;
export const DIGITAL = 2;
export const HYBRID = 3;
// Not on the clock: the day of the month over the time. Kept, but no
// face swipes round to it (go-clock.js keeps its view to the four above).
export const DATE = 4;

// The twelve hour markers of the analogue faces, clockwise from twelve.
export const hourMarkers = [[9, 1], [13, 2], [16, 5], [17, 9], [16, 13], [13, 16], [9, 17], [5, 16], [2, 13], [1, 9], [2, 5], [5, 2]];

// The analogue face's second hand: one white stone walking a ring of sixty
// points round the outside, clockwise from twelve, over an hour marker
// where it lands on one (drawn after them, five-second marks apart). A
// radius of 8.15 is the one that rounds to sixty distinct points, each a
// single step from the last, and lands on every hour marker at the
// five-second marks.
export const secondRing = [];
for (let s = 0; s < 60; ++s) {
    const theta = 2*Math.PI*s / 60;
    secondRing.push([Math.round(9 + 8.15*Math.sin(theta)), Math.round(9 - 8.15*Math.cos(theta))]);
}

// Small numbers, 5 wide by 7 tall
var s0 = [[3, 0], [2, 0], [1, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 6], [3, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1]];
var s1 = [[1, 1], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [1, 6], [3, 6]];
var s2 = [[0, 1], [1, 0], [2, 0], [3, 0], [4, 1], [4, 2], [3, 3], [2, 3], [1, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6]];
var s3 = [[0, 1], [1, 0], [2, 0], [3, 0], [4, 1], [4, 2], [3, 3], [2, 3], [4, 4], [4, 5], [3, 6], [2, 6], [1, 6], [0, 5]];
var s4 = [[4, 4], [3, 4], [2, 4], [1, 4], [0, 4], [0, 3], [1, 2], [2, 1], [3, 0], [3, 1], [3, 2], [3, 3], [3, 5], [3, 6]];
var s5 = [[4, 0], [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 3], [4, 4], [4, 5], [3, 6], [2, 6], [1, 6], [0, 5]];
var s6 = [[3, 0], [2, 0], [1, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 6], [3, 6], [4, 5], [4, 4], [3, 3], [2, 3], [1, 3]];
var s7 = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [3, 2], [2, 3], [1, 4], [1, 5], [1, 6]];
var s8 = [[3, 0], [2, 0], [1, 0], [0, 1], [0, 2], [1, 3], [2, 3], [3, 3], [4, 4], [4, 5], [3, 6], [2, 6], [1, 6], [0, 5], [0, 4], [4, 2], [4, 1]];
var s9 = [[3, 3], [2, 3], [1, 3], [0, 2], [0, 1], [1, 0], [2, 0], [3, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [3, 6], [2, 6], [1, 6]];
var small_num = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9];

// Big numbers, 6 wide by 9 tall
s0 = [[4, 0], [3, 0], [2, 0], [1, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 8], [2, 8], [3, 8], [4, 8], [5, 7], [5, 6], [5, 5], [5, 4], [5, 3], [5, 2], [5, 1]];
s1 = [[1, 2], [2, 1], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [2, 8], [4, 8], [5, 8], [1, 8]];
s2 = [[0, 1], [1, 0], [2, 0], [3, 0], [4, 0], [5, 1], [5, 2], [5, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 5], [0, 6], [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8]];
s3 = [[0, 1], [1, 0], [2, 0], [3, 0], [4, 0], [5, 1], [5, 2], [4, 3], [3, 4], [2, 4], [4, 5], [5, 6], [5, 7], [4, 8], [3, 8], [2, 8], [1, 8], [0, 7]];
s4 = [[3, 1], [2, 2], [1, 3], [0, 4], [0, 5], [1, 5], [2, 5], [3, 5], [5, 5], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8]];
s5 = [[5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 4], [5, 5], [5, 6], [5, 7], [4, 8], [3, 8], [2, 8], [1, 8], [0, 7]];
s6 = [[4, 0], [3, 0], [2, 0], [1, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 8], [2, 8], [3, 8], [4, 8], [5, 7], [5, 6], [5, 5], [4, 4], [3, 4], [2, 4], [1, 4]];
s7 = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [5, 1], [5, 2], [4, 3], [3, 4], [2, 5], [2, 6], [2, 7], [2, 8]];
s8 = [[4, 0], [3, 0], [2, 0], [1, 0], [0, 1], [0, 2], [5, 1], [5, 2], [5, 6], [5, 7], [0, 6], [0, 7], [1, 8], [2, 8], [3, 8], [4, 8], [1, 3], [4, 3], [2, 4], [3, 4], [1, 5], [4, 5]];
s9 = [[4, 0], [3, 0], [2, 0], [0, 1], [0, 2], [0, 3], [5, 4], [1, 0], [5, 1], [5, 2], [1, 8], [2, 8], [3, 8], [4, 7], [5, 3], [5, 6], [5, 5], [4, 4], [3, 4], [2, 4], [1, 4]];
var big_num = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9];

// Tiny numbers, 3 wide by 5 tall
s0 = [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [2, 1]];
s1 = [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]];
s2 = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4]];
s3 = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [2, 3], [2, 4], [1, 4], [0, 4]];
s4 = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]];
s5 = [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 3], [2, 4], [1, 4], [0, 4]];
s6 = [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [1, 2]];
s7 = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]];
s8 = [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [2, 1], [1, 2]];
s9 = [[1, 2], [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [1, 4], [0, 4]];

var tiny_num = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9];

function addStone(stones, x, y, colour) {
    stones[y*gridsize + x] = colour;
}

// A digit in stones, its top-left corner at (x_offset, y_offset); size
// 1 is tiny, 2 small, 3 big.
function drawNumber(stones, number, x_offset, y_offset, size, colour) {
    var num;
    if (size == 1) num = tiny_num[number];
    if (size == 2) num = small_num[number];
    if (size == 3) num = big_num[number];
    for (var i = 0; i < num.length; ++i) {
        addStone(stones, num[i][0] + x_offset, num[i][1] + y_offset, colour);
    }
}

// The board for `view` at the time: 361 of empty (0), white (1) or
// black (3). `hours` is 0 to 23; in 12-hour mode the faces with digits
// show 12 rather than 0. `days` is only for the date face. `showSeconds`
// false drops the analogue second hand and the digital face's ring of
// counting stones; the jumping hour face shows its minutes alone instead
// of minutes over seconds (see JUMPING_HOUR, below). The hybrid face
// keeps its seconds regardless: its ring is most of the face.
export function faceFor(view, {hours, minutes, seconds = 0, days = 0}, twentyFourHour = true, showSeconds = true) {
    var stones = emptyBoard();
    if (!twentyFourHour) {
        hours %= 12;
        if (hours == 0) {
            hours = 12;
        }
    }
    if (view == ANALOGUE) {
        for (var i = 0; i < hourMarkers.length; ++i) {
            addStone(stones, hourMarkers[i][0], hourMarkers[i][1], black);
        }
        var min_pos = 60*minutes + seconds;
        var theta = 2*Math.PI*min_pos / 3600;
        var R = 7.0;
        var endX = Math.round(9 + R*Math.sin(theta));
        var endY = Math.round(9 - R*Math.cos(theta));
        var hand_stones = line(9, endX, 9, endY);
        for (var i = 0; i < hand_stones.length; ++i) {
            addStone(stones, hand_stones[i][0], hand_stones[i][1], white);
        }

        hours %= 12;
        hours *= 5;
        hours += minutes/12;
        theta = 2*Math.PI*hours / 60;
        R = 4.5;
        endX = Math.round(9 + R*Math.sin(theta));
        endY = Math.round(9 - R*Math.cos(theta));
        hand_stones = line(9, endX, 9, endY);
        for (var i = 0; i < hand_stones.length; ++i) {
            addStone(stones, hand_stones[i][0], hand_stones[i][1], black);
        }
        if (showSeconds) {
            addStone(stones, secondRing[seconds][0], secondRing[seconds][1], white);
        }
    }
    else if (view == JUMPING_HOUR) {
        for (var i = 0; i < hourMarkers.length; ++i) {
            addStone(stones, hourMarkers[i][0], hourMarkers[i][1], hours%12 == i ? white : black);
        }
        if (showSeconds) {
            drawNumber(stones, (minutes - minutes%10)/10, 6, 4, 1, black);
            drawNumber(stones, minutes%10, 10, 4, 1, black);
            drawNumber(stones, (seconds - seconds%10)/10, 6, 10, 1, white);
            drawNumber(stones, seconds%10, 10, 10, 1, white);
        } else {
            // No seconds to make room for: the minutes alone, centred, in
            // the digital face's own lower-half style (small, white).
            drawNumber(stones, (minutes - minutes%10)/10, 4, 6, 2, white);
            drawNumber(stones, minutes%10, 10, 6, 2, white);
        }
    }
    else if (view == DIGITAL) {
        var tensOfHours = (hours - hours%10)/10;
        hours %= 10;
        if (tensOfHours != 0 || twentyFourHour) {

            drawNumber(stones, tensOfHours, 3, 1, 3, black);
            drawNumber(stones, hours, (hours == 1) ? 9 : 10, 1, 3, black);
        } else {
            drawNumber(stones, hours, (hours == 1) ? 6 : 7, 1, 3, black);
        }
        drawNumber(stones, (minutes - minutes%10)/10, 4, 11, 2, white);
        drawNumber(stones, minutes%10, 10, 11, 2, white);
        // The seconds: a ring of thirty points, down the right-hand edge
        // (white) and up the left (black), the top two points of each
        // skipped. A stone walks it a point a second for the first half of
        // the minute, leaving a stone every other point (eight a side, the
        // two at each corner adjacent: sixteen gaps in thirty steps), and
        // comes round to the first at the half. In the second half each
        // stone in turn walks on to the next and is taken off when it meets
        // it, the last coming round to the top of the right as the next
        // minute's first.
        if (showSeconds) {
            var ring = function(p) {
                p %= 30;
                return p < 15 ? [17, 2 + p, white] : [1, 16 - (p - 15), black];
            };
            var kept = [0, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 29];
            var t = seconds%30;
            var positions = kept.filter(seconds < 30 ? (p) => p <= t : (p) => p > t);
            positions.push(t);
            for (var i = 0; i < positions.length; ++i) {
                var [px, py, pc] = ring(positions[i]);
                addStone(stones, px, py, pc);
            }
        }
    }
    else if (view == HYBRID) {
        var tensOfHours = (hours - hours%10)/10;
        if (tensOfHours != 0) {
            drawNumber(stones, (hours - hours%10)/10, 1, 1, 1, black);
        }
        drawNumber(stones, hours%10, 5, 1, 1, black);
        addStone(stones, 9, 2, black);
        addStone(stones, 9, 4, black);
        drawNumber(stones, (minutes - minutes%10)/10, 11, 1, 1, black);
        drawNumber(stones, minutes%10, 15, 1, 1, black);

        var second_stones = [[9, 6], [12, 7], [14, 9], [15, 12], [14, 15], [12, 17], [9, 18], [6, 17], [4, 15], [3, 12], [4, 9], [6, 7]];
        for (var i=0; i < second_stones.length; ++i) {
            addStone(stones, second_stones[i][0], second_stones[i][1], i == Math.floor(seconds/5) ? black : white);
        }

        var theta = 2*Math.PI*seconds / 60;
        var R = 4;
        var endX = Math.round(9 + R*Math.sin(theta));
        var endY = Math.round(12 - R*Math.cos(theta));
        var hand_stones = line(9, endX, 12, endY);
        for (var i=0; i < hand_stones.length; ++i) {
            addStone(stones, hand_stones[i][0], hand_stones[i][1], white);
        }
    }
    else if (view == DATE) {
        var u = days%10;
        var t = (days - u)/10;
        drawNumber(stones, (t - t%10)/10, 1, 1, 1, black);
        drawNumber(stones, t%10, 5, 1, 1, black);
        drawNumber(stones, u, 9, 1, 1, black);
        drawNumber(stones, (hours - hours%10)/10, 5, 7, 1, white);
        drawNumber(stones, hours%10, 9, 7, 1, white);
        drawNumber(stones, (minutes - minutes%10)/10, 5, 13, 1, black);
        drawNumber(stones, minutes%10, 9, 13, 1, black);
    }
    return stones;
}
