/**
 * Created by scott on 15/05/2014.
 */

import {gridsize, white, go_bowl, go_table, minx, maxx, miny, maxy, emptyBoard} from './board.js';
import {faceFor} from './faces.js';
import {planMove} from './planner.js';
import {voidFadeTime} from './physics.js';
import {sweepBoard} from './sweep.js';
import {fingerDown, fingerMove, fingerUp, endFinger} from './hand.js';
import {setLandingOffset, alignIdleStone} from './placement.js';
import {moveStone} from './moves.js';
import {$, gobanImage, tableTransform, setStyles, setVisible, setStoneShadow, stoneImageSrc,
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

export function GoClock(){
    this.stones = []; // The current (desired) state
    this.stones_shown = []; // The stones last drawn
    this.moving_stone = false;
    this.stone_from = [0, 0]; // Board coordinates
    this.stone_to = [0, 0]; // Board coordinates
    this.clear_route = true; // Is the route from stone_from to stone_to clear of obstacles?
    this.stone_colour = white;
    this.pending_swap = null;
    this.alignment_move = null;
    // Something with place/slide/nudge/bowl/knock/land/setRumble methods
    // (see sounds.js), or null for a silent board.
    this.sound = null;
    // A function taking 'grab' or 'tick', for feedback under the finger
    // (my-clock.js), or null.
    this.haptic = null;
    // How hard the table drags on a stone skidding across it, relative to
    // a wooden table: grass holds a stone, wet glass lets it go (set by
    // my-clock.js from the background).
    this.table_grip = 1;
    // No table at all: a stone that goes over the edge falls away into the
    // dark and fades, silently, rather than landing (the space background).
    this.table_void = false;
    this.sweeping_board = false;

    this.hand_position = 9*19 + 9; // Position of hand that's moving the stones.

    this.offsets = []; // The small offsets of each stone position to make it less regular-looking

    this.view = 0; // The clock type

    this.speed = 9;

    this.placement = 1; // 0 exact, 1 organic, 2 careless, 3 haphazard

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
    this.table_pickup = null;

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
        var lift = Math.min(height, 10);
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

    // The table has gone from under the stones lying on it: they fall away.
    this.dropTableStones = function() {
        this.table_stones.forEach((entry) => {
            var element = entry.element;
            var animation = element.animate([
                {opacity: 1, transform: tableTransform()},
                {opacity: 0, transform: 'scale(0.55)'}
            ], {duration: voidFadeTime*1000, easing: 'ease-in', fill: 'forwards'});
            var remove = () => element.remove();
            animation.addEventListener('finish', remove, {once: true});
            animation.addEventListener('cancel', remove, {once: true});
        });
        this.table_stones = [];
    };

    // A stone free of the grid, drawn by an element of its own (stone-dom.js).
    this.looseStone = function(src, colour, x, y) {
        return looseStone($('#goban'), this.goban_width/20, src, colour, x, y);
    };

    // Whatever the hand is doing stops, and the stone it holds drops where
    // it is, as a loose stone of its own; so does one it is pushing aside.
    // Returns the loose stones, for the finger or the sweep to take on.
    this.dropHeldStones = function() {
        var stones = [];
        if (!this.moving_stone) {
            return stones;
        }
        var movingStone = $('#moving_stone');
        var pushedStone = $('#pushed_stone');
        var swap = this.pending_swap;
        if (!movingStone.hidden) {
            var at = elementCentre(movingStone, this.goban_width/20);
            var colour = swap && swap.phase == 'return' ? swap.displaced_colour : this.stone_colour;
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
        cancelElementAnimations(pushedStone);
        setVisible(pushedStone, false);
        this.moving_stone = false;
        this.pending_swap = null;
        this.alignment_move = null;
        this.moving_stone_src = null;
        this.table_pickup = null;
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
        if (this.sweeping_board || this.moving_stone || this.finger) {
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


        // An element for every point of the grid, sized and placed for its
        // stone; then one for the stone in the hand, and one for a stone it
        // pushes aside.
        for (var i = 0; i < gridsize*gridsize; ++i) {
            var coords = this.get_coords(i);
            var p = this.stonePosition(coords[0], coords[1], 0);
            var point = stoneElement({id: 'p' + i, className: 'board_pos'});
            setStyles(point, {left: p[0], top: p[1], width: p[2], height: p[3]});
            goban.append(point);
        }
        goban.append(stoneElement({id: 'moving_stone', imageHidden: true}));
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
            entry.element.style.transform = tableTransform();
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
        if (height > 10) {
            height = 10;
        }
        var xpos = minx*this.goban_width + x*(maxx-minx)*this.goban_width/(gridsize - 1);
        var ypos = miny*this.goban_height - (height*this.goban_height/600) + y*(maxy-miny)*this.goban_height/(gridsize - 1);
        var diameter = (this.goban_width/20) * (1 + height/20) | 0;
        return [xpos - diameter/2 + this.x_offset | 0, ypos - diameter/2 + this.y_offset | 0, diameter, diameter];
    };
    
    // One move towards the board the face wants, and the next once it
    // has landed; or, with the board right, a stone nudged straighter, or
    // a look again as the second turns.
    this.transform = function() {
        if (this.moving_stone == true || this.sweeping_board == true || this.finger) {
            return;
        }
        window.clearTimeout(this.idle_timer);
        if (this.pending_size) {
            // A resize that came while the board was busy.
            this.draw(this.pending_size[0], this.pending_size[1]);
        }
        this.update();
        var plan = planMove({
            shown: this.stones_shown,
            wanted: this.stones,
            hand: this.hand_position,
            tableStones: this.table_stones
        });
        if (plan) {
            this.startMove(plan);
        } else {
            alignIdleStone(this);
        }
        if (this.moving_stone == true) {
            moveStone(this);
        } else {
            // Nothing to do: look again just after the next second turns,
            // which is the soonest any face can change.
            this.idle_timer = setTimeout(this.transform.bind(this), 1000 - Date.now() % 1000 + 5);
        }
    };

    // A plan from planner.js, taken up: the stone in the hand, where it is
    // going, and what the board records meanwhile.
    this.startMove = function(plan) {
        this.moving_stone = true;
        switch (plan.kind) {
        case 'table':
            this.table_stones.splice(this.table_stones.indexOf(plan.entry), 1);
            this.table_pickup = plan.entry;
            this.stone_from = [go_table, go_table];
            this.stone_colour = plan.entry.colour;
            this.hand_position = plan.to;
            setLandingOffset(this, plan.to);
            this.stone_to = this.get_coords(plan.to);
            this.clear_route = false;
            break;
        case 'move':
            this.stone_from = this.get_coords(plan.from);
            this.hand_position = plan.to;
            this.stone_colour = this.stones_shown[plan.from];
            this.stones_shown[plan.from] = 0;
            setLandingOffset(this, plan.to);
            this.stone_to = this.get_coords(plan.to);
            this.clear_route = !plan.lift;
            break;
        case 'swap': {
            var source_coords = this.get_coords(plan.source);
            var target_coords = this.get_coords(plan.target);
            this.stone_from = source_coords;
            this.stone_to = target_coords;
            this.hand_position = plan.target;
            this.stone_colour = this.stones_shown[plan.source];
            this.pending_swap = {
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
            this.clear_route = true;
            break;
        }
        case 'remove':
            this.stone_from = this.get_coords(plan.from);
            this.stone_colour = this.stones_shown[plan.from];
            this.stone_to = [go_bowl, go_bowl];
            this.hand_position = plan.from;
            this.stones_shown[plan.from] = 0;
            break;
        case 'add':
            this.stone_colour = plan.colour;
            this.stone_from = [go_bowl, go_bowl];
            setLandingOffset(this, plan.to);
            this.stone_to = this.get_coords(plan.to);
            this.hand_position = plan.to;
            break;
        }
    };
}
