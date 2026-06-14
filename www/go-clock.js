/**
 * Created by scott on 15/05/2014.
 */

const gridsize = 19;

const go_bowl = 999;

// These give the relative positions of the sides of the goban grid as a proportion of the goban image
const minx = 0.026;
const maxx = 0.974;
const miny = 0.03;
const maxy = 0.972;

const ext = "images/";

const primaryWhiteStoneSrc = ext + "white_stone0.png";
const alternateWhiteStoneSrcs = [
    ext + "white_stone1.png",
    ext + "white_stone2.png",
    ext + "white_stone3.png"
];
const whiteStoneSrcs = [primaryWhiteStoneSrc, ...alternateWhiteStoneSrcs];
whiteStoneSrcs.forEach((src) => {
    const image = new Image();
    image.src = src;
});

var black_stone = new Image();
black_stone.src = ext + "black_stone1.png";

var goban_1200 = new Image();
goban_1200.src = ext + "goban_1200.jpg";

const white = 1;
const black = 3;

const $ = (selector, scope = document) => scope.querySelector(selector);

function setStyles(element, styles) {
    Object.entries(styles).forEach(([property, value]) => {
        if (value !== undefined) {
            element.style[property] = typeof value === 'number' ? `${value}px` : value;
        }
    });
}

function setStoneShadow(element, height = 0) {
    const lift = Math.min(height, 10);
    const liftRatio = lift/10;
    const fade = Math.pow(1 - liftRatio, 1.4);
    element.style.setProperty('--stone-shadow-scale', 1);
    element.style.setProperty('--stone-shadow-opacity', Math.max(0.02, 0.72*fade));
    element.style.setProperty('--stone-shadow-fill-alpha', Math.max(0.01, 0.34*fade));
    element.style.setProperty('--stone-shadow-blur-alpha', Math.max(0.01, 0.4*fade));
    element.style.setProperty('--stone-shadow-blur-size', `${3 + lift*0.8}px`);
    element.style.setProperty('--stone-shadow-spread-size', `${1 - lift*0.06}px`);
    element.style.setProperty('--stone-shadow-offset-x', `${1.25 + lift*0.45}px`);
    element.style.setProperty('--stone-shadow-offset-y', `${1.75 + lift*0.4}px`);
}

function randomWhiteStoneSrc() {
    if (Math.random() < 0.5) {
        return primaryWhiteStoneSrc;
    }
    return alternateWhiteStoneSrcs[Math.floor(Math.random()*alternateWhiteStoneSrcs.length)];
}

function stoneImageSrc(colour, preferredSrc = null) {
    if (colour == white) {
        return preferredSrc || randomWhiteStoneSrc();
    }
    return black_stone.src;
}

function isWrongColourPair(diff) {
    return diff == black - white || diff == white - black;
}

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

function setVisible(element, visible) {
    element.hidden = !visible;
}

function cancelElementAnimations(element) {
    element.getAnimations?.().forEach((animation) => animation.cancel());
}

function animateElement(target, duration, vars) {
    const element = typeof target === 'string' ? $(target) : target;
    if (!element) {
        vars.onComplete?.();
        return;
    }

    const {delay = 0, easing = 'ease', onComplete, cancelExisting = true, force3D, ...styleProps} = vars;
    if (cancelExisting) {
        cancelElementAnimations(element);
    }

    const finalStyles = {};
    Object.entries(styleProps).forEach(([property, value]) => {
        finalStyles[property] = typeof value === 'number' && property !== 'opacity' ? `${value}px` : String(value);
    });

    const animation = element.animate(finalStyles, {
        duration: duration * 1000,
        delay: delay * 1000,
        easing,
        fill: 'forwards'
    });

    animation.addEventListener('finish', () => {
        setStyles(element, finalStyles);
        animation.cancel();
        onComplete?.();
    }, {once: true});
}


// Small numbers, 5x7
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

// Big numbers, 6x8
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

