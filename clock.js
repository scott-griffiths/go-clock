/**
 * Created by scott on 15/05/2014.
 */

var canvas;
var context;

var max_top_padding = 50;
var min_bottom_padding = 0;
var gridsize = 19;

var go_bowl = 999;

var white_stone = new Image();
white_stone.src = "white_stone1.png";

var black_stone = new Image();
black_stone.src = "black_stone1.png";

var goban_1200 = new Image();
goban_1200.src = "goban_1200.jpg";

var goban_400 = new Image();
goban_400.src = "goban_400.jpg";

var goban_200 = new Image();
goban_200.src = "goban_200.jpg";

var tatami = new Image();
tatami.src = "tatami copy.jpg";

var white = 1;
var black = 3;

// Small numbers, 5x7
var s0 = [[3, 0], [2, 0], [1, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 6], [3, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1]];
var s1 = [[1, 1], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [1, 6], [3, 6]];
var s2 = [[0, 1], [1, 0], [2, 0], [3, 0], [4, 1], [4, 2], [3, 3], [2, 3], [1, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6]];
var s3 = [[0, 1], [1, 0], [2, 0], [3, 0], [4, 1], [4, 2], [3, 3], [2, 3], [4, 4], [4, 5], [3, 6], [2, 6], [1, 6], [0, 5]];
var s4 = [[4, 3], [3, 3], [2, 3], [1, 3], [0, 3], [1, 2], [2, 1], [3, 0], [3, 1], [3, 2], [3, 4], [3, 5], [3, 6]];
var s5 = [[4, 0], [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 3], [4, 4], [4, 5], [3, 6], [2, 6], [1, 6], [0, 5]];
var s6 = [[3, 0], [2, 0], [1, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 6], [3, 6], [4, 5], [4, 4], [3, 3], [2, 3], [1, 3]];
var s7 = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [3, 2], [2, 3], [1, 4], [1, 5], [1, 6]];
var s8 = [[3, 0], [2, 0], [1, 0], [0, 1], [0, 2], [1, 3], [2, 3], [3, 3], [4, 4], [4, 5], [3, 6], [2, 6], [1, 6], [0, 5], [0, 4], [4, 2], [4, 1]];
var s9 = [[3, 3], [2, 3], [1, 3], [0, 2], [0, 1], [1, 0], [2, 0], [3, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [3, 6], [2, 6], [1, 6]];
var small_num = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9];

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


// Prevent scrolling in iOS
//document.ontouchstart = function(e){
//    e.preventDefault();
//}


function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

