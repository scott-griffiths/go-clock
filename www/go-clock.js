/**
 * Created by scott on 15/05/2014.
 */

const gridsize = 19;

const go_bowl = 999;
// A stone lying on the table beside the board, where a finger left it.
const go_table = 998;

// These give the relative positions of the sides of the goban grid as a proportion of the goban image
const minx = 0.026;
const maxx = 0.974;
const miny = 0.03;
const maxy = 0.972;

const ext = "images/";

// The stones are 160px, for a board on a retina screen where one is drawn
// at up to 50 CSS pixels; resources/ has them at full size. The size is in
// the name because the service worker caches images by name for good.
const primaryWhiteStoneSrc = ext + "white_stone0_160.png";
const alternateWhiteStoneSrcs = [
    ext + "white_stone1_160.png",
    ext + "white_stone2_160.png",
    ext + "white_stone3_160.png"
];
const blackStoneSrc = ext + "black_stone1_160.png";

// The board image, and the stone images fetched ahead of their first use.
// Only in a browser: the faces (update) and the hand's arithmetic run
// under node for the tests, where there is no Image.
var goban_1200 = null;
if (typeof Image !== 'undefined') {
    [primaryWhiteStoneSrc, ...alternateWhiteStoneSrcs, blackStoneSrc].forEach((src) => {
        const image = new Image();
        image.src = src;
    });
    goban_1200 = new Image();
    goban_1200.src = ext + "goban_1200.jpg";
}

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
    return blackStoneSrc;
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
    // How long the fall into the void takes, in seconds.
    var voidFadeTime = 0.45;
    // The table is a little further from the eye than the board, so a stone
    // lying on it is drawn a little smaller: the transform for one that has
    // dropped this far (0 to 1) off the edge.
    var tableStoneScale = 0.92;
    var tableTransform = (drop = 1) => `scale(${1 - (1 - tableStoneScale)*Math.max(0, Math.min(1, drop))})`;
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

    // Sweep the board: tip it, far edge up, and let the stones slide off the
    // near edge onto the table, where they skid to a stop. A small simulation
    // rather than keyframes, so that stones that let go first can knock the
    // others loose on their way down, and the heap is whatever they make of
    // it. The view is from above: gravity is into the screen, so only the
    // tipped board pulls the stones anywhere; the table is flat.
    this.resetBoard = function() {
        if (this.sweeping_board || this.finger || typeof document === 'undefined') {
            return;
        }

        // Whatever the hand holds drops where it is and is swept with the rest.
        var held = this.dropHeldStones();
        this.sweeping_board = true;

        var goban = $('#goban');
        var boardTop = this.y_offset;
        var boardBottom = this.y_offset + this.goban_height;
        var boardLeft = this.x_offset;
        var boardRight = this.x_offset + this.goban_width;
        var diameter = this.goban_width/20;
        // Down the slope, in px/s²: a stone crosses the board in a second or so.
        var gravity = this.goban_height*1.6;
        // The table. A phone in portrait has room for the stones below the
        // board; a wide screen may not, in which case they skid out of sight.
        // The screen: a stone that leaves it is gone.
        var screenRight = goban.clientWidth || window.innerWidth;
        var screenBottom = goban.clientHeight || window.innerHeight;
        // The drop from the board's edge to the table, in the air.
        var dropTime = 0.12;
        // The tip leans a little towards the middle of the near edge as well,
        // so the stones gather as they slide and land in one heap.
        var boardMiddle = (boardLeft + boardRight)/2;
        var gather = gravity*0.4/(this.goban_width/2);
        var stones = [];

        for (var i = 0; i < this.stones_shown.length; ++i) {
            if (this.stones_shown[i] == 0) {
                continue;
            }
            var element = $('#p' + i);
            if (!element) {
                continue;
            }
            cancelElementAnimations(element);
            var left = parseFloat(element.style.left) || 0;
            var top = parseFloat(element.style.top) || 0;
            var size = parseFloat(element.style.width) || diameter;
            stones.push({
                index: i,
                element: element,
                colour: this.stones_shown[i],
                src: element.querySelector('img').src,
                startLeft: left,
                startTop: top,
                x: left + size/2,
                y: top + size/2,
                r: size/2,
                vx: 0,
                vy: 0,
                // The tip takes most of a second; a stone loses its grip some
                // time after that, each a little differently.
                release: 0.55 + Math.random()*0.7,
                moving: false,
                offBoard: false,
                leftAt: 0,
                landed: false,
                gone: false
            });
            // Lower stones pass in front of higher ones on the way down.
            element.style.zIndex = String(12 + Math.round((top - boardTop)/this.goban_height*80));
            setVisible(element.querySelector('.stone-shadow'), true);
            setVisible(element.querySelector('img'), true);
        }

        // The stones already on the table are in the way of the
        // ones coming down; they lie still until struck.
        this.table_stones.forEach((entry) => {
            stones.push({
                index: -1,
                element: entry.element,
                colour: entry.colour,
                src: entry.src,
                startLeft: entry.x - diameter/2,
                startTop: entry.y - diameter/2,
                x: entry.x,
                y: entry.y,
                r: diameter/2,
                vx: 0,
                vy: 0,
                release: Infinity,
                moving: false,
                offBoard: true,
                leftAt: 0,
                landed: true,
                gone: false
            });
        });
        this.table_stones = [];

        // The stones the hand dropped lie on the board, loose, and slide
        // off with the others; they end up on the table like them.
        held.forEach((stone) => {
            stone.element.style.zIndex = String(12 + Math.round((stone.y - stone.r - boardTop)/this.goban_height*80));
            stones.push({
                index: -1,
                element: stone.element,
                colour: stone.colour,
                src: stone.src,
                startLeft: stone.x - stone.r,
                startTop: stone.y - stone.r,
                x: stone.x,
                y: stone.y,
                r: stone.r,
                vx: 0,
                vy: 0,
                release: 0.55 + Math.random()*0.7,
                moving: false,
                offBoard: false,
                leftAt: 0,
                landed: false,
                gone: false
            });
        });

        goban.classList.add('tipped');

        var clear = () => {
            stones.forEach((stone) => {
                if (stone.index < 0) {
                    return;
                }
                var element = stone.element;
                cancelElementAnimations(element);
                element.classList.remove('has-stone');
                element.style.removeProperty('z-index');
                element.style.removeProperty('transform');
                element.style.removeProperty('opacity');
                setStoneShadow(element, 0);
                setVisible(element.querySelector('.stone-shadow'), false);
                setVisible(element.querySelector('img'), false);
            });

            this.stones_shown = Array(gridsize*gridsize).fill(0);
            this.reset_offsets();
            for (var i = 0; i < gridsize*gridsize; ++i) {
                this.updateBoardPosition(i, false);
            }
            // The hand is at the heap, below the middle of the near edge.
            this.hand_position = (gridsize - 1)*gridsize + (gridsize - 1)/2;

            // Let the board settle flat before the stones come back.
            window.setTimeout(() => {
                this.sweeping_board = false;
                this.transform();
            }, 900);
        };

        var finish = () => {
            goban.classList.remove('tipped');
            this.sound?.setRumble(0);
            // The heap stays on the table, in play, and the
            // board is bare.
            stones.forEach((stone) => {
                if (stone.falling && !stone.gone) {
                    // Still on its way into the dark: as good as gone.
                    stone.gone = true;
                    if (stone.index < 0) {
                        stone.element.remove();
                    }
                }
                if (stone.gone) {
                    if (stone.index < 0) {
                        stone.element.remove();
                    }
                    return;
                }
                var element = stone.element;
                if (stone.index < 0) {
                    setStyles(element, {left: stone.x - stone.r, top: stone.y - stone.r});
                } else {
                    element = this.looseStone(stone.src, stone.colour, stone.x, stone.y).element;
                }
                element.style.transform = tableTransform();
                setStoneShadow(element.querySelector('.stone-shadow'), 0);
                this.table_stones.push({
                    element: element,
                    colour: stone.colour,
                    src: stone.src,
                    x: stone.x,
                    y: stone.y,
                    coords: this.boardCoords(stone.x, stone.y)
                });
            });
            clear();
        };

        var last = null;
        var elapsed = 0;
        var stillFor = 0;
        // The physics, dt seconds of it: the stones let go and slide,
        // and knock each other about.
        var advance = (dt) => {
            elapsed += dt;
            stones.forEach((stone) => {
                if (stone.gone) {
                    return;
                }
                if (!stone.moving && elapsed >= stone.release) {
                    stone.moving = true;
                    stone.vx = (Math.random() - 0.5)*diameter*0.8;
                }
                if (!stone.moving) {
                    return;
                }
                if (!stone.offBoard && stone.y > boardBottom) {
                    // Over the edge, and off the slope.
                    stone.offBoard = true;
                    stone.leftAt = elapsed;
                    stone.falling = this.table_void;
                }
                if (stone.falling) {
                    // Away into the dark: nothing slows it, nothing to land on.
                } else if (!stone.offBoard) {
                    // Sliding down the tipped board.
                    stone.vy += gravity*dt;
                    stone.vx += (boardMiddle - stone.x)*gather*dt;
                    stone.vx *= 1 - 0.8*dt;
                } else if (elapsed - stone.leftAt > dropTime) {
                    if (!stone.landed) {
                        // Landing takes the edge off its speed.
                        stone.landed = true;
                        this.sound?.land(Math.hypot(stone.vx, stone.vy)/(this.goban_height*1.8));
                        stone.vx *= 0.5;
                        stone.vy *= 0.5;
                    }
                    // Skidding on the flat table: nothing pulls, friction slows.
                    var speed = Math.hypot(stone.vx, stone.vy);
                    if (speed > 0) {
                        var slower = Math.max(0, speed - (speed*6 + diameter*20)*this.table_grip*dt);
                        stone.vx *= slower/speed;
                        stone.vy *= slower/speed;
                    }
                }
                stone.x += stone.vx*dt;
                stone.y += stone.vy*dt;
                if (!stone.offBoard) {
                    // The board's sides keep them on.
                    if (stone.x - stone.r < boardLeft) {
                        stone.x = boardLeft + stone.r;
                        stone.vx = Math.abs(stone.vx)*0.4;
                    } else if (stone.x + stone.r > boardRight) {
                        stone.x = boardRight - stone.r;
                        stone.vx = -Math.abs(stone.vx)*0.4;
                    }
                } else {
                    // The board stands proud of the table.
                    this.keepOffBoard(stone);
                }
            });

            // Stones in each other's way: push apart, and bounce a little. A
            // stone that is struck loses its grip too.
            for (var a = 0; a < stones.length; ++a) {
                var p = stones[a];
                if (p.gone) {
                    continue;
                }
                for (var b = a + 1; b < stones.length; ++b) {
                    var q = stones[b];
                    if (q.gone || (!p.moving && !q.moving) || p.falling || q.falling) {
                        continue;
                    }
                    var dx = q.x - p.x;
                    var dy = q.y - p.y;
                    var distance = Math.hypot(dx, dy);
                    var reach = p.r + q.r;
                    if (distance === 0 || distance >= reach) {
                        continue;
                    }
                    var nx = dx/distance;
                    var ny = dy/distance;
                    var overlap = reach - distance;
                    p.x -= nx*overlap/2;
                    p.y -= ny*overlap/2;
                    q.x += nx*overlap/2;
                    q.y += ny*overlap/2;
                    var closing = (q.vx - p.vx)*nx + (q.vy - p.vy)*ny;
                    if (closing < 0) {
                        this.sound?.knock(-closing/(this.goban_height*1.2));
                        // Stones bounce off each other on the board, less so on the table.
                        var bounce = p.offBoard && q.offBoard ? 0.25 : 0.45;
                        var impulse = -(1 + bounce)*closing/2;
                        p.vx -= impulse*nx;
                        p.vy -= impulse*ny;
                        q.vx += impulse*nx;
                        q.vy += impulse*ny;
                        p.moving = true;
                        q.moving = true;
                    }
                }
            }
        };

        var step = (now) => {
            if (last === null) {
                last = now;
            }
            // However long the frame was (a throttled tab, a slow device),
            // the physics catches up with the clock, in steps short enough
            // to stay stable: a low frame rate makes the sweep choppy, not
            // slow. A frame longer than a quarter of a second is left behind.
            var frame = Math.min((now - last)/1000, 0.25);
            last = now;
            var steps = Math.max(1, Math.ceil(frame/0.032));
            for (var s = 0; s < steps; ++s) {
                advance(frame/steps);
            }

            var onBoard = 0;
            var moved = 0;
            stones.forEach((stone) => {
                if (stone.gone) {
                    return;
                }
                if (!stone.offBoard) {
                    onBoard += 1;
                }
                moved = Math.max(moved, Math.hypot(stone.x - (stone.lastX ?? stone.x), stone.y - (stone.lastY ?? stone.y)));
                stone.lastX = stone.x;
                stone.lastY = stone.y;
                if (stone.x + stone.r < 0 || stone.x - stone.r > screenRight || stone.y + stone.r < 0 || stone.y - stone.r > screenBottom) {
                    // Skidded off the screen: the table goes on unseen.
                    stone.gone = true;
                    setVisible(stone.element.querySelector('img'), false);
                    setVisible(stone.element.querySelector('.stone-shadow'), false);
                    return;
                }
                var translate = `translate(${stone.x - stone.r - stone.startLeft}px, ${stone.y - stone.r - stone.startTop}px)`;
                if (stone.falling) {
                    if (this.drawFalling(stone, elapsed - stone.leftAt, translate) && stone.index < 0) {
                        stone.element.remove();
                    }
                    return;
                }
                if (stone.offBoard) {
                    // In the air for the drop off the edge, then on the table,
                    // which is that little further away.
                    var drop = (elapsed - stone.leftAt)/dropTime;
                    setStoneShadow(stone.element, drop < 1 ? 8*Math.sin(drop*Math.PI) : 0);
                    translate += ' ' + tableTransform(drop);
                }
                stone.element.style.transform = translate;
            });

            if (this.sound) {
                // The rumble follows how much is sliding on the board.
                var sliding = 0;
                stones.forEach((stone) => {
                    if (stone.moving && !stone.offBoard) {
                        sliding += Math.min(1, Math.hypot(stone.vx, stone.vy)/(this.goban_height*0.8));
                    }
                });
                this.sound.setRumble(Math.min(1, sliding/6)*0.25);
            }

            // Done once every stone is off the board and the heap has kept
            // still (under 30 px/s) for half a second, or, failing that,
            // after a while.
            stillFor = moved < 30*frame ? stillFor + frame : 0;
            var settled = onBoard === 0 && stillFor > 0.5;
            if (!settled && elapsed < 12) {
                window.requestAnimationFrame(step);
            } else {
                finish();
            }
        };

        if (stones.length === 0) {
            finish();
        } else {
            window.requestAnimationFrame(step);
        }
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

    // The board stands proud of the table: a stone on the table stops at
    // its side rather than going back up.
    this.keepOffBoard = function(stone) {
        if (!stone.offBoard || !stone.landed) {
            return;
        }
        var cx = Math.max(this.x_offset, Math.min((this.x_offset + this.goban_width), stone.x));
        var cy = Math.max(this.y_offset, Math.min((this.y_offset + this.goban_height), stone.y));
        var dx = stone.x - cx;
        var dy = stone.y - cy;
        var distance = Math.hypot(dx, dy);
        if (distance >= stone.r) {
            return;
        }
        if (distance === 0) {
            // Its centre is over the board: out by the nearest side.
            var sides = [
                [stone.x - this.x_offset, -1, 0],
                [(this.x_offset + this.goban_width) - stone.x, 1, 0],
                [stone.y - this.y_offset, 0, -1],
                [(this.y_offset + this.goban_height) - stone.y, 0, 1]
            ];
            sides.sort((a, b) => a[0] - b[0]);
            dx = sides[0][1];
            dy = sides[0][2];
            distance = 1;
            cx = dx ? (dx < 0 ? this.x_offset : (this.x_offset + this.goban_width)) : stone.x;
            cy = dy ? (dy < 0 ? this.y_offset : (this.y_offset + this.goban_height)) : stone.y;
        }
        var nx = dx/distance;
        var ny = dy/distance;
        stone.x = cx + nx*stone.r;
        stone.y = cy + ny*stone.r;
        var into = stone.vx*nx + stone.vy*ny;
        if (into < 0) {
            stone.vx -= into*nx*1.3;
            stone.vy -= into*ny*1.3;
        }
    };

    // A stone on its way into the void, `since` seconds after it went over
    // the edge: fading and shrinking as it falls away. Returns true once it
    // has gone, with its image hidden; the element itself is the caller's
    // (a grid point's during a sweep, a loose stone's under the finger).
    // `transform` is any transform the element already needs.
    this.drawFalling = function(stone, since, transform = '') {
        var fall = since/voidFadeTime;
        if (fall >= 1) {
            stone.gone = true;
            setVisible(stone.element.querySelector('img'), false);
            setVisible(stone.element.querySelector('.stone-shadow'), false);
            return true;
        }
        setVisible(stone.element.querySelector('.stone-shadow'), false);
        stone.element.style.opacity = String(1 - fall);
        stone.element.style.transform = `${transform} scale(${1 - 0.4*fall})`.trim();
        return false;
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

    // A stone free of the grid, drawn by an element of its own while the
    // finger is about.
    this.looseStone = function(src, colour, x, y) {
        var diameter = this.goban_width/20;
        var element = document.createElement('div');
        element.className = 'board_pos loose-stone';
        setStyles(element, {
            position: 'absolute',
            left: x - diameter/2,
            top: y - diameter/2,
            width: diameter,
            height: diameter
        });
        var shadow = document.createElement('div');
        shadow.className = 'stone-shadow';
        setStoneShadow(shadow, 0);
        element.append(shadow);
        var image = document.createElement('img');
        image.className = 'stone';
        image.alt = '';
        image.src = src;
        element.append(image);
        $('#goban').append(element);
        return {
            element: element,
            src: src,
            colour: colour,
            x: x,
            y: y,
            r: diameter/2,
            vx: 0,
            vy: 0,
            offBoard: false,
            leftAt: 0,
            landed: false,
            gone: false
        };
    };

    // The nearest point to the coordinates that no other stone has claimed,
    // anywhere on the board: a heap shoved into a corner has more stones
    // than the corner has points, and each still needs one. -1 only when
    // the whole board is taken.
    this.freePointNear = function(coords, taken) {
        var best = -1;
        var bestDistance = Infinity;
        for (var index = 0; index < gridsize*gridsize; ++index) {
            if (taken.has(index)) {
                continue;
            }
            var distance = Math.hypot(coords[0] - index%gridsize, coords[1] - (index - index%gridsize)/gridsize);
            if (distance < bestDistance) {
                best = index;
                bestDistance = distance;
            }
        }
        return best;
    };

    // Where an element's stone is now, mid-animation or not.
    this.elementCentre = function(element) {
        var style = getComputedStyle(element);
        var size = parseFloat(style.width) || this.goban_width/20;
        return [parseFloat(style.left) + size/2, parseFloat(style.top) + size/2];
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
            var at = this.elementCentre(movingStone);
            var colour = swap && swap.phase == 'return' ? swap.displaced_colour : this.stone_colour;
            stones.push(this.looseStone(movingStone.querySelector('img').src, colour, at[0], at[1]));
        }
        if (swap && swap.phase == 'push' && !pushedStone.hidden) {
            var at = this.elementCentre(pushedStone);
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

    this.fingerDown = function(clientX, clientY) {
        if (this.sweeping_board || this.finger || typeof document === 'undefined') {
            return false;
        }
        var goban = $('#goban');
        var rect = goban.getBoundingClientRect();
        var diameter = this.goban_width/20;
        var radius = this.fingerRadius();
        var self = this;
        window.clearTimeout(this.idle_timer);

        // Whatever the hand was doing stops, and the stone it held drops
        // where it is; so does one it was pushing aside.
        var stones = this.dropHeldStones();

        // The stones on the table are in it too.
        this.table_stones.forEach((entry) => {
            var stone = this.looseStone(entry.src, entry.colour, entry.x, entry.y);
            entry.element.remove();
            stone.offBoard = true;
            stone.landed = true;
            stones.push(stone);
        });
        this.table_stones = [];

        // The stones on the board come loose; their points are hidden until
        // the finger has gone. A stone drawn on a point the model has as
        // empty is a stone all the same (it should not happen, but a stuck
        // stone that nothing can move is worse than a spare): its colour is
        // read off its image.
        for (var i = 0; i < this.stones_shown.length; ++i) {
            var element = $('#p' + i);
            var image = element.querySelector('img');
            var colour = this.stones_shown[i];
            if (colour == 0 && !image.hidden && image.src) {
                colour = image.src.includes('black_stone') ? black : white;
            }
            if (colour == 0) {
                continue;
            }
            var at = this.elementCentre(element);
            cancelElementAnimations(element);
            stones.push(this.looseStone(image.src, colour, at[0], at[1]));
            setVisible(element.querySelector('.stone-shadow'), false);
            setVisible(image, false);
        }

        var disc = $('#finger');
        setStyles(disc, {width: radius*2, height: radius*2, left: clientX - rect.left - radius, top: clientY - rect.top - radius});
        setVisible(disc, true);
        cancelElementAnimations(disc);
        disc.animate?.([{opacity: 0, transform: 'scale(0.7)'}, {opacity: 1, transform: 'scale(1)'}], {duration: 160, easing: 'ease-out'});

        var finger = {
            stones: stones,
            left: rect.left,
            top: rect.top,
            x: clientX - rect.left,
            y: clientY - rect.top,
            targetX: clientX - rect.left,
            targetY: clientY - rect.top,
            pressing: true,
            releasedAt: 0,
            elapsed: 0,
            frame: null
        };
        this.finger = finger;

        var boardLeft = this.x_offset;
        var boardTop = this.y_offset;
        var boardRight = this.x_offset + this.goban_width;
        var boardBottom = this.y_offset + this.goban_height;
        // The screen: a stone that leaves it is gone.
        var screenRight = goban.clientWidth || window.innerWidth;
        var screenBottom = goban.clientHeight || window.innerHeight;
        // The drop from the board's edge to the table, in the air.
        var dropTime = 0.12;
        // How stones slow, in px/s²: a share of their speed, plus a constant.
        var boardFriction = (speed) => speed*6.5 + diameter*32;
        var tableFriction = (speed) => (speed*6 + diameter*20)*this.table_grip;

        // Stones in each other's way: push apart, and bounce a little.
        var collide = () => {
            var any = false;
            for (var a = 0; a < stones.length; ++a) {
                var p = stones[a];
                if (p.gone || p.falling) {
                    continue;
                }
                for (var b = a + 1; b < stones.length; ++b) {
                    var q = stones[b];
                    if (q.gone || q.falling) {
                        continue;
                    }
                    var dx = q.x - p.x;
                    var dy = q.y - p.y;
                    var distance = Math.hypot(dx, dy);
                    var reach = p.r + q.r;
                    if (distance === 0 || distance >= reach) {
                        continue;
                    }
                    any = true;
                    var nx = dx/distance;
                    var ny = dy/distance;
                    var overlap = reach - distance;
                    p.x -= nx*overlap/2;
                    p.y -= ny*overlap/2;
                    q.x += nx*overlap/2;
                    q.y += ny*overlap/2;
                    var closing = (q.vx - p.vx)*nx + (q.vy - p.vy)*ny;
                    if (closing < 0) {
                        self.sound?.knock(-closing/(self.goban_height*1.2));
                        var bounce = p.offBoard && q.offBoard ? 0.25 : 0.4;
                        var impulse = -(1 + bounce)*closing/2;
                        p.vx -= impulse*nx;
                        p.vy -= impulse*ny;
                        q.vx += impulse*nx;
                        q.vy += impulse*ny;
                    }
                }
            }
            return any;
        };

        var keepOffBoard = (stone) => this.keepOffBoard(stone);


        // The finger at (px, py), having just moved `travel` px in `sdt`
        // seconds: stones under it are shoved out, and they shove their
        // neighbours. A moving finger clears its path at once; a finger
        // that has just landed eases the stone out from under it.
        var shove = (px, py, sdt, travel) => {
            var give = Math.max(travel*1.5, diameter*0.12);
            // A little faster than the finger, at most; and a pointer that
            // jumps (a mouse, say) is not a finger that flicks.
            var speedCap = Math.min(travel/sdt*1.1 + diameter*3, diameter*40);
            for (var pass = 0; pass < 3; ++pass) {
                var moved = false;
                stones.forEach((stone) => {
                    if (stone.gone || stone.falling) {
                        return;
                    }
                    var dx = stone.x - px;
                    var dy = stone.y - py;
                    var distance = Math.hypot(dx, dy);
                    var reach = radius + stone.r;
                    if (distance >= reach) {
                        return;
                    }
                    if (distance === 0) {
                        dx = 1;
                        dy = 0;
                        distance = 1;
                    }
                    var nx = dx/distance;
                    var ny = dy/distance;
                    var correction = Math.min(reach - distance, give);
                    stone.x += nx*correction;
                    stone.y += ny*correction;
                    // It leaves at least as fast as it was shoved.
                    var wanted = Math.min(correction/sdt, speedCap);
                    var along = stone.vx*nx + stone.vy*ny;
                    if (along < wanted) {
                        stone.vx += (wanted - along)*nx;
                        stone.vy += (wanted - along)*ny;
                    }
                    moved = true;
                });
                var bumped = collide();
                stones.forEach(keepOffBoard);
                if (!moved && !bumped) {
                    break;
                }
            }
        };

        var last = null;
        // The physics, dt seconds of it: the stones skid, slow, and knock
        // each other about, and any over the edge drop to the table.
        var advance = (dt) => {
            finger.elapsed += dt;
            stones.forEach((stone) => {
                if (stone.gone) {
                    return;
                }
                if (!stone.offBoard && (stone.x < boardLeft || stone.x > boardRight || stone.y < boardTop || stone.y > boardBottom)) {
                    // Its centre is over the edge: off it goes, tipping
                    // outward as it falls so it lands clear of the side.
                    stone.offBoard = true;
                    stone.leftAt = finger.elapsed;
                    stone.falling = this.table_void;
                    if (!stone.falling) {
                        this.haptic?.('tick');
                    }
                    var kick = diameter*5;
                    if (stone.x < boardLeft) {
                        stone.vx -= kick;
                    } else if (stone.x > boardRight) {
                        stone.vx += kick;
                    }
                    if (stone.y < boardTop) {
                        stone.vy -= kick;
                    } else if (stone.y > boardBottom) {
                        stone.vy += kick;
                    }
                }
                var speed = Math.hypot(stone.vx, stone.vy);
                var inAir = stone.falling || (stone.offBoard && finger.elapsed - stone.leftAt <= dropTime);
                if (!inAir) {
                    if (stone.offBoard && !stone.landed) {
                        // Landing takes the edge off its speed.
                        stone.landed = true;
                        self.sound?.land(speed/(self.goban_height*1.8));
                        stone.vx *= 0.5;
                        stone.vy *= 0.5;
                        speed *= 0.5;
                    }
                    if (speed > 0) {
                        var friction = stone.offBoard ? tableFriction(speed) : boardFriction(speed);
                        var slower = Math.max(0, speed - friction*dt);
                        if (slower < diameter*0.1) {
                            slower = 0;
                        }
                        stone.vx *= slower/speed;
                        stone.vy *= slower/speed;
                    }
                }
                stone.x += stone.vx*dt;
                stone.y += stone.vy*dt;
                keepOffBoard(stone);
            });
            collide();
            stones.forEach(keepOffBoard);
        };

        var step = (now) => {
            if (this.finger !== finger) {
                return;
            }
            if (last === null) {
                last = now;
            }
            // As in the sweep: the physics keeps up with the clock whatever
            // the frame rate, in steps short enough to stay stable.
            var frame = Math.max(0.001, Math.min((now - last)/1000, 0.25));
            last = now;

            if (finger.pressing) {
                // Towards where the pointer is, in steps small enough that
                // no stone is skipped over.
                var moveX = finger.targetX - finger.x;
                var moveY = finger.targetY - finger.y;
                var travel = Math.hypot(moveX, moveY);
                var substeps = Math.max(1, Math.ceil(travel/(diameter*0.25)));
                for (var s = 1; s <= substeps; ++s) {
                    shove(finger.x + moveX*s/substeps, finger.y + moveY*s/substeps, frame/substeps, travel/substeps);
                }
                finger.x = finger.targetX;
                finger.y = finger.targetY;
                setStyles(disc, {left: finger.x - radius, top: finger.y - radius});
            }

            var steps = Math.max(1, Math.ceil(frame/0.032));
            for (var s = 0; s < steps; ++s) {
                advance(frame/steps);
            }

            var sliding = 0;
            var still = true;
            stones.forEach((stone) => {
                if (stone.gone) {
                    return;
                }
                if (stone.x + stone.r < 0 || stone.x - stone.r > screenRight || stone.y + stone.r < 0 || stone.y - stone.r > screenBottom) {
                    // Off the screen: the table goes on unseen.
                    stone.gone = true;
                    stone.element.remove();
                    return;
                }
                setStyles(stone.element, {left: stone.x - stone.r, top: stone.y - stone.r});
                if (stone.falling) {
                    if (this.drawFalling(stone, finger.elapsed - stone.leftAt)) {
                        stone.element.remove();
                    } else {
                        still = false;
                    }
                    return;
                }
                if (stone.offBoard) {
                    var drop = (finger.elapsed - stone.leftAt)/dropTime;
                    setStoneShadow(stone.element.querySelector('.stone-shadow'), drop < 1 ? 8*Math.sin(drop*Math.PI) : 0);
                    stone.element.style.transform = tableTransform(drop);
                }
                var speed = Math.hypot(stone.vx, stone.vy);
                if (!stone.offBoard) {
                    sliding += Math.min(1, speed/(diameter*10));
                }
                if (speed > 0 || (stone.offBoard && !stone.landed)) {
                    still = false;
                }
            });
            this.sound?.setRumble(Math.min(1, sliding/4)*0.2);

            // Done once the finger has gone and everything lies still (or,
            // failing that, after a while).
            if (finger.pressing || (!still && finger.elapsed - finger.releasedAt < 6)) {
                finger.frame = window.requestAnimationFrame(step);
            } else {
                this.endFinger();
            }
        };
        finger.frame = window.requestAnimationFrame(step);
        return true;
    };

    this.fingerMove = function(clientX, clientY) {
        var finger = this.finger;
        if (!finger || !finger.pressing) {
            return;
        }
        finger.targetX = clientX - finger.left;
        finger.targetY = clientY - finger.top;
    };

    this.fingerUp = function() {
        var finger = this.finger;
        if (!finger || !finger.pressing) {
            return;
        }
        finger.pressing = false;
        finger.releasedAt = finger.elapsed;
        setVisible($('#finger'), false);
    };

    // The finger has gone and the stones lie still: read the board as it
    // is. Each stone stays put and is recorded at its nearest point, with
    // its displacement as its offset; only when two stones share a nearest
    // point does the second take the next free one, with a short slide.
    // Fallen stones stay on the table, in play.
    this.endFinger = function() {
        var finger = this.finger;
        if (!finger) {
            return;
        }
        this.finger = null;
        window.cancelAnimationFrame(finger.frame);
        setVisible($('#finger'), false);
        this.sound?.setRumble(0);

        this.stones_shown = Array(gridsize*gridsize).fill(0);
        this.reset_offsets();
        var taken = new Set();
        // A stone still falling into the void when the finger goes (the hand
        // waits for the fall, but not for ever) is as good as gone.
        finger.stones.forEach((stone) => {
            if (stone.falling && !stone.gone) {
                stone.gone = true;
                stone.element.remove();
            }
        });
        var fallen = finger.stones.filter((stone) => !stone.gone && stone.offBoard);
        var placements = finger.stones
            .filter((stone) => !stone.gone && !stone.offBoard)
            .map((stone) => {
                var coords = this.boardCoords(stone.x, stone.y);
                var slack = Math.hypot(coords[0] - Math.round(coords[0]), coords[1] - Math.round(coords[1]));
                return {stone: stone, coords: coords, slack: slack};
            });
        // The stones nearest their points claim them first.
        placements.sort((a, b) => a.slack - b.slack);
        placements.forEach(({stone, coords}) => {
            var index = this.freePointNear(coords, taken);
            if (index < 0) {
                // Every point on the grid taken (it would take 361 stones):
                // it might as well have fallen.
                stone.offBoard = true;
                fallen.push(stone);
                return;
            }
            taken.add(index);
            var ix = index % gridsize;
            var iy = (index - ix)/gridsize;
            var offset = [
                Math.max(-0.49, Math.min(0.49, coords[0] - ix)),
                Math.max(-0.49, Math.min(0.49, coords[1] - iy))
            ];
            var slides = Math.abs(offset[0] - (coords[0] - ix)) > 0.001 || Math.abs(offset[1] - (coords[1] - iy)) > 0.001;
            this.offsets[index] = offset;
            this.stones_shown[index] = stone.colour;
            var position = $('#p' + index);
            var image = position.querySelector('img');
            var shadow = position.querySelector('.stone-shadow');
            image.style.removeProperty('filter');
            image.src = stone.src;
            setStoneShadow(shadow, 0);
            position.classList.add('has-stone');
            setVisible(shadow, true);
            setVisible(image, true);
            // Where it lies, and then, if its point was taken, the short
            // way to the next one.
            setStyles(position, {left: stone.x - stone.r, top: stone.y - stone.r, width: stone.r*2, height: stone.r*2});
            this.updateBoardPosition(index, slides);
            stone.element.remove();
        });
        for (var i = 0; i < gridsize*gridsize; ++i) {
            if (!taken.has(i)) {
                this.updateBoardPosition(i, false);
            }
        }

        fallen.forEach((stone) => {
            setStoneShadow(stone.element.querySelector('.stone-shadow'), 0);
            stone.element.style.transform = tableTransform();
            this.table_stones.push({
                element: stone.element,
                colour: stone.colour,
                src: stone.src,
                x: stone.x,
                y: stone.y,
                coords: this.boardCoords(stone.x, stone.y)
            });
        });

        this.transform();
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
        var gobanImage = goban_1200;
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

                this.drawNumber(tensOfHours, 3, 1, 3, black);
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

    // Incrementally change the displayed goban to the desired configuration
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
        // A stone on the table is as good as a spare on the board,
        // by the same measure: hand to stone to where it is wanted.
        var best_table = null;
        var best_table_i = -1;
        var best_table_score = Infinity;
        if (this.table_stones.length > 0) {
            var hand = [this.hand_position % gridsize, (this.hand_position - this.hand_position % gridsize)/gridsize];
            for (var i = 0; i < diff.length; ++i) {
                if (diff[i] != -white && diff[i] != -black) {
                    continue;
                }
                var target = [i % gridsize, (i - i % gridsize)/gridsize];
                this.table_stones.forEach((entry) => {
                    if (entry.colour != -diff[i]) {
                        return;
                    }
                    var score = Math.hypot(hand[0] - entry.coords[0], hand[1] - entry.coords[1])
                        + Math.hypot(target[0] - entry.coords[0], target[1] - entry.coords[1]);
                    if (score < best_table_score) {
                        best_table = entry;
                        best_table_i = i;
                        best_table_score = score;
                    }
                });
            }
            if (best_table && best_j != -1 && dist(this.hand_position, best_j) + dist(best_j, best_i) <= best_table_score) {
                best_table = null;
            }
        }
        if (best_table) {
            this.moving_stone = true;
            this.table_stones.splice(this.table_stones.indexOf(best_table), 1);
            this.table_pickup = best_table;
            this.stone_from = [go_table, go_table];
            this.stone_colour = best_table.colour;
            this.hand_position = best_table_i;
            this.setLandingOffset(best_table_i);
            this.stone_to = this.get_coords(best_table_i);
            this.clear_route = false;
        } else if (best_j != -1) {
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
            // Nothing to do: look again just after the next second turns,
            // which is the soonest any face can change.
            this.idle_timer = setTimeout(this.transform.bind(this), 1000 - Date.now() % 1000 + 5);
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
