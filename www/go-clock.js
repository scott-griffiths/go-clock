/**
 * Created by scott on 15/05/2014.
 */

import {gridsize, white, go_bowl, go_table, minx, maxx, miny, maxy, emptyBoard} from './board.js';
import {faceFor} from './faces.js';
import {planMove} from './planner.js';
import {setTumbling, voidFlightTime, dropTime} from './physics.js';
import {flyOn} from './flight.js';
import {sinkOn} from './water.js';
import {sweepBoard} from './sweep.js';
import {replayWanted, replaySettled} from './replay.js';
import {fingerDown, fingerMove, fingerUp, endFinger} from './hand.js';
import {setLandingOffset, alignIdleStone} from './placement.js';
import {moveStone, moveDuration} from './moves.js';
import {drawBowls} from './bowls.js';
import {$, gobanImage, drawOnTable, maxLift, setStyles, setVisible, setStoneShadow, stoneImageSrc,
        cancelElementAnimations, animateElement, elementCentre, stoneElement, looseStone} from './stone-dom.js';

function displacedCoords(fromCoords, toCoords) {
    var dx = toCoords[0] - fromCoords[0];
    var dy = toCoords[1] - fromCoords[1];
    var distance = Math.sqrt(dx*dx + dy*dy) || 1;
    var x = toCoords[0] + dx/distance*0.55;
    var y = toCoords[1] + dy/distance*0.55;

    if (x < 0 || x > gridsize - 1 || y < 0 || y > gridsize - 1) {
        x = toCoords[0] - dy/distance*0.55;
        y = toCoords[1] + dx/distance*0.55;
    }

    return [
        Math.max(0, Math.min(gridsize - 1, x)),
        Math.max(0, Math.min(gridsize - 1, y))
    ];
}

// A hand: what it is carrying, and where. The clock has two. The hand does
// everything — stones from the bowl and back to it, swaps, the nudges
// straighter — and the other hand only moves stones already on the screen,
// from point to point and up from the table. Each carries its stone in an
// element of its own, made by draw().
function Hand(name, elementId, position) {
    this.name = name;
    this.elementId = elementId;
    this.moving = false;
    this.from = [0, 0]; // Board coordinates; go_bowl or go_table when not on the board
    this.to = [0, 0];
    this.colour = white;
    this.clear_route = true; // Slid, rather than lifted over what is in the way
    this.src = null; // The image of the stone being carried
    this.pending_swap = null;
    this.alignment_move = null;
    this.table_pickup = null;
    this.position = position; // The point the hand is at, for the next move's reckoning
    this.pace = 1; // This move's speed, as a share of the clock's
    this.reaching = null; // A timer: the hand holding off for a moment before a stone
    this.ready = false; // Having rested before the next stone
    this.startedAt = 0; // When this move's stone was picked up (performance.now())
    this.landsAt = 0; // ...and when it is put down
}
Hand.prototype.element = function() {
    return $(this.elementId);
};
// A move is under way that will take `duration` seconds (moves.js).
Hand.prototype.lands = function(duration) {
    this.startedAt = performance.now();
    this.landsAt = this.startedAt + duration*1000;
};
// How long from `now` until this hand is more than `ms` past picking its
// stone up and not within `ms` of putting it down: the moments the other
// hand should not share. Zero if it is clear of them now.
Hand.prototype.clearOf = function(now, ms) {
    if (!this.moving) {
        return 0;
    }
    var wait = 0;
    if (now - this.startedAt < ms) {
        wait = ms - (now - this.startedAt);
    }
    if (this.landsAt - now < ms && this.landsAt + ms > now + wait) {
        wait = this.landsAt + ms - now;
    }
    return wait;
};
// The points this hand's move touches, for the other to keep clear of.
Hand.prototype.points = function(clock) {
    var points = new Set();
    if (this.moving) {
        [this.from, this.to].forEach((coords) => {
            if (coords[0] < gridsize) {
                points.add(clock.get_index(coords));
            }
        });
    }
    return points;
};