function Goban(){
    this.stones = []; // The current (desired) state
    this.stones_shown = []; // The stones last drawn
    this.stone_queue = []; // Prioritise putting these stones on the board, in this order.
    this.moving_stone = false;
    this.stone_from = [0, 0]; // Board coordinates
    this.stone_to = [0, 0]; // Board coordinates
    this.stone_percent = 0; // Percentage stone is between the from and to
    this.stone_colour = white;
    this.stone_pos = [0, 0, 0, 0]; // Pixel position of last drawn moving stone: x, y, w, h

    this.view = 0;

    // Pixel information for goban position
    this.x_offset;
    this.y_offset;
    this.goban_width;
    this.goban_height;

    this.bufferCanvas = document.createElement('canvas');
    this.bufferContext = this.bufferCanvas.getContext('2d');

    this.emptyBoardCanvas = document.createElement('canvas');
    this.emptyBoardContext = this.emptyBoardCanvas.getContext('2d');

    this.clear = function() {
        this.stones = [];
        for (var i = 0; i < gridsize*gridsize; ++i){
            this.stones.push(0); // empty space
        }
    };

    this.clear();
    for (var i = 0; i < gridsize*gridsize; ++i){
        this.stones_shown.push(0); // empty space
    }

    this.resize = function(width, height) {
        this.goban_width = width * 0.95; // Some padding to show background
        this.goban_height = height * 0.95;
        var goban_ratio = 857/800; // Ratio of the goban image

        if (this.goban_width*goban_ratio > this.goban_height) {
            // clip to height
            this.goban_width = this.goban_height/goban_ratio | 0;
        } else {
            this.goban_height = this.goban_width*goban_ratio | 0;
        }
        this.y_offset = (height - this.goban_height) / 2 | 0;
        if (this.y_offset > max_top_padding) {
            this.y_offset = max_top_padding;
        }
        this.x_offset = (width - this.goban_width) / 2 | 0;
        canvas.width = this.bufferCanvas.width = this.emptyBoardCanvas.width = width;
        canvas.height = this.bufferCanvas.height = this.emptyBoardCanvas.height = height;
        this.drawBuffer();
        this.draw();
    };

    this.drawNumber = function(number, x_offset, y_offset, small, colour) {
        var num = small ? tiny_num[number] : small_num[number];
        for (var i = 0; i < num.length; ++i) {
            this.addStone(num[i][0] + x_offset, num[i][1] + y_offset, colour);
        }
    };
    this.addStone = function(x, y, colour){
        this.stones[y*gridsize + x] = colour;
    };
    this.addStoneToQueue = function(x, y, colour) {
        this.stone_queue.push([x, y, colour]);
    };
    // Draw the underlying board (i.e. everything except any moving stones)
    this.drawBuffer = function(){
        this.bufferContext.shadowColor = "rgba( 0, 0, 0, 0.6)";
        this.bufferContext.shadowOffsetX = this.goban_width/80;
        this.bufferContext.shadowOffsetY = this.goban_width/30;
        this.bufferContext.shadowBlur = this.goban_width/50;
        var gobanImage = goban_1200;
        if (this.goban_width <= 400) {
            gobanImage = goban_400;
        }
        if (this.goban_width <= 200) {
            gobanImage = goban_200;
        }
        this.bufferContext.drawImage(tatami, 0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
        this.bufferContext.drawImage(gobanImage, this.x_offset, this.y_offset, this.goban_width, this.goban_height);
        this.emptyBoardContext.drawImage(this.bufferCanvas, 0, 0);

        this.bufferContext.shadowColor = "rgba( 0, 0, 0, 0.0)";
        for (var i = 0; i < gridsize; ++i){
            for (var j = 0; j < gridsize; ++j){
                var p = this.stones_shown[i*gridsize + j];
                if (p != 0) {
                    this.drawStone(this.bufferContext, [j, i], p, 0);
                }
            }
        }
    };

    this.draw = function() {
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        context.shadowBlur = 0;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(this.bufferCanvas, 0, 0);
    };

    this.drawStone = function(ctx, coords, colour, height) {
        if (coords[0] < 0 || coords[0] > gridsize - 1 || coords[1] < 0 || coords[1] > gridsize - 1) {
            return;
        }
        p = this.stonePosition(coords[0], coords[1], height);
        // TODO: Shadow distance should be proportional to goban size
/*        ctx.shadowOffsetX = height;
        ctx.shadowOffsetY = 3*height;
        ctx.shadowColor = "rgba(0, 0, 0, " + (0.5 - height/20) + ")";
        ctx.shadowBlur = height;*/
        ctx.globalAlpha = height < 3 ? 1 : 1 - (height - 3)/8;
        ctx.drawImage(colour == white ? white_stone : black_stone, p[0], p[1], p[2], p[3]);
        ctx.globalAlpha = 1;
        return p;
    };

    // Remove a stone from the buffered board
    this.eraseStone = function(coords) {
        p = this.stonePosition(coords[0], coords[1], 0);
        this.bufferContext.shadowOffsetX = this.bufferContext.shadowOffsetY = 0;
        this.bufferContext.shadowBlur = 0;
        this.bufferContext.drawImage(this.emptyBoardCanvas, p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);
        context.drawImage(this.bufferCanvas, p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);

    };

    this.update = function() {
        var now = new Date();
        hour = now.getHours();
        minute = now.getMinutes();
        second = now.getSeconds();
        views = 3;
        this.view %= views;
        this.clear();
        if (this.view == 0) {
            hour_stones = [[9, 1], [13, 2], [16, 5], [17, 9], [16, 13], [13, 16], [9, 17], [5, 16], [2, 13], [1, 9], [2, 5], [5, 2]];
            for (var i = 0; i < hour_stones.length; ++i) {
                this.addStone(hour_stones[i][0], hour_stones[i][1], black);
            }
            var min_pos = 60*minute + second;
            var theta = 2*Math.PI*min_pos / 3600;
            var R = 7.0;
            var endX = Math.round(9 + R*Math.sin(theta));
            var endY = Math.round(9 - R*Math.cos(theta));
            var hand_stones = line(9, endX, 9, endY);
            for (var i = 0; i < hand_stones.length; ++i) {
                this.addStone(hand_stones[i][0], hand_stones[i][1], white);
            }

            hour %= 12;
            hour *= 5;
            hour += minute/12;
            var theta = 2*Math.PI*hour / 60;
            var R = 4.5;
            var endX = Math.round(9 + R*Math.sin(theta));
            var endY = Math.round(9 - R*Math.cos(theta));
            var hand_stones = line(9, endX, 9, endY);
            for (var i = 0; i < hand_stones.length; ++i) {
                this.addStone(hand_stones[i][0], hand_stones[i][1], black);
            }
        }
        else if (this.view == 1) {
            this.drawNumber((hour - hour%10)/10, 4, 2, false, black);
            this.drawNumber(hour%10, 10, 2, false, black);

            this.drawNumber((minute - minute%10)/10, 4, 10, false, white);
            this.drawNumber(minute%10, 10, 10, false, white);
        }
        else if (this.view == 2) {
//            hour_stones = [[9, 0], [14, 1], [17, 4], [18, 9], [17, 14], [14, 17], [9, 18], [4, 17], [1, 14], [0, 9], [1, 4], [4, 1]];
            hour_stones = [[9, 1], [13, 2], [16, 5], [17, 9], [16, 13], [13, 16], [9, 17], [5, 16], [2, 13], [1, 9], [2, 5], [5, 2]];
            for (var i = 0; i < hour_stones.length; ++i) {
                this.addStone(hour_stones[i][0], hour_stones[i][1], hour%12 == i ? white : black);
            }

            this.drawNumber((minute - minute%10)/10, 6, 4, true, black);
            this.drawNumber(minute%10, 10, 4, true, black);

            this.drawNumber((second - second%10)/10, 6, 10, true, white);
            this.drawNumber(second%10, 10, 10, true, white);

        }
    };

    // Given board coordinates and a height, return the stone's pixel x, y, w, h
    this.stonePosition = function(x, y, height) {
        if (x < 0 || x > gridsize - 1 || y < 0 || y > gridsize - 1) {
            return;
        }
        // These give the relative positions of the sides of the goban grid as a proportion of the goban image
        var minx = 0.026;
        var maxx = 0.974;
        var miny = 0.03;
        var maxy = 0.972;

        var xpos = minx*this.goban_width + x*(maxx-minx)*this.goban_width/(gridsize - 1);
        var ypos = miny*this.goban_height + y*(maxy-miny)*this.goban_height/(gridsize - 1);
        if (height > 10) {
            height = 10;
        }
        var diameter = (this.goban_width/20) * (1 + height/10) | 0;
        return [xpos - diameter/2 + this.x_offset | 0, ypos - diameter/2 + this.y_offset | 0, diameter, diameter];
    };

    this.transform = function() {
        // Incrementally change the displayed goban to the desired configuration
        if (this.moving_stone == false) {
            // See if there's anything in the queue to do first
            // TODO!
        }
        if (this.moving_stone == true) {
            if (this.stone_percent != 0) {
                // Erase previous moving stone
                context.shadowColor = "rgba(80, 80, 80, 0)";
                var xpos = this.stone_pos[0];
                var ypos = this.stone_pos[1];
                var w = this.stone_pos[2];
                var h = this.stone_pos[3];

                context.drawImage(this.bufferCanvas, xpos, ypos, w, h, xpos, ypos, w, h);
            }

            this.stone_percent += 10;
            if (this.stone_percent >= 100) {
                if (this.stone_to[1] >= 0 && this.stone_to[1] < gridsize && this.stone_to[0] >= 0 && this.stone_to[0] < gridsize) {
                    // add stone to board and draw on buffer and shown context
                    this.stones_shown[this.stone_to[0] + gridsize*this.stone_to[1]] = this.stone_colour;
                    this.drawStone(this.bufferContext, this.stone_to, this.stone_colour, 0);
                    this.drawStone(context, this.stone_to, this.stone_colour, 0);
                }
                else if (this.stone_to[0] == go_bowl) {
                    // stone removed from board
                    this.eraseStone(this.stone_from);
                }
                this.moving_stone = false;
                this.stone_percent = 0;
                return;
            }

            if (this.stone_from[0] == go_bowl) {
                // Stone being added
                this.stone_pos = this.drawStone(context, this.stone_to, this.stone_colour, 10*(1 - this.stone_percent/100));
            }
            else if (this.stone_to[0] == go_bowl) {
                // Stone being removed
                this.stone_pos = this.drawStone(context, this.stone_from, this.stone_colour, 10*this.stone_percent/100);
            }
            else {
                var x = this.stone_from[0] + this.stone_percent*(this.stone_to[0] - this.stone_from[0])/100;
                var y = this.stone_from[1] + this.stone_percent*(this.stone_to[1] - this.stone_from[1])/100;
                this.stone_pos = this.drawStone(context, [x, y], this.stone_colour, 0);
            }
            return;
        }
        var diff = [];
        for (var i = 0; i < this.stones_shown.length; ++i) {
            diff.push(this.stones_shown[i] - this.stones[i]);
        }
        // Randomise where we start looking
        var start = Math.random()*diff.length | 0;

        var best_i = -1;
        var best_j = -1;
        for (var i = 0; i < diff.length; ++i) {
            var p = (i + start) % diff.length;
            if (diff[p] == -white || diff[p] == -black) {
                // we want a white or black stone here - search for the nearest excess white or black
                if (best_i == -1) {
                    best_i = p;
                }
                for (var j = 0; j < diff.length; ++j) {
                    if (diff[j] == -diff[p]) {
                        if (best_j == -1 || dist(j, p) < dist(best_j, best_i)) {
                            best_j = j;
                            best_i = p;
                        }
                    }
                }
            }
        }
        var removed = false;
        if (best_j != -1) {
            // Move stone from best_j to best_i
            this.moving_stone = true;
            this.stone_from = coords(best_j);
            this.stone_to = coords(best_i);
            this.stone_colour = this.stones_shown[best_j];
            this.stones_shown[best_j] = 0;
            removed = true;
        }

        if (removed == false) {
            // No more moving will help. Find stone to remove.
            // Prefer removing stones which are where the opposite colour wants to be
            for (var i = 0; i < diff.length; ++i) {
                var p = (i + start) % diff.length;
                if (diff[p] == black - white || diff[p] == white - black) {
                    this.moving_stone = true;
                    this.stone_from = coords(p);
                    this.stone_colour = this.stones_shown[p];
                    this.stone_to = [go_bowl, go_bowl];
                    this.stones_shown[p] = 0;
                    removed = true;
                    break;
                }
            }
        }
        if (removed == false) {
            // Try removing other ones
            for (var i = 0; i < diff.length; ++i) {
                var p = (i + start) % diff.length;
                if (diff[p] == black || diff[p] == white) {
                    this.moving_stone = true;
                    this.stone_from = coords(p);
                    this.stone_colour = this.stones_shown[p];
                    this.stone_to = [go_bowl, go_bowl];
                    this.stones_shown[p] = 0;
                    removed = true;
                    break;
                }
            }
        }
        if (removed == false) {
            // Finally do some adding
            for (var i = 0; i < diff.length; ++i) {
                var p = (i + start) % diff.length;
                if (diff[p] == -black || diff[p] == -white) {
                    this.moving_stone = true;
                    this.stone_colour = -diff[p];
                    this.stone_from = [go_bowl, go_bowl];
                    this.stone_to = coords(p);
                    break;
                }
            }
        }
        if (removed == true) {
            this.eraseStone(this.stone_from);
        }
    }
}

// find integer points that form the line from x0, y0 to x1, y1
function line(x0, x1, y0, y1) {
    var deltax = x1 - x0;
    var deltay = y1 - y0;
    var error = 0.0;
    var points = [];
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

// The coordinates of a point with a given index
function coords(p) {
    return [p%gridsize, (p - p%gridsize)/gridsize];
}
/*
function backingScale(ctx) {
    if ('devicePixelRatio' in window) {
        if (window.devicePixelRatio > 1) {
            return window.devicePixelRatio;
        }
    }
    return 1;
}*/


// This runs after the DOM *and* images have loaded
$(window).load(function() {
    canvas = document.getElementById('goCanvas');
    context = canvas.getContext("2d");
/*    var scaleFactor = backingScale(context);
    if (scaleFactor > 1) {
        canvas.width = canvas.width * scaleFactor;
        canvas.height = canvas.height * scaleFactor;
        // update the context for the new canvas scale
        context.scale(scaleFactor, scaleFactor);
        context = canvas.getContext("2d");
    }*/

    goban = new Goban();
    $("#goban").click(function() {
        goban.view += 1;
    });

    window.onresize = function() {goban.resize(window.innerWidth, window.innerHeight - min_bottom_padding)};
    goban.resize(window.innerWidth, window.innerHeight - min_bottom_padding);
    setInterval(function() {goban.update()}, 1000);
    setInterval(function() {goban.transform()}, 20);


});


