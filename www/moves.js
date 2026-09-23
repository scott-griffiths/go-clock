// A stone on its way: the clock has decided a move for one of its hands
// (transform, startMove in go-clock.js: the hand's from, to, colour, and
// whether the route is clear), and these animate it — a stone slid along
// the board, lifted over in an arc, dropped in from the bowl, lifted out
// to it, or lifted from the table — and, when it lands, put it on the
// board and ask the clock for the next. A swap is a push and a return:
// the stone on its way pushes the one in its place aside, which then
// comes back to where the first one was. The hand carries its stone in
// an element of its own (hand.element()); the pushed stone has one
// element, since only the one hand swaps.

import {gridsize, white, go_bowl, go_table, dist, pointX, pointY} from './board.js';
import {$, setStyles, setVisible, setStoneShadow, stoneImageSrc, cancelElementAnimations, animateElement, tableStoneScale, carryHeight} from './stone-dom.js';
import {settleAfterLanding, setOffset} from './placement.js';

// A stone from the bowl takes as long as a move of this many points: a
// drop straight in is over in a flash otherwise, and looks nothing like
// the moves around it.
const dropDistance = 2.5;

// How long a plan (planner.js) will take at `speed`, as the functions below
// reckon it: for a hand to know, before it starts, when it would put the
// stone down, and keep that clear of the other hand's moments. A swap's is
// the first stone's trip; its return is a second move.
export function moveDuration(clock, plan, speed) {
    switch (plan.kind) {
    case 'add':
        return Math.sqrt(dropDistance/speed);
    case 'table':
        return Math.sqrt(Math.hypot(pointX(plan.to) - plan.entry.coords[0], pointY(plan.to) - plan.entry.coords[1])/speed);
    case 'move':
        return Math.sqrt(dist(plan.from, plan.to)/speed);
    case 'swap':
        return Math.sqrt(dist(plan.source, plan.target)/speed);
    default:
        return Math.sqrt(1/speed);
    }
}

export function moveStone(clock, hand) {
    var movingStone = hand.element();
    cancelElementAnimations(movingStone);
    movingStone.style.opacity = '1.0';
    setVisible(movingStone, true);
    hand.element().querySelector('img').style.removeProperty('filter');
    setVisible(hand.element().querySelector('.stone-shadow'), true);
    if (hand.from[0] == go_table) {
        hand.src = hand.table_pickup.src;
        liftFromTable(clock, hand, hand.table_pickup, hand.to, hand.colour, clock.speed*hand.pace);
        return;
    }
    hand.src = hand.from[0] == go_bowl
        ? stoneImageSrc(hand.colour)
        : clock.getDrawnStoneSrc(hand.from);
    if (hand.from[0] != go_bowl) {
        clock.eraseStone(hand.from);
    }

    if (hand.from[0] == go_bowl) {
        dropStone(clock, hand, hand.to, hand.colour, clock.speed*hand.pace);
    }
    if (hand.to[0] == go_bowl) {
        pickupStone(clock, hand, hand.from, hand.colour, clock.speed*hand.pace);
    }
    
    if (hand.from[0] != go_bowl && hand.to[0] != go_bowl) {
        repositionStone(clock, hand, hand.from, hand.to, hand.colour, clock.speed*hand.pace);
    }
}

