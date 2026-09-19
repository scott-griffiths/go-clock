// A stone on its way: the clock has decided a move (transform, startMove
// in go-clock.js: stone_from, stone_to, stone_colour, and whether the
// route is clear), and these animate it — a stone slid along the board,
// lifted over in an arc, dropped in from the bowl, lifted out to it, or
// lifted from the table — and, when it lands, put it on the board and ask
// the clock for the next. A swap is a push and a return: the stone on
// its way pushes the one in its place aside, which then comes back to
// where the first one was.

import {gridsize, white, go_bowl, go_table, dist} from './board.js';
import {$, setStyles, setVisible, setStoneShadow, stoneImageSrc, cancelElementAnimations, animateElement, tableStoneScale} from './stone-dom.js';
import {settleAfterLanding, setOffset} from './placement.js';

export function moveStone(clock) {
    var movingStone = $("#moving_stone");
    cancelElementAnimations(movingStone);
    movingStone.style.opacity = '1.0';
    setVisible(movingStone, true);
    $('#moving_stone img').style.removeProperty('filter');
    setVisible($('#moving_stone .stone-shadow'), true);
    if (clock.stone_from[0] == go_table) {
        clock.moving_stone_src = clock.table_pickup.src;
        liftFromTable(clock, clock.table_pickup, clock.stone_to, clock.stone_colour, clock.speed);
        return;
    }
    clock.moving_stone_src = clock.stone_from[0] == go_bowl
        ? stoneImageSrc(clock.stone_colour)
        : clock.getDrawnStoneSrc(clock.stone_from);
    if (clock.stone_from[0] != go_bowl) {
        clock.eraseStone(clock.stone_from);
    }

    if (clock.stone_from[0] == go_bowl) {
        dropStone(clock, clock.stone_to, clock.stone_colour, clock.speed);
    }
    if (clock.stone_to[0] == go_bowl) {
        pickupStone(clock, clock.stone_from, clock.stone_colour, clock.speed);
    }
    
    if (clock.stone_from[0] != go_bowl && clock.stone_to[0] != go_bowl) {
        repositionStone(clock, clock.stone_from, clock.stone_to, clock.stone_colour, clock.speed);
    }
}

