/**
 * Created by scott on 15/05/2014.
 */

import {gridsize, white, black, go_bowl, go_table, minx, maxx, miny, maxy, dist, emptyBoard} from './board.js';
import {faceFor} from './faces.js';
import {planMove} from './planner.js';
import {voidFadeTime} from './physics.js';
import {sweepBoard} from './sweep.js';
import {fingerDown, fingerMove, fingerUp, endFinger} from './hand.js';
import {$, gobanImage, tableTransform, tableStoneScale, setStyles, setVisible, setStoneShadow, stoneImageSrc,
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

    this.disorderRadius = function() {
        if (this.placement == 0) {
            return 0;
        }
        var speedRatio = Math.min(1, Math.sqrt(Math.max(this.speed, 1)/120));
        if (this.placement == 3) {
            return 0.08 + 0.26*speedRatio;
        }
        if (this.placement == 2) {
            return 0.045 + 0.145*speedRatio;
        }
        return 0.02 + 0.085*speedRatio;
    };

    this.maxOffsetRadius = function() {
        if (this.placement == 0) {
            return 0;
        }
        if (this.placement == 3) {
            return 0.4;
        }
        if (this.placement == 2) {
            return 0.28;
        }
        return 0.18;
    };

    this.randomOffset = function() {
        if (this.placement == 0) {
            return [0, 0];
        }
        var radius = this.disorderRadius()*Math.sqrt(Math.random());
        var angle = Math.random()*Math.PI*2;
        return [Math.cos(angle)*radius, Math.sin(angle)*radius];
    };

    // Within the radius, and never so far along either axis that the stone
    // rounds to the next point: everything that finds a stone's element by
    // its coordinates (drawStone, eraseStone, getDrawnStoneSrc) relies on
    // get_index(get_coords(i)) being i.
    this.clampOffset = function(offset, maxRadius = this.maxOffsetRadius()) {
        var radius = Math.sqrt(offset[0]*offset[0] + offset[1]*offset[1]);
        if (radius > maxRadius) {
            offset = [offset[0]/radius*maxRadius, offset[1]/radius*maxRadius];
        }
        return [
            Math.max(-0.49, Math.min(0.49, offset[0])),
            Math.max(-0.49, Math.min(0.49, offset[1]))
        ];
    };

    this.setOffset = function(index, offset) {
        this.offsets[index] = this.clampOffset(offset);
    };

    this.adjustOffset = function(index, dx, dy) {
        var current = this.offsets[index];
        // A stone a finger left well off its point is not pulled in by a nudge.
        var maxRadius = Math.max(this.maxOffsetRadius(), Math.hypot(current[0], current[1]));
        this.offsets[index] = this.clampOffset([current[0] + dx, current[1] + dy], maxRadius);
    };

    this.coordsForOffset = function(index, offset) {
        var x = index % gridsize;
        var y = (index - x)/gridsize;
        return [x + offset[0], y + offset[1]];
    };

    this.offsetRadius = function(index) {
        var offset = this.offsets[index];
        return Math.sqrt(offset[0]*offset[0] + offset[1]*offset[1]);
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

    this.setLandingOffset = function(index) {
        this.setOffset(index, this.randomOffset());
        this.updateBoardPosition(index, false);
    };

    this.alignmentTargetRadius = function() {
        if (this.placement == 0) {
            return 0.004;
        }
        if (this.placement == 3) {
            return 0.095;
        }
        if (this.placement == 2) {
            return 0.07;
        }
        return 0.04;
    };

    this.alignmentTriggerRadius = function() {
        return this.alignmentTargetRadius() + 0.01;
    };

    this.alignedOffset = function(index) {
        var offset = this.offsets[index];
        var radius = this.offsetRadius(index);
        if (this.placement == 0 || radius == 0) {
            return [0, 0];
        }

        var targetRadius = this.alignmentTargetRadius();
        var newRadius = Math.min(radius*0.3, targetRadius*0.45);
        return [offset[0]/radius*newRadius, offset[1]/radius*newRadius];
    };

    this.findAlignmentMove = function() {
        if (this.placement >= 2) {
            return null;
        }

        var best = null;
        var triggerRadius = this.alignmentTriggerRadius();
        for (var i = 0; i < this.stones_shown.length; ++i) {
            if (this.stones_shown[i] == 0) {
                continue;
            }

            var radius = this.offsetRadius(i);
            var excess = radius - triggerRadius;
            if (excess <= 0) {
                continue;
            }

            var handDistance = dist(this.hand_position, i);
            var score = (handDistance + 1)/(excess*excess);
            if (!best || score < best.score) {
                best = {
                    index: i,
                    score: score,
                    offset: this.alignedOffset(i)
                };
            }
        }
        return best;
    };

    this.alignIdleStone = function() {
        var move = this.findAlignmentMove();
        if (!move) {
            return false;
        }

        this.moving_stone = true;
        this.stone_from = this.get_coords(move.index);
        this.stone_to = this.coordsForOffset(move.index, move.offset);
        this.hand_position = move.index;
        this.stone_colour = this.stones_shown[move.index];
        this.alignment_move = {
            index: move.index,
            offset: move.offset
        };
        this.stones_shown[move.index] = 0;
        this.clear_route = true;
        return true;
    };

    this.stoneCollisionDistance = function() {
        return (gridsize - 1)/(20*(maxx - minx))*0.98;
    };

    this.nearbyOccupiedIndexes = function(seedIndex) {
        var indexes = new Set([seedIndex]);
        var seedX = seedIndex % gridsize;
        var seedY = (seedIndex - seedX)/gridsize;
        for (var i = 0; i < this.stones_shown.length; ++i) {
            if (this.stones_shown[i] == 0 || i == seedIndex) {
                continue;
            }
            var x = i % gridsize;
            var y = (i - x)/gridsize;
            if (Math.abs(x - seedX) <= 2 && Math.abs(y - seedY) <= 2) {
                indexes.add(i);
            }
        }
        return [...indexes];
    };

    this.relaxOverlaps = function(seedIndex) {
        if (this.placement == 0) {
            return new Set();
        }
        var changed = new Set();
        var minDistance = this.stoneCollisionDistance();
        var indexes = this.nearbyOccupiedIndexes(seedIndex);
        for (var pass = 0; pass < 4; ++pass) {
            for (var a = 0; a < indexes.length; ++a) {
                for (var b = a + 1; b < indexes.length; ++b) {
                    var indexA = indexes[a];
                    var indexB = indexes[b];
                    if (this.stones_shown[indexA] == 0 || this.stones_shown[indexB] == 0) {
                        continue;
                    }
                    var coordsA = this.get_coords(indexA);
                    var coordsB = this.get_coords(indexB);
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
                    this.adjustOffset(indexA, -dx*push*pushA, -dy*push*pushA);
                    this.adjustOffset(indexB, dx*push*pushB, dy*push*pushB);
                    changed.add(indexA);
                    changed.add(indexB);
                }
            }
        }
        return changed;
    };

    this.settleAfterLanding = function(index) {
        this.relaxOverlaps(index).forEach((changedIndex) => {
            this.updateBoardPosition(changedIndex, true);
        });
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

    this.showPushedStone = function(swap, delay, duration) {
        var pushedStone = $('#pushed_stone');
        var pushedStoneImage = $('#pushed_stone img');
        var pushedStoneShadow = $('#pushed_stone .stone-shadow');
        var fromPosition = this.stonePosition(swap.target_coords[0], swap.target_coords[1], 0);
        var toPosition = this.stonePosition(swap.displaced_coords[0], swap.displaced_coords[1], 0);
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
        if (this.sound) {
            var self = this;
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
    };

    this.returnPushedStone = function() {
        var swap = this.pending_swap;
        var fromPosition = this.stonePosition(swap.displaced_coords[0], swap.displaced_coords[1], 0);
        var toCoords = this.get_coords(swap.source);
        var toPosition = this.stonePosition(toCoords[0], toCoords[1], 0);
        var movingStone = $('#moving_stone');
        var movingStoneImage = $('#moving_stone img');
        var movingStoneShadow = $('#moving_stone .stone-shadow');
        var duration = Math.sqrt(dist(swap.target, swap.source)/this.speed);
        var self = this;

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
                self.settleAfterLanding(swap.source);
                self.hand_position = swap.source;
                self.pending_swap = null;
                self.moving_stone_src = null;
                self.moving_stone = false;
                self.transform();
            }
        });
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
    
    this.move_stone = function() {
        var movingStone = $("#moving_stone");
        cancelElementAnimations(movingStone);
        movingStone.style.opacity = '1.0';
        setVisible(movingStone, true);
        $('#moving_stone img').style.removeProperty('filter');
        setVisible($('#moving_stone .stone-shadow'), true);
        if (this.stone_from[0] == go_table) {
            this.moving_stone_src = this.table_pickup.src;
            this.liftFromTable(this.table_pickup, this.stone_to, this.stone_colour, this.speed);
            return;
        }
        this.moving_stone_src = this.stone_from[0] == go_bowl
            ? stoneImageSrc(this.stone_colour)
            : this.getDrawnStoneSrc(this.stone_from);
        if (this.stone_from[0] != go_bowl) {
            this.eraseStone(this.stone_from);
        }

        if (this.stone_from[0] == go_bowl) {
            this.dropStone(this.stone_to, this.stone_colour, this.speed);
        }
        if (this.stone_to[0] == go_bowl) {
            this.pickupStone(this.stone_from, this.stone_colour, this.speed);
        }
        
        if (this.stone_from[0] != go_bowl && this.stone_to[0] != go_bowl) {
            this.repositionStone(this.stone_from, this.stone_to, this.stone_colour, this.speed);
        }
    };

    // A stone lifted from the table and carried to a point on
    // the board, in an arc, as a long move is.
    this.liftFromTable = function(entry, coords2, colour, speed) {
        var self = this;
        var p1 = this.pixelStonePosition(entry.x, entry.y, 0);
        // From its size on the table, which is that little further away.
        p1 = [p1[0] + p1[2]*(1 - tableStoneScale)/2, p1[1] + p1[3]*(1 - tableStoneScale)/2, p1[2]*tableStoneScale, p1[3]*tableStoneScale];
        var p2 = this.stonePosition(coords2[0], coords2[1], 0);
        var distance = Math.hypot(coords2[0] - entry.coords[0], coords2[1] - entry.coords[1]);
        var duration = Math.sqrt(distance/speed);
        var max_height = Math.min(12, 8 + distance/2);
        var middle = this.pixelStonePosition((entry.x + p2[0] + p2[2]/2)/2, (entry.y + p2[1] + p2[3]/2)/2, max_height);
        var end_tasks = function() {
            var landingIndex = Math.round(self.stone_to[0]) + gridsize*Math.round(self.stone_to[1]);
            self.stones_shown[landingIndex] = self.stone_colour;
            setVisible($("#moving_stone"), false);
            setVisible($('#moving_stone .stone-shadow'), false);
            self.drawStone(self.stone_to, self.stone_colour, 0, self.moving_stone_src);
            self.sound?.place(self.stone_colour == white ? 'white' : 'black');
            self.settleAfterLanding(landingIndex);
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
    };

    this.repositionStone = function(coords1, coords2, colour, speed) {
        var p1 = this.stonePosition(coords1[0], coords1[1], 0);
        var p2 = this.stonePosition(coords2[0], coords2[1], 0);
        var self = this;
        var end_tasks = function() {
            // add stone to board
            var landingIndex = Math.round(self.stone_to[0]) + gridsize*Math.round(self.stone_to[1]);
            self.stones_shown[landingIndex] = self.stone_colour;
            setVisible($("#moving_stone"), false);
            setVisible($('#moving_stone .stone-shadow'), false);
            if (self.alignment_move) {
                self.setOffset(landingIndex, self.alignment_move.offset);
                self.updateBoardPosition(landingIndex, false);
            }
            self.drawStone(self.alignment_move ? self.get_coords(landingIndex) : self.stone_to, self.stone_colour, 0, self.moving_stone_src);
            if (!self.alignment_move && !self.clear_route) {
                self.sound?.place(self.stone_colour == white ? 'white' : 'black');
            }
            if (self.pending_swap && self.pending_swap.phase == 'push') {
                self.pending_swap.phase = 'return';
                self.returnPushedStone();
                return;
            }
            if (self.alignment_move) {
                self.alignment_move = null;
            } else {
                self.settleAfterLanding(landingIndex);
            }
            self.moving_stone_src = null;
            self.moving_stone = false;
            self.transform();
        };
        
        setStyles($("#moving_stone"), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
        var movingShadow = $('#moving_stone .stone-shadow');
        setStoneShadow(movingShadow, 0);
        var src = stoneImageSrc(colour, this.moving_stone_src);
        var movingStoneImage = $("#moving_stone img");
        movingStoneImage.src = src;
        setVisible(movingStoneImage, true);
        var distance = dist(this.get_index(coords1), this.get_index(coords2));
        var coordinateDistance = Math.sqrt((coords2[0] - coords1[0])*(coords2[0] - coords1[0]) +
                                           (coords2[1] - coords1[1])*(coords2[1] - coords1[1]));
        var duration = Math.sqrt(distance/speed);
        if (this.alignment_move) {
            duration = Math.max(0.16, Math.min(0.45, Math.sqrt((coordinateDistance*7)/speed)));
        }
        if (this.pending_swap && this.pending_swap.phase == 'push') {
            var pushDuration = Math.max(0.12, Math.min(duration*0.28, 0.35));
            this.showPushedStone(this.pending_swap, Math.max(0, duration - pushDuration), pushDuration);
        }
        if (this.clear_route) {
            if (!this.alignment_move) {
                this.sound?.slide(duration);
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
            var middle = this.stonePosition((coords1[0] + coords2[0])/2, (coords1[1] + coords2[1])/2, max_height);
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
    };
    this.dropStone = function(coords, colour, speed) {
        var duration = Math.sqrt(1/speed);
        var p1 = this.stonePosition(coords[0], coords[1], 10);
        var p2 = this.stonePosition(coords[0], coords[1], 0);
        var self = this;
        var end_tasks = function() {
            // add stone to board
            var landingIndex = Math.round(self.stone_to[0]) + gridsize*Math.round(self.stone_to[1]);
            self.stones_shown[landingIndex] = self.stone_colour;
            setVisible($("#moving_stone"), false);
            setVisible($('#moving_stone .stone-shadow'), false);
            self.drawStone(self.stone_to, self.stone_colour, 0, self.moving_stone_src);
            self.sound?.place(self.stone_colour == white ? 'white' : 'black');
            self.settleAfterLanding(landingIndex);
            self.moving_stone_src = null;
            self.moving_stone = false;
            self.transform();
        };
        
        setStyles($("#moving_stone"), {left: p1[0], top: p1[1], width: p1[2], height: p1[3]});
        var movingShadow = $('#moving_stone .stone-shadow');
        setStoneShadow(movingShadow, 10);
        var src = stoneImageSrc(colour, this.moving_stone_src);
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
    this.pickupStone = function(coords, colour, speed) {
        var duration = Math.sqrt(1/speed);
        var p1 = this.stonePosition(coords[0], coords[1], 0);
        var p2 = this.stonePosition(coords[0], coords[1], 10);
        var self = this;
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
        var src = stoneImageSrc(colour, this.moving_stone_src);
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
            this.alignIdleStone();
        }
        if (this.moving_stone == true) {
            this.move_stone();
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
            this.setLandingOffset(plan.to);
            this.stone_to = this.get_coords(plan.to);
            this.clear_route = false;
            break;
        case 'move':
            this.stone_from = this.get_coords(plan.from);
            this.hand_position = plan.to;
            this.stone_colour = this.stones_shown[plan.from];
            this.stones_shown[plan.from] = 0;
            this.setLandingOffset(plan.to);
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
            this.setLandingOffset(plan.to);
            this.stone_to = this.get_coords(plan.to);
            this.hand_position = plan.to;
            break;
        }
    };
}