export function GoClock(){
    this.stones = []; // The current (desired) state
    this.stones_shown = []; // The stones last drawn
    var centre = 9*19 + 9;
    this.hand = new Hand('hand', '#moving_stone', centre);
    this.other = new Hand('other', '#moving_stone2', centre);
    this.hands = [this.hand, this.other];
    // Whether either hand is carrying a stone.
    this.busy = function() {
        return this.hands.some((hand) => hand.moving);
    };
    // Something with place/slide/nudge/bowl/knock/land/setRumble methods
    // (see sounds.js), or null for a silent board.
    this.sound = null;
    // A function taking 'prepare' or 'bump' (and how hard, 0 to 1), for
    // feedback under the finger (my-clock.js), or null.
    this.haptic = null;
    // How hard the table drags on a stone skidding across it, relative to
    // a wooden table: grass holds a stone, wet glass lets it go (set by
    // my-clock.js from the background).
    this.table_grip = 1;
    // No table at all: a stone that goes over the edge falls away into the
    // dark and fades, silently, rather than landing (the space background).
    this.table_void = false;
    // Water for a table: a stone that goes over the edge splashes in and
    // sinks (the water background).
    this.table_water = false;
    this.sweeping_board = false;
    // A game being replayed on the board (replay.js), or null: while there
    // is one, transform() works towards its positions instead of the time's.
    this.replay = null;

    // Where the two bowls lie, in px within the goban (bowls.js); set by draw().
    this.bowls = null;

    this.offsets = []; // The small offsets of each stone position to make it less regular-looking

    this.view = 0; // The clock type

    this.speed = 26; // How fast a stone moves (moves.js)
    this.pause = 180; // How long a hand rests between stones, in ms

    this.placement = 1; // 0 exact, 1 organic, 2 careless

    this.twenty_four_hour = true; // 24 hour mode for views that make sense

    this.reset_offsets = function() {
        this.offsets = [];
        for (var i = 0; i < gridsize*gridsize; ++i){
            this.offsets.push([0, 0]);
        }
    };

    this.stones = emptyBoard();
    this.stones_shown = emptyBoard();
    this.reset_offsets();

    // The coordinates of a point with a given index
    this.get_coords = function(p) {
        return [p%gridsize + this.offsets[p][0], (p - p%gridsize)/gridsize + this.offsets[p][1]];
    };
    // The reverse operation: Get index of point from coordinates
    this.get_index = function(p) {
        return Math.round(p[0]) + gridsize*Math.round(p[1]);
    };

    this.updateBoardPosition = function(index, animate = false) {
        if (typeof document === 'undefined') {
            return;
        }
        var element = $('#p' + index);
        if (!element) {
            return;
        }
        var coords = this.get_coords(index);
        var p = this.stonePosition(coords[0], coords[1], 0);
        if (animate && this.stones_shown[index] != 0) {
            animateElement(element, 0.18, {
                left: p[0],
                top: p[1],
                width: p[2],
                height: p[3],
                easing: 'ease-out'
            });
        } else {
            setStyles(element, {
                left: p[0],
                top: p[1],
                width: p[2],
                height: p[3]
            });
        }
    };

    // Sweeping the board: sweep.js.
    this.resetBoard = function() {
        sweepBoard(this);
    };

    // The hand: a finger held on the board, driven by my-clock.js from the
    // pointer events. It is a disc two stones wide that follows the pointer.
    // Stones in its way are shoved aside and skid a little, knocking into
    // each other; any pushed over the edge drop onto the table, skid to a
    // stop, and fade. The hand stops what it is doing (the stone it held
    // drops where it is), waits for the finger to go and the stones to lie
    // still, and then carries on with the board as it finds it: a stone
    // stays where it was left, and counts as being at the nearest point.
    this.finger = null;
    this.idle_timer = null;
    // Stones a finger pushed off the board that are still on the screen.
    // They are in play: the hand lifts them back on when it wants a stone,
    // before it goes to the bowl. Each has a colour, src, coords (board
    // coordinates, beyond the grid) and an element of its own.
    this.table_stones = [];

    this.fingerRadius = function() {
        return this.goban_width/16;
    };

    // Board coordinates of a pixel in the goban element.
    this.boardCoords = function(px, py) {
        var spacingX = (maxx - minx)*this.goban_width/(gridsize - 1);
        var spacingY = (maxy - miny)*this.goban_height/(gridsize - 1);
        return [
            (px - this.x_offset - minx*this.goban_width)/spacingX,
            (py - this.y_offset - miny*this.goban_height)/spacingY
        ];
    };

    // The pixel centre of a point in board coordinates.
    this.pixelForCoords = function(coords) {
        return [
            this.x_offset + minx*this.goban_width + coords[0]*(maxx - minx)*this.goban_width/(gridsize - 1),
            this.y_offset + miny*this.goban_height + coords[1]*(maxy - miny)*this.goban_height/(gridsize - 1)
        ];
    };

    // As stonePosition, for a stone by its pixel centre, anywhere.
    this.pixelStonePosition = function(x, y, height) {
        var lift = Math.min(height, maxLift);
        var diameter = (this.goban_width/20)*(1 + lift/20) | 0;
        return [x - diameter/2 | 0, y - lift*this.goban_height/600 - diameter/2 | 0, diameter, diameter];
    };

    // The board, and the screen, as the physics sees them: rectangles in
    // px within the goban element. A stone that leaves the screen is gone.
    this.boardRect = function() {
        return {
            left: this.x_offset,
            top: this.y_offset,
            right: this.x_offset + this.goban_width,
            bottom: this.y_offset + this.goban_height
        };
    };

    this.screenRect = function() {
        var goban = $('#goban');
        return {
            right: goban.clientWidth || window.innerWidth,
            bottom: goban.clientHeight || window.innerHeight
        };
    };

    // The table has gone from under the stones lying on it: they drift
    // away, turning over slowly, each its own way (flight.js).
    this.dropTableStones = function() {
        var diameter = this.goban_width/20;
        var stones = this.table_stones.map((entry) => {
            var stone = {
                element: entry.element,
                src: entry.src,
                colour: entry.colour,
                x: entry.x,
                y: entry.y,
                r: diameter/2,
                vx: (Math.random() - 0.5)*diameter*2,
                vy: (Math.random() - 0.5)*diameter*2,
                offBoard: true,
                landed: true,
                falling: true,
                height: 0,
                climb: 1/voidFlightTime,
                leftAt: 0,
                gone: false
            };
            setTumbling(stone, Math.atan2(stone.vy, stone.vx), 2 + Math.random()*3);
            return stone;
        });
        this.table_stones = [];
        flyOn(stones, 0, {board: this.boardRect(), screen: this.screenRect(), diameter: diameter});
    };

    // The stones lying on the table when the table becomes water: each
    // goes in where it lies, with a splash.
    this.sinkTableStones = function() {
        var diameter = this.goban_width/20;
        var stones = this.table_stones.map((entry) => ({
            element: entry.element,
            src: entry.src,
            colour: entry.colour,
            x: entry.x,
            y: entry.y,
            r: diameter/2,
            vx: 0,
            vy: 0,
            offBoard: true,
            landed: false,
            leftAt: -dropTime,
            gone: false
        }));
        this.table_stones = [];
        sinkOn(stones, 0, {board: this.boardRect(), screen: this.screenRect(), diameter: diameter});
    };

    // A stone free of the grid, drawn by an element of its own (stone-dom.js).
    this.looseStone = function(src, colour, x, y) {
        return looseStone($('#goban'), this.goban_width/20, src, colour, x, y);
    };

    // Whatever the hands are doing stops, and the stones they hold drop
    // where they are, as loose stones of their own; so does one being
    // pushed aside. Returns the loose stones, for the finger or the sweep
    // to take on.
    this.dropHeldStones = function() {
        var stones = [];
        var pushedStone = $('#pushed_stone');
        this.hands.forEach((hand) => {
            window.clearTimeout(hand.reaching);
            hand.reaching = null;
            hand.ready = false;
            if (!hand.moving) {
                return;
            }
            var movingStone = hand.element();
            var swap = hand.pending_swap;
            if (!movingStone.hidden) {
                var at = elementCentre(movingStone, this.goban_width/20);
                var colour = swap && swap.phase == 'return' ? swap.displaced_colour : hand.colour;
                stones.push(this.looseStone(movingStone.querySelector('img').src, colour, at[0], at[1]));
            }
            if (swap && swap.phase == 'push' && !pushedStone.hidden) {
                var at = elementCentre(pushedStone, this.goban_width/20);
                stones.push(this.looseStone(swap.displaced_src, swap.displaced_colour, at[0], at[1]));
                // The board still records that stone at the point it is leaving.
                this.stones_shown[swap.target] = 0;
            }
            cancelElementAnimations(movingStone);
            setVisible(movingStone, false);
            movingStone.style.opacity = '1.0';
            hand.moving = false;
            hand.pending_swap = null;
            hand.alignment_move = null;
            hand.src = null;
            hand.table_pickup = null;
        });
        cancelElementAnimations(pushedStone);
        setVisible(pushedStone, false);
        return stones;
    };

    // The hand: hand.js.
    this.fingerDown = function(clientX, clientY) {
        return fingerDown(this, clientX, clientY);
    };
    this.fingerMove = function(clientX, clientY) {
        fingerMove(this, clientX, clientY);
    };
    this.fingerUp = function() {
        fingerUp(this);
    };
    this.endFinger = function() {
        endFinger(this);
    };

    // Build the board for a window this size: the goban image, an element
    // for every point drawn from stones_shown, and the stones on the table.
    // While the board is busy — a stone in the hand, a sweep, a finger on
    // it — the rebuild waits, and transform() does it once the board is
    // quiet. (A rebuild in the middle of a sweep would leave the sweep
    // hiding elements no longer on the page, and every swept stone still
    // showing on the new ones with the model sure they had gone.) Returns
    // whether it was done now. `onDraw`, if set, is called after each
    // rebuild: my-clock.js puts the wood back on the new image.
    this.onDraw = null;
    this.pending_size = null;
    this.draw = function(width, height) {
        if (this.sweeping_board || this.busy() || this.finger) {
            this.pending_size = [width, height];
            return false;
        }
        this.pending_size = null;
        if (width === this.window_width && height === this.window_height) {
            // The same window: nothing to do.
            return true;
        }
        this.window_width = width;
        this.window_height = height;
        this.goban_width = width * 0.95 | 0; // Some padding to show background
        this.goban_height = height * 0.95 | 0;
        var goban_ratio = 857/800; // Ratio of the goban image

        if (this.goban_width*goban_ratio > this.goban_height) {
            // clip to height
            this.goban_width = this.goban_height/goban_ratio | 0;
        } else {
            this.goban_height = this.goban_width*goban_ratio | 0;
        }
        this.y_offset = (height - this.goban_height) / 2 | 0;
        this.x_offset = (width - this.goban_width) / 2 | 0;
        gobanImage.id = 'goban-image';
        gobanImage.alt = '';
        var goban = $('#goban');
        goban.replaceChildren(gobanImage);
        var gobanImg = goban.querySelector('img');
        setStyles(gobanImg, {width: this.goban_width, height: this.goban_height});
        var padding = ((height - this.goban_height) / 2) | 0;
        setStyles(gobanImg, {marginTop: padding, marginBottom: padding});
        var s = this.goban_height / 50 | 0;
        gobanImg.style.boxShadow = `${s}px ${2*s}px ${2*s}px 0px rgba(0,0,0,0.6)`;

        // The bowls, at either end of the board and under everything on it.
        drawBowls(this, goban);


        // An element for every point of the grid, sized and placed for its
        // stone; then one for the stone in each hand, and one for a stone
        // the hand pushes aside.
        for (var i = 0; i < gridsize*gridsize; ++i) {
            var coords = this.get_coords(i);
            var p = this.stonePosition(coords[0], coords[1], 0);
            var point = stoneElement({id: 'p' + i, className: 'board_pos'});
            setStyles(point, {left: p[0], top: p[1], width: p[2], height: p[3]});
            goban.append(point);
        }
        goban.append(stoneElement({id: 'moving_stone', imageHidden: true}));
        goban.append(stoneElement({id: 'moving_stone2', imageHidden: true}));
        goban.append(stoneElement({id: 'pushed_stone', hidden: true}));

        // The hand's disc, and the stones on the table.
        var finger = document.createElement('div');
        finger.id = 'finger';
        goban.append(finger);
        setVisible(finger, false);
        this.table_stones.forEach((entry) => {
            var at = this.pixelForCoords(entry.coords);
            entry.x = at[0];
            entry.y = at[1];
            entry.element = this.looseStone(entry.src, entry.colour, at[0], at[1]).element;
            drawOnTable(entry.element, 1, '', entry.lift || 0);
        });

        for (var i = 0; i < gridsize*gridsize; ++i) {
            var p = this.stones_shown[i];
            if (p != 0) {
                this.drawStone(this.get_coords(i), p, 0);
            } else {
                // Draw the stone anyway, then hide it
                this.drawStone(this.get_coords(i), 1, 0);
                this.eraseStone(this.get_coords(i));
            }
        }
        this.onDraw?.();
        return true;
    };

    this.drawStone = function(coords, colour, height, src = null) {
        if (coords[0] <= -0.5 || coords[0] >= gridsize - 0.5 || coords[1] <= -0.5 || coords[1] >= gridsize - 0.5) {
            return;
        }
        var p = this.stonePosition(coords[0], coords[1], height);
        src = stoneImageSrc(colour, src);
        var i = this.get_index(coords);
        var position = $('#p' + i);
        var stone = position.querySelector('img');
        var shadow = position.querySelector('.stone-shadow');
        stone.style.removeProperty('filter');
        stone.src = src;
        setStoneShadow(shadow, height);
        position.classList.add('has-stone');
        setVisible(shadow, true);
        setVisible(stone, true);
        return p;
    };

    this.getDrawnStoneSrc = function(coords) {
        var i = this.get_index(coords);
        return $('#p' + i).querySelector('img').src;
    };

    // Remove a stone from the buffered board
    this.eraseStone = function(coords) {
        var i = this.get_index(coords);
        var position = $('#p' + i);
        position.classList.remove('has-stone');
        setVisible(position.querySelector('.stone-shadow'), false);
        setVisible(position.querySelector('img'), false);
        this.stones_shown[Math.round(coords[0]) + gridsize*Math.round(coords[1])] = 0;
        return;
    };

    // The board the face wants now (or at the given time, for the tests).
    this.update = function(seconds, minutes, hours, days) {
        var now = new Date();
        this.view %= 4;
        this.stones = faceFor(this.view, {
            hours: hours ?? now.getHours(),
            minutes: minutes ?? now.getMinutes(),
            seconds: seconds ?? now.getSeconds(),
            days: days ?? 0
        }, this.twenty_four_hour);
    };

    // Given board coordinates and a height, return the stone's pixel x, y, w, h
    this.stonePosition = function(x, y, height) {
        if (x <= -0.5 || x >= gridsize - 0.5 || y <= -0.5 || y >= gridsize - 0.5) {
            return;
        }
        if (height > maxLift) {
            height = maxLift;
        }
        var xpos = minx*this.goban_width + x*(maxx-minx)*this.goban_width/(gridsize - 1);
        var ypos = miny*this.goban_height - (height*this.goban_height/600) + y*(maxy-miny)*this.goban_height/(gridsize - 1);
        var diameter = (this.goban_width/20) * (1 + height/20) | 0;
        return [xpos - diameter/2 + this.x_offset | 0, ypos - diameter/2 + this.y_offset | 0, diameter, diameter];
    };
    
    // A move towards the board the face wants for each hand that is free,
    // and the next once it has landed; or, with the board right, a stone
    // nudged straighter; or a look again as the second turns. The hand
    // plans first, and the other hand keeps clear of whatever the hand is
    // doing (and the hand of it): the points a move touches are reserved
    // from the other's planning. Each hand rests a moment before each
    // stone (`pause`, more or less; most of what a slow setting slows),
    // and the other hand works at a pace of its own, so the two never
    // pick up or put down together. The clearances are measured in
    // moves: at a faster setting the moves are shorter, and so are they,
    // or the other hand would spend its time waiting and only one would
    // seem to work.
    // While a game is being replayed, the board it wants is the game's
    // next position rather than the face's (replay.js).
    this.transform = function() {
        if (this.sweeping_board || this.finger) {
            return;
        }
        window.clearTimeout(this.idle_timer);
        if (this.pending_size) {
            // A resize that came while the board was busy: once the other
            // hand has landed too.
            if (this.busy()) {
                return;
            }
            this.draw(this.pending_size[0], this.pending_size[1]);
        }
        // The board a game being replayed wants, or the time's.
        var wanted = this.replay ? replayWanted(this) : null;
        if (wanted) {
            this.stones = wanted;
        } else {
            this.update();
        }
        // How long a stone takes to move one point, at this speed; and how
        // close to the other hand's picking up or putting down is too
        // close — a fraction of that, or at the faster settings the moments
        // would cover the whole move and the other hand never get a turn.
        var beat = 1000/Math.sqrt(this.speed);
        var guard = Math.max(25, beat*0.25);
        this.hands.forEach((hand) => {
            if (hand.moving || hand.reaching) {
                return;
            }
            var otherHand = hand === this.hand ? this.other : this.hand;
            if (this.replay && hand !== this.hands[0]) {
                // Asked again: the first hand may have just set out with
                // the game's next stone, and this one can go for the one after.
                this.stones = replayWanted(this) || this.stones;
            }
            var reserved = otherHand.points(this);
            var plan = planMove({
                shown: this.stones_shown,
                wanted: this.stones,
                hand: hand.position,
                tableStones: this.table_stones,
                reserved: reserved,
                movesOnly: hand === this.other
            });
            if (plan) {
                // The rest before the stone; and not while the other hand
                // is picking up or putting down, nor so as to put this
                // stone down as the other does: the least wait that clears
                // those moments, then look again.
                var pace = hand === this.other ? 0.8 + Math.random()*0.4 : 1;
                var holdOff = 0;
                if (!hand.ready) {
                    holdOff = this.pause*(0.6 + Math.random()*0.8);
                }
                if (otherHand.moving) {
                    // And the two landings half a move apart at least, for
                    // an even cadence rather than stones arriving in pairs.
                    var now = performance.now();
                    holdOff = Math.max(holdOff, otherHand.clearOf(now, guard), 0);
                    var duration = moveDuration(this, plan, this.speed*pace)*1000;
                    var spacing = Math.max(guard, duration*0.5, (otherHand.landsAt - otherHand.startedAt)*0.5);
                    var gap = now + holdOff + duration - otherHand.landsAt;
                    // In a replay the other hand's stone is the earlier
                    // move (replay.js), and this one lands after it.
                    if (Math.abs(gap) < spacing || (this.replay && gap < 0)) {
                        holdOff += spacing - gap;
                    }
                }
                if (holdOff > 0) {
                    hand.reaching = window.setTimeout(() => {
                        hand.reaching = null;
                        hand.ready = true;
                        this.transform();
                    }, holdOff);
                    return;
                }
                hand.ready = false;
                hand.pace = pace;
                this.startMove(hand, plan);
                moveStone(this, hand);
            } else if (hand === this.hand && alignIdleStone(this, hand, reserved)) {
                moveStone(this, hand);
            }
        });
        if (!this.busy()) {
            if (this.replay) {
                // No move found, none waiting its moment: the game is
                // over, or the board is not ready for it yet.
                if (!this.hands.some((hand) => hand.reaching)) {
                    replaySettled(this);
                }
                return;
            }
            // Nothing to do: look again just after the next second turns,
            // which is the soonest any face can change.
            this.idle_timer = setTimeout(this.transform.bind(this), 1000 - Date.now() % 1000 + 5);
        }
    };

    // A plan from planner.js, taken up by a hand: the stone it carries,
    // where it is going, and what the board records meanwhile.
    this.startMove = function(hand, plan) {
        hand.moving = true;
        switch (plan.kind) {
        case 'table':
            this.table_stones.splice(this.table_stones.indexOf(plan.entry), 1);
            // A stone that was lying up on it comes down, unless it lies
            // on another too.
            var diameter = this.goban_width/20;
            this.table_stones.forEach((entry) => {
                if (entry.lift > 0 && Math.hypot(entry.x - plan.entry.x, entry.y - plan.entry.y) < diameter
                    && !this.table_stones.some((other) => other !== entry && other.lift < entry.lift
                        && Math.hypot(entry.x - other.x, entry.y - other.y) < diameter)) {
                    entry.lift = 0;
                    drawOnTable(entry.element, 1);
                }
            });
            hand.table_pickup = plan.entry;
            hand.from = [go_table, go_table];
            hand.colour = plan.entry.colour;
            hand.position = plan.to;
            setLandingOffset(this, plan.to);
            hand.to = this.get_coords(plan.to);
            hand.clear_route = false;
            break;
        case 'move':
            hand.from = this.get_coords(plan.from);
            hand.position = plan.to;
            hand.colour = this.stones_shown[plan.from];
            this.stones_shown[plan.from] = 0;
            setLandingOffset(this, plan.to);
            hand.to = this.get_coords(plan.to);
            hand.clear_route = !plan.lift;
            break;
        case 'swap': {
            var source_coords = this.get_coords(plan.source);
            var target_coords = this.get_coords(plan.target);
            hand.from = source_coords;
            hand.to = target_coords;
            hand.position = plan.target;
            hand.colour = this.stones_shown[plan.source];
            hand.pending_swap = {
                phase: 'push',
                source: plan.source,
                target: plan.target,
                source_coords: source_coords,
                target_coords: target_coords,
                displaced_coords: displacedCoords(source_coords, target_coords),
                displaced_colour: this.stones_shown[plan.target],
                displaced_src: this.getDrawnStoneSrc(target_coords)
            };
            this.stones_shown[plan.source] = 0;
            hand.clear_route = true;
            break;
        }
        case 'remove':
            hand.from = this.get_coords(plan.from);
            hand.colour = this.stones_shown[plan.from];
            hand.to = [go_bowl, go_bowl];
            hand.position = plan.from;
            this.stones_shown[plan.from] = 0;
            break;
        case 'add':
            hand.colour = plan.colour;
            hand.from = [go_bowl, go_bowl];
            setLandingOffset(this, plan.to);
            hand.to = this.get_coords(plan.to);
            hand.position = plan.to;
            break;
        }
    };
}