// A stone lifted from the table and carried to a point on
// the board, in an arc, as a long move is.
function liftFromTable(clock, entry, coords2, colour, speed) {
    var self = clock;
    var p1 = clock.pixelStonePosition(entry.x, entry.y, 0);
    // From its size on the table, which is that little further away.
    p1 = [p1[0] + p1[2]*(1 - tableStoneScale)/2, p1[1] + p1[3]*(1 - tableStoneScale)/2, p1[2]*tableStoneScale, p1[3]*tableStoneScale];
    var p2 = clock.stonePosition(coords2[0], coords2[1], 0);
    var distance = Math.hypot(coords2[0] - entry.coords[0], coords2[1] - entry.coords[1]);
    var duration = Math.sqrt(distance/speed);
    var max_height = Math.min(12, 8 + distance/2);
    var middle = clock.pixelStonePosition((entry.x + p2[0] + p2[2]/2)/2, (entry.y + p2[1] + p2[3]/2)/2, max_height);
    var end_tasks = function() {
        var landingIndex = Math.round(self.stone_to[0]) + gridsize*Math.round(self.stone_to[1]);
        self.stones_shown[landingIndex] = self.stone_colour;
        setVisible($("#moving_stone"), false);
        setVisible($('#moving_stone .stone-shadow'), false);
        self.drawStone(self.stone_to, self.stone_colour, 0, self.moving_stone_src);
        self.sound?.place(self.stone_colour == white ? 'white' : 'black');
        settleAfterLanding(clock, landingIndex);
        self.table_pickup = null;
        self.moving_stone_src = null;
        self.moving_stone = false;
        self.transform();
    };

    entry.element.remove();
    setStyles($("#moving_stone"), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
    var movingShadow = $('#moving_stone .stone-shadow');
    setStoneShadow(movingShadow, 0);
    var movingStoneImage = $("#moving_stone img");
    movingStoneImage.src = entry.src;
    setVisible(movingStoneImage, true);
    requestAnimationFrame(function() {
        setStoneShadow(movingShadow, max_height);
    });
    animateElement("#moving_stone", duration/2, {
        left: middle[0],
        top: middle[1],
        width: middle[2],
        height: middle[3],
        easing: 'ease-in',
        onComplete: function() {
            setStoneShadow(movingShadow, 0);
            animateElement("#moving_stone", duration/2, {
                left: p2[0],
                top: p2[1],
                width: p2[2],
                height: p2[3],
                easing: 'ease-out',
                onComplete: end_tasks
            });
        }
    });
}

function repositionStone(clock, coords1, coords2, colour, speed) {
    var p1 = clock.stonePosition(coords1[0], coords1[1], 0);
    var p2 = clock.stonePosition(coords2[0], coords2[1], 0);
    var self = clock;
    var end_tasks = function() {
        // add stone to board
        var landingIndex = Math.round(self.stone_to[0]) + gridsize*Math.round(self.stone_to[1]);
        self.stones_shown[landingIndex] = self.stone_colour;
        setVisible($("#moving_stone"), false);
        setVisible($('#moving_stone .stone-shadow'), false);
        if (self.alignment_move) {
            setOffset(clock, landingIndex, self.alignment_move.offset);
            self.updateBoardPosition(landingIndex, false);
        }
        self.drawStone(self.alignment_move ? self.get_coords(landingIndex) : self.stone_to, self.stone_colour, 0, self.moving_stone_src);
        if (!self.alignment_move && !self.clear_route) {
            self.sound?.place(self.stone_colour == white ? 'white' : 'black');
        }
        if (self.pending_swap && self.pending_swap.phase == 'push') {
            self.pending_swap.phase = 'return';
            returnPushedStone(clock);
            return;
        }
        if (self.alignment_move) {
            self.alignment_move = null;
        } else {
            settleAfterLanding(clock, landingIndex);
        }
        self.moving_stone_src = null;
        self.moving_stone = false;
        self.transform();
    };
    
    setStyles($("#moving_stone"), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
    var movingShadow = $('#moving_stone .stone-shadow');
    setStoneShadow(movingShadow, 0);
    var src = stoneImageSrc(colour, clock.moving_stone_src);
    var movingStoneImage = $("#moving_stone img");
    movingStoneImage.src = src;
    setVisible(movingStoneImage, true);
    var distance = dist(clock.get_index(coords1), clock.get_index(coords2));
    var coordinateDistance = Math.sqrt((coords2[0] - coords1[0])*(coords2[0] - coords1[0]) +
                                       (coords2[1] - coords1[1])*(coords2[1] - coords1[1]));
    var duration = Math.sqrt(distance/speed);
    if (clock.alignment_move) {
        duration = Math.max(0.16, Math.min(0.45, Math.sqrt((coordinateDistance*7)/speed)));
    }
    if (clock.pending_swap && clock.pending_swap.phase == 'push') {
        var pushDuration = Math.max(0.12, Math.min(duration*0.28, 0.35));
        showPushedStone(clock, clock.pending_swap, Math.max(0, duration - pushDuration), pushDuration);
    }
    if (clock.clear_route) {
        if (!clock.alignment_move) {
            clock.sound?.slide(duration);
        }
        animateElement("#moving_stone", duration, {
            left: p2[0],
            top: p2[1],
            onComplete: end_tasks});
    } else {
        var max_height = 8 + distance/2;
        if (max_height > 12) {
            max_height = 12;
        }
        var middle = clock.stonePosition((coords1[0] + coords2[0])/2, (coords1[1] + coords2[1])/2, max_height);
        requestAnimationFrame(function() {
            setStoneShadow(movingShadow, max_height);
        });
        animateElement("#moving_stone", duration/2, {
            left: middle[0],
            top: middle[1],
            width: middle[2],
            height: middle[3],
            easing: 'ease-in',
            onComplete: function() {
                setStoneShadow(movingShadow, 0);
                animateElement("#moving_stone", duration/2, {
                    left: p2[0],
                    top: p2[1],
                    width: p2[2],
                    height: p2[3],
                    easing: 'ease-out',
                    onComplete: end_tasks
                });
            }
        });
    }
}

function dropStone(clock, coords, colour, speed) {
    var duration = Math.sqrt(1/speed);
    var p1 = clock.stonePosition(coords[0], coords[1], 10);
    var p2 = clock.stonePosition(coords[0], coords[1], 0);
    var self = clock;
    var end_tasks = function() {
        // add stone to board
        var landingIndex = Math.round(self.stone_to[0]) + gridsize*Math.round(self.stone_to[1]);
        self.stones_shown[landingIndex] = self.stone_colour;
        setVisible($("#moving_stone"), false);
        setVisible($('#moving_stone .stone-shadow'), false);
        self.drawStone(self.stone_to, self.stone_colour, 0, self.moving_stone_src);
        self.sound?.place(self.stone_colour == white ? 'white' : 'black');
        settleAfterLanding(clock, landingIndex);
        self.moving_stone_src = null;
        self.moving_stone = false;
        self.transform();
    };
    
    setStyles($("#moving_stone"), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
    var movingShadow = $('#moving_stone .stone-shadow');
    setStoneShadow(movingShadow, 10);
    var src = stoneImageSrc(colour, clock.moving_stone_src);
    var movingStoneImage = $("#moving_stone img");
    movingStoneImage.src = src;
    setVisible(movingStoneImage, true);
    $("#moving_stone").style.opacity = '0.3';
    requestAnimationFrame(function() {
        setStoneShadow(movingShadow, 0);
    });
    animateElement("#moving_stone", duration, {
        left: p2[0],
        top: p2[1],
        width: p2[2],
        height: p2[3],
        opacity: 1.0,
        onComplete: end_tasks});
}

function pickupStone(clock, coords, colour, speed) {
    var duration = Math.sqrt(1/speed);
    var p1 = clock.stonePosition(coords[0], coords[1], 0);
    var p2 = clock.stonePosition(coords[0], coords[1], 10);
    var self = clock;
    var end_tasks = function() {
        setVisible($("#moving_stone"), false);
        setVisible($('#moving_stone .stone-shadow'), false);
        self.moving_stone = false;
        self.moving_stone_src = null;
        $("#moving_stone").style.opacity = '1.0';
        self.sound?.bowl(colour == white ? 'white' : 'black');
        self.transform();
    };
    
    setStyles($("#moving_stone"), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
    var movingShadow = $('#moving_stone .stone-shadow');
    setStoneShadow(movingShadow, 0);
    var src = stoneImageSrc(colour, clock.moving_stone_src);
    var movingStoneImage = $("#moving_stone img");
    movingStoneImage.src = src;
    setVisible(movingStoneImage, true);
    requestAnimationFrame(function() {
        setStoneShadow(movingShadow, 10);
    });
    animateElement("#moving_stone", duration, {
        left: p2[0],
        top: p2[1],
        width: p2[2],
        height: p2[3],
        opacity: 0.3,
        onComplete: end_tasks});
}

function showPushedStone(clock, swap, delay, duration) {
    var pushedStone = $('#pushed_stone');
    var pushedStoneImage = $('#pushed_stone img');
    var pushedStoneShadow = $('#pushed_stone .stone-shadow');
    var fromPosition = clock.stonePosition(swap.target_coords[0], swap.target_coords[1], 0);
    var toPosition = clock.stonePosition(swap.displaced_coords[0], swap.displaced_coords[1], 0);
    var targetPosition = $('#p' + swap.target);

    setVisible(targetPosition.querySelector('.stone-shadow'), false);
    setVisible(targetPosition.querySelector('img'), false);
    setStyles(pushedStone, {
        left: fromPosition[0],
        top: fromPosition[1],
        width: fromPosition[2],
        height: fromPosition[3],
        opacity: 1
    });
    pushedStoneImage.src = swap.displaced_src;
    setStoneShadow(pushedStoneShadow, 0);
    setVisible(pushedStone, true);
    setVisible(pushedStoneShadow, true);
    setVisible(pushedStoneImage, true);
    if (clock.sound) {
        var self = clock;
        window.setTimeout(function() {
            self.sound?.nudge(swap.displaced_colour == white ? 'white' : 'black');
        }, delay*1000);
    }
    animateElement(pushedStone, duration, {
        delay: delay,
        left: toPosition[0],
        top: toPosition[1],
        easing: 'ease-out',
        cancelExisting: false
    });
}

function returnPushedStone(clock) {
    var swap = clock.pending_swap;
    var fromPosition = clock.stonePosition(swap.displaced_coords[0], swap.displaced_coords[1], 0);
    var toCoords = clock.get_coords(swap.source);
    var toPosition = clock.stonePosition(toCoords[0], toCoords[1], 0);
    var movingStone = $('#moving_stone');
    var movingStoneImage = $('#moving_stone img');
    var movingStoneShadow = $('#moving_stone .stone-shadow');
    var duration = Math.sqrt(dist(swap.target, swap.source)/clock.speed);
    var self = clock;

    cancelElementAnimations($('#pushed_stone'));
    setVisible($('#pushed_stone'), false);
    setStyles(movingStone, {
        left: fromPosition[0],
        top: fromPosition[1],
        width: fromPosition[2],
        height: fromPosition[3],
        opacity: 1
    });
    movingStoneImage.src = swap.displaced_src;
    setStoneShadow(movingStoneShadow, 0);
    setVisible(movingStone, true);
    setVisible(movingStoneShadow, true);
    setVisible(movingStoneImage, true);

    animateElement(movingStone, duration, {
        left: toPosition[0],
        top: toPosition[1],
        onComplete: function() {
            self.stones_shown[swap.source] = swap.displaced_colour;
            setVisible(movingStone, false);
            setVisible(movingStoneShadow, false);
            self.drawStone(toCoords, swap.displaced_colour, 0, swap.displaced_src);
            self.sound?.place(swap.displaced_colour == white ? 'white' : 'black');
            settleAfterLanding(clock, swap.source);
            self.hand_position = swap.source;
            self.pending_swap = null;
            self.moving_stone_src = null;
            self.moving_stone = false;
            self.transform();
        }
    });
}