// Tiny numbers, 5x5
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
    this.sweeping_board = false;

    this.hand_position = 9*19 + 9; // Position of hand that's moving the stones.

    this.offsets = []; // The small offsets of each stone position to make it less regular-looking

    this.view = 0; // The clock type

    this.speed = 9;

    this.placement = 1; // 0 exact, 1 organic, 2 careless, 3 haphazard

    this.twenty_four_hour = true; // 24 hour mode for views that make sense

    this.clear = function() {
        this.stones = [];
        for (var i = 0; i < gridsize*gridsize; ++i){
            this.stones.push(0); // empty space
        }
    };

    this.reset_offsets = function() {
        this.offsets = [];
        for (var i = 0; i < gridsize*gridsize; ++i){
            this.offsets.push([0, 0]);
        }
    };

    this.clear();
    this.reset_offsets();

    for (var i = 0; i < gridsize*gridsize; ++i){
        this.stones_shown.push(0); // empty space
    }

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

    this.clampOffset = function(offset) {
        var maxRadius = this.maxOffsetRadius();
        var radius = Math.sqrt(offset[0]*offset[0] + offset[1]*offset[1]);
        if (radius <= maxRadius) {
            return offset;
        }
        return [offset[0]/radius*maxRadius, offset[1]/radius*maxRadius];
    };

    this.setOffset = function(index, offset) {
        this.offsets[index] = this.clampOffset(offset);
    };

    this.adjustOffset = function(index, dx, dy) {
        this.setOffset(index, [
            this.offsets[index][0] + dx,
            this.offsets[index][1] + dy
        ]);
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

    this.resetBoard = function() {
        if (this.sweeping_board || typeof document === 'undefined') {
            return;
        }

        this.sweeping_board = true;
        this.moving_stone = false;
        this.pending_swap = null;
        this.alignment_move = null;
        this.moving_stone_src = null;

        ['#moving_stone', '#pushed_stone'].forEach((selector) => {
            var element = $(selector);
            if (!element) {
                return;
            }
            cancelElementAnimations(element);
            setVisible(element, false);
        });

        var animations = [];
        var sweptIndexes = [];
        var boardBottom = this.y_offset + this.goban_height;
        var pileBaseX = this.x_offset + this.goban_width*0.18;
        var pileBaseY = boardBottom + this.goban_height*0.12;
        var stoneDiameter = this.goban_width/20;

        for (var i = 0; i < this.stones_shown.length; ++i) {
            if (this.stones_shown[i] == 0) {
                continue;
            }

            var element = $('#p' + i);
            if (!element) {
                continue;
            }

            cancelElementAnimations(element);
            var x = i % gridsize;
            var y = (i - x)/gridsize;
            var progress = ((gridsize - 1 - x) + y)/(2*(gridsize - 1));
            var startLeft = parseFloat(element.style.left) || 0;
            var startTop = parseFloat(element.style.top) || 0;
            var crowding = Math.sin(progress*Math.PI);
            var midLeft = startLeft - this.goban_width*(0.12 + 0.18*progress) + stoneDiameter*(Math.random() - 0.5)*1.2;
            var midTop = startTop + this.goban_height*(0.14 + 0.28*progress) + stoneDiameter*crowding;
            var finalLeft = pileBaseX + this.goban_width*(Math.random()*0.18 - 0.04) + stoneDiameter*(Math.random() - 0.5);
            var finalTop = pileBaseY + this.goban_height*(0.1*Math.random()) + stoneDiameter*(Math.random()*2.6);
            var delay = 0.12 + progress*1.25 + Math.random()*0.12;
            var duration = 1.15 + progress*0.55 + Math.random()*0.22;

            element.style.zIndex = String(12 + Math.round(progress*80));
            setVisible(element.querySelector('.stone-shadow'), true);
            setVisible(element.querySelector('img'), true);

            var animation = element.animate([
                {
                    left: `${startLeft}px`,
                    top: `${startTop}px`,
                    transform: 'translate(0, 0) rotate(0deg) scale(1)',
                    opacity: 1
                },
                {
                    left: `${midLeft}px`,
                    top: `${midTop}px`,
                    transform: `translate(${stoneDiameter*(Math.random() - 0.5)}px, ${stoneDiameter*0.2}px) rotate(${(Math.random() - 0.5)*50}deg) scale(0.98)`,
                    opacity: 0.96
                },
                {
                    left: `${finalLeft}px`,
                    top: `${finalTop}px`,
                    transform: `translate(${stoneDiameter*(Math.random() - 0.5)}px, ${stoneDiameter*0.3}px) rotate(${(Math.random() - 0.5)*100}deg) scale(0.93)`,
                    opacity: 0.22
                }
            ], {
                duration: duration*1000,
                delay: delay*1000,
                easing: 'cubic-bezier(.28,.76,.28,1)',
                fill: 'forwards'
            });

            animations.push(new Promise((resolve) => {
                animation.addEventListener('finish', resolve, {once: true});
                animation.addEventListener('cancel', resolve, {once: true});
            }));
            sweptIndexes.push(i);
        }

        Promise.all(animations).then(() => {
            sweptIndexes.forEach((index) => {
                var element = $('#p' + index);
                if (!element) {
                    return;
                }
                cancelElementAnimations(element);
                element.classList.remove('has-stone');
                element.style.removeProperty('z-index');
                element.style.removeProperty('transform');
                element.style.removeProperty('opacity');
                setVisible(element.querySelector('.stone-shadow'), false);
                setVisible(element.querySelector('img'), false);
            });

            this.stones_shown = Array(gridsize*gridsize).fill(0);
            this.reset_offsets();
            for (var i = 0; i < gridsize*gridsize; ++i) {
                this.updateBoardPosition(i, false);
            }
            this.hand_position = (gridsize - 1)*gridsize;

            window.setTimeout(() => {
                this.sweeping_board = false;
                this.transform();
            }, 1000);
        });
    };

    // Draw the underlying board (i.e. everything except any moving stones)
    this.draw = function(width, height) {
        var refreshing = false;
        if (typeof width === 'undefined' || typeof height === 'undefined') {
            refreshing = true;
        }
        if (!refreshing) {
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
        }
        var gobanImage = goban_1200;
        gobanImage.id = 'goban-image';
        var goban = $('#goban');
        goban.replaceChildren(gobanImage);
        var gobanImg = goban.querySelector('img');
        setStyles(gobanImg, {width: this.goban_width, height: this.goban_height});
        var padding = ((height - this.goban_height) / 2) | 0;
        setStyles(gobanImg, {marginTop: padding, marginBottom: padding});
        var s = this.goban_height / 50 | 0;
        gobanImg.style.boxShadow = `${s}px ${2*s}px ${2*s}px 0px rgba(0,0,0,0.6)`;


        // Set up a div for every stone position
        for (var i = 0; i < gridsize*gridsize; ++i) {
            var coords = this.get_coords(i);
            var p = this.stonePosition(coords[0], coords[1], 0);
            var stone = document.createElement('div');
            stone.className = 'board_pos';
            stone.id = 'p' + i;
            setStyles(stone, {
                position: 'absolute',
                left: p[0],
                top: p[1],
                width: p[2],
                height: p[3]
            });
            var stoneShadow = document.createElement('div');
            stoneShadow.className = 'stone-shadow';
            stone.append(stoneShadow);
            setVisible(stoneShadow, false);
            var stoneImage = document.createElement('img');
            stoneImage.className = 'stone';
            stoneImage.alt = '';
            stone.append(stoneImage);
            goban.append(stone);
        }
        // And a single div for the moving stone
        var movingStone = document.createElement('div');
        movingStone.id = 'moving_stone';
        movingStone.style.position = 'absolute';
        var movingStoneShadow = document.createElement('div');
        movingStoneShadow.className = 'stone-shadow';
        movingStone.append(movingStoneShadow);
        setVisible(movingStoneShadow, false);
        var movingStoneImage = document.createElement('img');
        movingStoneImage.className = 'stone';
        movingStoneImage.alt = '';
        movingStone.append(movingStoneImage);
        goban.append(movingStone);
        setVisible(movingStoneImage, false);

        var pushedStone = document.createElement('div');
        pushedStone.id = 'pushed_stone';
        pushedStone.style.position = 'absolute';
        var pushedStoneShadow = document.createElement('div');
        pushedStoneShadow.className = 'stone-shadow';
        pushedStone.append(pushedStoneShadow);
        setVisible(pushedStoneShadow, false);
        var pushedStoneImage = document.createElement('img');
        pushedStoneImage.className = 'stone';
        pushedStoneImage.alt = '';
        pushedStone.append(pushedStoneImage);
        goban.append(pushedStone);
        setVisible(pushedStone, false);

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
    };

    this.drawNumber = function(number, x_offset, y_offset, size, colour) {
        var num;
        if (size == 1) num = tiny_num[number];
        if (size == 2) num = small_num[number];
        if (size == 3) num = big_num[number];
        for (var i = 0; i < num.length; ++i) {
            this.addStone(num[i][0] + x_offset, num[i][1] + y_offset, colour);
        }
    };
    this.addStone = function(x, y, colour){
        this.stones[y*gridsize + x] = colour;
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

    // Update the desired state of the clock
    this.update = function(seconds, minutes, hours, days) {
        var now = new Date();

        hours = typeof hours !== 'undefined' ? hours : now.getHours();
        minutes = typeof minutes !== 'undefined' ? minutes : now.getMinutes();
        seconds = typeof seconds !== 'undefined' ? seconds : now.getSeconds();
        days = typeof days !== 'undefined' ? days : 0;

        if (!this.twenty_four_hour) {
            hours %= 12;
            if (hours == 0) {
                hours = 12;
            }
        }

        var views = 4;
        this.view %= views;
        this.clear();
        if (this.view == 0) {
            var hour_stones = [[9, 1], [13, 2], [16, 5], [17, 9], [16, 13], [13, 16], [9, 17], [5, 16], [2, 13], [1, 9], [2, 5], [5, 2]];
            for (var i = 0; i < hour_stones.length; ++i) {
                this.addStone(hour_stones[i][0], hour_stones[i][1], black);
            }
            var min_pos = 60*minutes + seconds;
            var theta = 2*Math.PI*min_pos / 3600;
            var R = 7.0;
            var endX = Math.round(9 + R*Math.sin(theta));
            var endY = Math.round(9 - R*Math.cos(theta));
            var hand_stones = line(9, endX, 9, endY);
            for (var i = 0; i < hand_stones.length; ++i) {
                this.addStone(hand_stones[i][0], hand_stones[i][1], white);
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
                this.addStone(hand_stones[i][0], hand_stones[i][1], black);
            }
        }
        else if (this.view == 1) {
            hour_stones = [[9, 1], [13, 2], [16, 5], [17, 9], [16, 13], [13, 16], [9, 17], [5, 16], [2, 13], [1, 9], [2, 5], [5, 2]];
            for (var i = 0; i < hour_stones.length; ++i) {
                this.addStone(hour_stones[i][0], hour_stones[i][1], hours%12 == i ? white : black);
            }
            this.drawNumber((minutes - minutes%10)/10, 6, 4, 1, black);
            this.drawNumber(minutes%10, 10, 4, 1, black);
            this.drawNumber((seconds - seconds%10)/10, 6, 10, 1, white);
            this.drawNumber(seconds%10, 10, 10, 1, white);
        }
        else if (this.view == 2) {
            var tensOfHours = (hours - hours%10)/10;
            hours %= 10;
            if (tensOfHours != 0 || this.twenty_four_hour) {

                this.drawNumber(tensOfHours, (tensOfHours == 1) ? 3 : 3, 1, 3, black);
                this.drawNumber(hours, (hours == 1) ? 9 : 10, 1, 3, black);
            } else {
                this.drawNumber(hours, (hours == 1) ? 6 : 7, 1, 3, black);
            }
            this.drawNumber((minutes - minutes%10)/10, 4, 11, 2, white);
            this.drawNumber(minutes%10, 10, 11, 2, white);
        }
        else if (this.view == 3) {
            var tensOfHours = (hours - hours%10)/10;
            if (tensOfHours != 0) {
                this.drawNumber((hours - hours%10)/10, 1, 1, 1, black);
            }
            this.drawNumber(hours%10, 5, 1, 1, black);
            this.addStone(9, 2, black);
            this.addStone(9, 4, black);
            this.drawNumber((minutes - minutes%10)/10, 11, 1, 1, black);
            this.drawNumber(minutes%10, 15, 1, 1, black);

            var second_stones = [[9, 6], [12, 7], [14, 9], [15, 12], [14, 15], [12, 17], [9, 18], [6, 17], [4, 15], [3, 12], [4, 9], [6, 7]];
            for (var i=0; i < second_stones.length; ++i) {
                this.addStone(second_stones[i][0], second_stones[i][1], i == Math.floor(seconds/5) ? black : white);
            }

            var theta = 2*Math.PI*seconds / 60;
            var R = 4;
            var endX = Math.round(9 + R*Math.sin(theta));
            var endY = Math.round(12 - R*Math.cos(theta));
            var hand_stones = line(9, endX, 12, endY);
            for (var i=0; i < hand_stones.length; ++i) {
                this.addStone(hand_stones[i][0], hand_stones[i][1], white);
            }
        }
        else if (this.view == 4) {
            var u = days%10;
            var t = (days - u)/10;
            this.drawNumber((t - t%10)/10, 1, 1, 1, black);
            this.drawNumber(t%10, 5, 1, 1, black);
            this.drawNumber(u, 9, 1, 1, black);
            this.drawNumber((hours - hours%10)/10, 5, 7, 1, white);
            this.drawNumber(hours%10, 9, 7, 1, white);
            this.drawNumber((minutes - minutes%10)/10, 5, 13, 1, black);
            this.drawNumber(minutes%10, 9, 13, 1, black);
        }
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

    // Incrementally change the displayed goban to the desired configuration
    this.transform = function() {
        if (this.moving_stone == true || this.sweeping_board == true) {
            return;
        }
        this.update();
        // Work out what, if anything, needs to change
        var diff = [];
        for (var i = 0; i < this.stones_shown.length; ++i) {
            diff.push(this.stones_shown[i] - this.stones[i]);
        }
        var best_i = -1;
        var best_j = -1;
        // First look for stones on a spot where the opposite colour wants to be
        for (var j = 0; j < diff.length; ++j) {
            if (diff[j] == black - white || diff[j] == white - black) {
                var wanted = (diff[j] == black - white) ? -black : -white;
                for (var i = 0; i < diff.length; ++i) {
                    if (diff[i] == wanted) {
                        if (best_j == -1 || dist(this.hand_position, j) + dist(j, i) < dist(this.hand_position, best_j) + dist(best_j, best_i)) {
                            best_i = i;
                            best_j = j;
                        }
                    }
                }
            }
        }
        for (var i = 0; i < diff.length; ++i) {
            if (diff[i] == -white || diff[i] == -black) {
                // we want a white or black stone here - search for the nearest excess white or black
                for (var j = 0; j < diff.length; ++j) {
                    if (diff[j] == -diff[i]) {
                        if (best_j == -1 ||
                               dist(this.hand_position, j) + dist(j, i) < dist(this.hand_position, best_j) + dist(best_j, best_i)) {
                            // Shortest distance from hand to stone start to stone end
                            best_j = j;
                            best_i = i;
                        }
                    }
                }
            }
        }
        if (best_j != -1) {
            // Move stone from best_j to best_i
            this.moving_stone = true;
            this.stone_from = this.get_coords(best_j);
            this.hand_position = best_i;
            this.stone_colour = this.stones_shown[best_j];
            this.stones_shown[best_j] = 0;
            this.setLandingOffset(best_i);
            this.stone_to = this.get_coords(best_i);
            // Should we lift the stone or drag it?
            // See if there are any other stones on the route.
            var points = line(Math.round(this.stone_from[0]), Math.round(this.stone_to[0]),
                              Math.round(this.stone_from[1]), Math.round(this.stone_to[1]));
            var num_points = points.length;
            for (var i=0; i < num_points - 1; ++i) {
                if (points[i][0] != points[i+1][0] && points[i][1] != points[i+1][1]) {
                    // Both x and y have changed, so add in the corner points
                    points.push([points[i][0], points[i+1][1]]);
                    points.push([points[i+1][0], points[i][1]]);
                }
            }
            this.clear_route = true;
            // For long distances always pick up the stone
            if (dist(best_i, best_j) > 5) {
                this.clear_route = false;
            }
            for (var i=0; i < points.length; ++i) {
                if (this.stones_shown[points[i][0] + gridsize*points[i][1]] != 0) {
                    this.clear_route = false;
                    break;
                }
            }
        } else {
            var best_swap = null;
            for (var j = 0; j < diff.length; ++j) {
                if (!isWrongColourPair(diff[j])) {
                    continue;
                }
                for (var i = 0; i < diff.length; ++i) {
                    if (diff[i] != -diff[j]) {
                        continue;
                    }
                    var score = dist(this.hand_position, j) + dist(j, i) + dist(i, j);
                    if (!best_swap || score < best_swap.score) {
                        best_swap = {
                            source: j,
                            target: i,
                            score: score
                        };
                    }
                }
            }

            if (best_swap) {
                var source_coords = this.get_coords(best_swap.source);
                var target_coords = this.get_coords(best_swap.target);
                this.moving_stone = true;
                this.stone_from = source_coords;
                this.stone_to = target_coords;
                this.hand_position = best_swap.target;
                this.stone_colour = this.stones_shown[best_swap.source];
                this.pending_swap = {
                    phase: 'push',
                    source: best_swap.source,
                    target: best_swap.target,
                    source_coords: source_coords,
                    target_coords: target_coords,
                    displaced_coords: displacedCoords(source_coords, target_coords),
                    displaced_colour: this.stones_shown[best_swap.target],
                    displaced_src: this.getDrawnStoneSrc(target_coords)
                };
                this.stones_shown[best_swap.source] = 0;
                this.clear_route = true;
            }
        }
        if (best_j == -1 && !this.moving_stone) {
            // No more moving will help. Find stone to remove.
            // Prefer removing stones which are where the opposite colour wants to be
            var to_remove_first = [];
            var to_remove_next = [];
            var to_add = [];
            var best_i = -1;
            for (var i = 0; i < diff.length; ++i) {
                if (diff[i] != 0) {
                    if (best_i == -1 || dist(this.hand_position, i) < dist(this.hand_position, best_i)) {
                        best_i = i;
                    }
                }
            }
            if (best_i != -1) {
                if (diff[best_i] != -white && diff[best_i] != -black) {
                    // Remove a stone
                    this.moving_stone = true;
                    this.stone_from = this.get_coords(best_i);
                    this.stone_colour = this.stones_shown[best_i];
                    this.stone_to = [go_bowl, go_bowl];
                    this.hand_position = best_i;
                    this.stones_shown[best_i] = 0;
                } else {
                    // Add a stone
                    this.moving_stone = true;
                    this.stone_colour = -diff[best_i];
                    this.stone_from = [go_bowl, go_bowl];
                    this.setLandingOffset(best_i);
                    this.stone_to = this.get_coords(best_i);
                    this.hand_position = best_i;
                }
            }
        }
        if (!this.moving_stone && diff.every((value) => value == 0)) {
            this.alignIdleStone();
        }
        if (this.moving_stone == true) {
            this.move_stone();
        } else {
            // Set up next call to transform
            setTimeout(this.transform.bind(this), 500);
        }
    }
}

// find integer points that form the line from x0, y0 to x1, y1
function line(x0, x1, y0, y1) {
    var deltax = x1 - x0;
    var deltay = y1 - y0;
    var error = 0.0;
    var points = [];
    if (deltax == 0 && deltay == 0) {
        return [[x0, y0]];
    }
    if (Math.abs(deltax) >= Math.abs(deltay)) {
        if (x1 < x0) {
            var tmp = x1;
            x1 = x0;
            x0 = tmp;
            tmp = y1;
            y1 = y0;
            y0 = tmp;
        }
        var ydir = (y0 < y1) ? 1 : -1;
        var deltaerr = Math.abs(deltay / deltax);
        var y = y0;
        for (var x = x0; x <= x1; ++x) {
            points.push([x, y]);
            error += deltaerr;
            if (error >= 0.5) {
                y += ydir;
                error -= 1.0;
            }
        }
    }
    if (Math.abs(deltay) > Math.abs(deltax)) {
        if (y1 < y0) {
            var tmp = y1;
            y1 = y0;
            y0 = tmp;
            tmp = x1;
            x1 = x0;
            x0 = tmp;
        }
        var xdir = (x0 < x1) ? 1 : -1;
        var deltaerr = Math.abs(deltax / deltay);
        var x = x0;
        for (var y = y0; y <= y1; ++y) {
            points.push([x, y]);
            error += deltaerr;
            if (error >= 0.5) {
                x += xdir;
                error -= 1.0;
            }
        }
    }
    return points;
}

// The distance between points on the board with given indices
function dist(i, j) {
    var xi = i % gridsize;
    var yi = (i - xi)/gridsize;
    var xj = j % gridsize;
    var yj = (j - xj)/gridsize;
    return Math.sqrt((xi - xj)*(xi - xj) + (yi - yj)*(yi - yj));
}