// A stone lifted from the table and carried to a point on
// the board, in an arc, as a long move is.
function liftFromTable(clock, hand, entry, coords2, colour, speed) {
    var self = clock;
    var p1 = clock.pixelStonePosition(entry.x, entry.y, 0);
    // From its size on the table, which is that little further away.
    p1 = [p1[0] + p1[2]*(1 - tableStoneScale)/2, p1[1] + p1[3]*(1 - tableStoneScale)/2, p1[2]*tableStoneScale, p1[3]*tableStoneScale];
    var p2 = clock.stonePosition(coords2[0], coords2[1], 0);
    var distance = Math.hypot(coords2[0] - entry.coords[0], coords2[1] - entry.coords[1]);
    var duration = Math.sqrt(distance/speed);
    hand.lands(duration);
    var max_height = carryHeight(distance);
    var middle = clock.pixelStonePosition((entry.x + p2[0] + p2[2]/2)/2, (entry.y + p2[1] + p2[3]/2)/2, max_height);
    var end_tasks = function() {
        var landingIndex = Math.round(hand.to[0]) + gridsize*Math.round(hand.to[1]);
        self.stones_shown[landingIndex] = hand.colour;
        setVisible(hand.element(), false);
        setVisible(hand.element().querySelector('.stone-shadow'), false);
        self.drawStone(hand.to, hand.colour, 0, hand.src);
        self.sound?.place(hand.colour == white ? 'white' : 'black');
        settleAfterLanding(clock, landingIndex);
        hand.table_pickup = null;
        hand.src = null;
        hand.moving = false;
        self.transform();
    };

    entry.element.remove();
    setStyles(hand.element(), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
    var movingShadow = hand.element().querySelector('.stone-shadow');
    setStoneShadow(movingShadow, 0);
    var movingStoneImage = hand.element().querySelector('img');
    movingStoneImage.src = entry.src;
    setVisible(movingStoneImage, true);
    requestAnimationFrame(function() {
        setStoneShadow(movingShadow, max_height);
    });
    animateElement(hand.element(), duration/2, {
        left: middle[0],
        top: middle[1],
        width: middle[2],
        height: middle[3],
        easing: 'ease-in',
        onComplete: function() {
            setStoneShadow(movingShadow, 0);
            animateElement(hand.element(), duration/2, {
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

function repositionStone(clock, hand, coords1, coords2, colour, speed) {
    var p1 = clock.stonePosition(coords1[0], coords1[1], 0);
    var p2 = clock.stonePosition(coords2[0], coords2[1], 0);
    var self = clock;
    var end_tasks = function() {
        // add stone to board
        var landingIndex = Math.round(hand.to[0]) + gridsize*Math.round(hand.to[1]);
        self.stones_shown[landingIndex] = hand.colour;
        setVisible(hand.element(), false);
        setVisible(hand.element().querySelector('.stone-shadow'), false);
        if (hand.alignment_move) {
            setOffset(clock, landingIndex, hand.alignment_move.offset);
            self.updateBoardPosition(landingIndex, false);
        }
        self.drawStone(hand.alignment_move ? self.get_coords(landingIndex) : hand.to, hand.colour, 0, hand.src);
        if (!hand.alignment_move && !hand.clear_route) {
            self.sound?.place(hand.colour == white ? 'white' : 'black');
        }
        if (hand.pending_swap && hand.pending_swap.phase == 'push') {
            hand.pending_swap.phase = 'return';
            returnPushedStone(clock, hand);
            return;
        }
        if (hand.alignment_move) {
            hand.alignment_move = null;
        } else {
            settleAfterLanding(clock, landingIndex);
        }
        hand.src = null;
        hand.moving = false;
        self.transform();
    };
    
    setStyles(hand.element(), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
    var movingShadow = hand.element().querySelector('.stone-shadow');
    setStoneShadow(movingShadow, 0);
    var src = stoneImageSrc(colour, hand.src);
    var movingStoneImage = hand.element().querySelector('img');
    movingStoneImage.src = src;
    setVisible(movingStoneImage, true);
    var distance = dist(clock.get_index(coords1), clock.get_index(coords2));
    var coordinateDistance = Math.sqrt((coords2[0] - coords1[0])*(coords2[0] - coords1[0]) +
                                       (coords2[1] - coords1[1])*(coords2[1] - coords1[1]));
    var duration = Math.sqrt(distance/speed);
    if (hand.alignment_move) {
        duration = Math.max(0.16, Math.min(0.45, Math.sqrt((coordinateDistance*7)/speed)));
    }
    hand.lands(duration);
    if (hand.pending_swap && hand.pending_swap.phase == 'push') {
        var pushDuration = Math.max(0.12, Math.min(duration*0.28, 0.35));
        showPushedStone(clock, hand, hand.pending_swap, Math.max(0, duration - pushDuration), pushDuration);
    }
    if (hand.clear_route) {
        if (!hand.alignment_move) {
            clock.sound?.slide(duration);
        }
        animateElement(hand.element(), duration, {
            left: p2[0],
            top: p2[1],
            onComplete: end_tasks});
    } else {
        var max_height = carryHeight(distance);
        var middle = clock.stonePosition((coords1[0] + coords2[0])/2, (coords1[1] + coords2[1])/2, max_height);
        requestAnimationFrame(function() {
            setStoneShadow(movingShadow, max_height);
        });
        animateElement(hand.element(), duration/2, {
            left: middle[0],
            top: middle[1],
            width: middle[2],
            height: middle[3],
            easing: 'ease-in',
            onComplete: function() {
                setStoneShadow(movingShadow, 0);
                animateElement(hand.element(), duration/2, {
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

function dropStone(clock, hand, coords, colour, speed) {
    var duration = Math.sqrt(dropDistance/speed);
    hand.lands(duration);
    var p1 = clock.stonePosition(coords[0], coords[1], 10);
    var p2 = clock.stonePosition(coords[0], coords[1], 0);
    var self = clock;
    var end_tasks = function() {
        // add stone to board
        var landingIndex = Math.round(hand.to[0]) + gridsize*Math.round(hand.to[1]);
        self.stones_shown[landingIndex] = hand.colour;
        setVisible(hand.element(), false);
        setVisible(hand.element().querySelector('.stone-shadow'), false);
        self.drawStone(hand.to, hand.colour, 0, hand.src);
        self.sound?.place(hand.colour == white ? 'white' : 'black');
        settleAfterLanding(clock, landingIndex);
        hand.src = null;
        hand.moving = false;
        self.transform();
    };
    
    setStyles(hand.element(), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
    var movingShadow = hand.element().querySelector('.stone-shadow');
    setStoneShadow(movingShadow, 10);
    var src = stoneImageSrc(colour, hand.src);
    var movingStoneImage = hand.element().querySelector('img');
    movingStoneImage.src = src;
    setVisible(movingStoneImage, true);
    hand.element().style.opacity = '0.3';
    requestAnimationFrame(function() {
        setStoneShadow(movingShadow, 0);
    });
    animateElement(hand.element(), duration, {
        left: p2[0],
        top: p2[1],
        width: p2[2],
        height: p2[3],
        opacity: 1.0,
        onComplete: end_tasks});
}

function pickupStone(clock, hand, coords, colour, speed) {
    var duration = Math.sqrt(1/speed);
    hand.lands(duration);
    var p1 = clock.stonePosition(coords[0], coords[1], 0);
    var p2 = clock.stonePosition(coords[0], coords[1], 10);
    var self = clock;
    var end_tasks = function() {
        setVisible(hand.element(), false);
        setVisible(hand.element().querySelector('.stone-shadow'), false);
        hand.moving = false;
        hand.src = null;
        hand.element().style.opacity = '1.0';
        self.sound?.bowl(colour == white ? 'white' : 'black');
        self.transform();
    };
    
    setStyles(hand.element(), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
    var movingShadow = hand.element().querySelector('.stone-shadow');
    setStoneShadow(movingShadow, 0);
    var src = stoneImageSrc(colour, hand.src);
    var movingStoneImage = hand.element().querySelector('img');
    movingStoneImage.src = src;
    setVisible(movingStoneImage, true);
    requestAnimationFrame(function() {
        setStoneShadow(movingShadow, 10);
    });
    animateElement(hand.element(), duration, {
        left: p2[0],
        top: p2[1],
        width: p2[2],
        height: p2[3],
        opacity: 0.3,
        onComplete: end_tasks});
}

function showPushedStone(clock, hand, swap, delay, duration) {
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

function returnPushedStone(clock, hand) {
    var swap = hand.pending_swap;
    var fromPosition = clock.stonePosition(swap.displaced_coords[0], swap.displaced_coords[1], 0);
    var toCoords = clock.get_coords(swap.source);
    var toPosition = clock.stonePosition(toCoords[0], toCoords[1], 0);
    var movingStone = hand.element();
    var movingStoneImage = hand.element().querySelector('img');
    var movingStoneShadow = hand.element().querySelector('.stone-shadow');
    var duration = Math.sqrt(dist(swap.target, swap.source)/(clock.speed*hand.pace));
    hand.lands(duration);
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
            hand.position = swap.source;
            hand.pending_swap = null;
            hand.src = null;
            hand.moving = false;
            self.transform();
        }
    });
}
