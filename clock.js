/**
 * Created by scott on 15/05/2014.
 */

var canvas;
var context;
var w = 650; // Goban image width
var h = w*857/800; // Goban image height
var goban_ratio = 857/800;
var minx = 0.026;
var maxx = 0.974;
var miny = 0.03;
var maxy = 0.972;
var gridsize = 19;

var y_offset = 0;
var x_offset = 0;
var max_top_padding = 50;
var padding = 30;

var white_stone = new Image();
white_stone.src = "white_stone1.png";

var black_stone = new Image();
black_stone.src = "black_stone1.png";

var gobanImage = new Image();
gobanImage.src = "goban.jpg";

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

// Prevent scrolling in iOS
//document.ontouchstart = function(e){
//    e.preventDefault();
//}

resize = function() {
    goban.drawnOnce = false;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    w = canvas.width - 2*padding;
    h = canvas.height - 2*padding;
    if (w*goban_ratio > h) {
        // clip to height
        w = h/goban_ratio;
    } else {
        h = w*goban_ratio;
    }
    y_offset = (canvas.height - h) / 2;
    if (y_offset > max_top_padding) {
        y_offset = max_top_padding;
    }
    x_offset = (canvas.width - w) / 2;
    goban.draw();

}
window.onresize = resize;

function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

function Goban(){
    this.stones = [];
    this.stones_shown = []; // The stones last drawn
    this.drawnOnce = false;
    this.moving_stone = false;
    this.stone_from = [0, 0];
    this.stone_to = [0, 0];
    this.stone_percent = 0;
    this.stone_colour = white;

    this.clear = function() {
        this.stones = [];
        for (var i = 0; i < gridsize*gridsize; ++i){
            this.stones.push(0); // empty space
        }
    }

    this.clear();
    for (var i = 0; i < gridsize*gridsize; ++i){
        this.stones_shown.push(0); // empty space
    }
    this.drawNumber = function(number, x_offset, y_offset, small, isWhite) {
        var num = small_num[number];
        for (var i = 0; i < num.length; ++i) {
            this.addStone(num[i][0] + x_offset, num[i][1] + y_offset, isWhite);
        }
    }

    this.addStone = function(x, y, isWhite){
        this.stones[y*gridsize + x] = isWhite ? white : black;
    }
    this.draw = function(){
        if (this.drawnOnce == false) {
            context.shadowColor = "rgba( 0, 0, 0, 0.6)";
            context.shadowOffsetX = w/80;
            context.shadowOffsetY = w/30;
            context.shadowBlur = w/50;
            this.drawnOnce = true;
        }
        else {
            context.shadowOffsetX = context.shadowOffsetY = 0;
            context.shadowBlur = 0;
        }
        context.drawImage(gobanImage, x_offset, y_offset, w, h)

        context.shadowOffsetX = 1;
        context.shadowOffsetY = 3;
        context.shadowColor = "rgba( 0, 0, 0, 0.1)";
        context.shadowBlur = 0;
        for (var i = 0; i < gridsize; ++i){
            for (var j = 0; j < gridsize; ++j){
                var p = this.stones_shown[i*gridsize + j];
                if (p == white) {
                    this.drawStone(j, i, true);
                }
                if (p == black) {
                    this.drawStone(j, i, false);
                }
            }
        }
    }
    this.drawStone = function(x, y, isWhite) {
        if (x < 0 || x > gridsize - 1 || y < 0 || y > gridsize - 1) {
            return;
        }
        var xpos = minx*w + x*(maxx-minx)*w/(gridsize - 1);
        var ypos = miny*h + y*(maxy-miny)*h/(gridsize - 1);
        if (isWhite == true) {
            var diameter = w/21;
            context.drawImage(white_stone, xpos - diameter/2 + x_offset, ypos - diameter/2 + y_offset, diameter, diameter);
        }
        else {
            var diameter = w/20;
            context.drawImage(black_stone, xpos - diameter/2 + x_offset, ypos - diameter/2 + y_offset, diameter, diameter);
        }
    }

    this.update = function() {
        var now = new Date();
        hour = now.getHours();
        minute = now.getMinutes();
        second = now.getSeconds();
        // TODO: pass in analogue
        var analogue = $("#analogue").is(":checked");
        this.clear();
        if (analogue) {
            hour_stones = [[9, 1], [13, 2], [16, 5], [17, 9], [16, 13], [13, 16], [9, 17], [5, 16], [2, 13], [1, 9], [2, 5], [5, 2]];
            for (var i = 0; i < hour_stones.length; ++i) {
                this.addStone(hour_stones[i][0], hour_stones[i][1], false);
            }
            var min_pos = 60*minute + second;
            min_pos += 45*60;
            var theta = 2*Math.PI*min_pos / 3600;
            var R = 7.0;
            var endX = Math.round(9 + R*Math.cos(theta));
            var endY = Math.round(9 + R*Math.sin(theta));
            var hand_stones = line(9, endX, 9, endY);
            for (var i = 0; i < hand_stones.length; ++i) {
                this.addStone(hand_stones[i][0], hand_stones[i][1], true);
            }

            hour %= 12;
            hour *= 5;
            hour += 45;
            hour += minute/12;
            var theta = 2*Math.PI*hour / 60;
            var R = 4.5;
            var endX = Math.round(9 + R*Math.cos(theta));
            var endY = Math.round(9 + R*Math.sin(theta));
            var hand_stones = line(9, endX, 9, endY);
            for (var i = 0; i < hand_stones.length; ++i) {
                this.addStone(hand_stones[i][0], hand_stones[i][1], false);
            }
        }
        else {
            this.drawNumber((hour - hour%10)/10, 4, 2, true, true);
            this.drawNumber(hour%10, 10, 2, true, true);

            this.drawNumber((minute - minute%10)/10, 4, 11, true, false);
            this.drawNumber(minute%10, 10, 11, true, false);
        }
    }

    this.transform = function() {
        // Incrementally change the displayed goban to the desired configuration
        if (this.moving_stone == true) {
            this.stone_percent += 15;
            if (this.stone_percent >= 100) {
                if (this.stone_to[1] >= 0 && this.stone_to[1] < gridsize && this.stone_to[0] >= 0 && this.stone_to[0] < gridsize) {
                    this.stones_shown[this.stone_to[0] + gridsize*this.stone_to[1]] = this.stone_colour;
                }
                this.moving_stone = false;
                this.draw();
                this.stone_percent = 0;
                return;
            }
            this.draw();
            this.drawStone(this.stone_from[0] + this.stone_percent*(this.stone_to[0] - this.stone_from[0])/100, this.stone_from[1] + this.stone_percent*(this.stone_to[1] - this.stone_from[1])/100, this.stone_colour == white);
            return;
        }
        var final = this.stones;
        var diff = [];
        for (var i = 0; i < this.stones_shown.length; ++i) {
            diff.push(this.stones_shown[i] - final[i]);
        }
        var best_i = -1;
        var best_j = -1;
        for (var i = 0; i < diff.length; ++i) {
            if (diff[i] == -white || diff[i] == -black) {
                // we want a white or black stone here - search for the nearest excess white or black
                if (best_i == -1) {
                    best_i = i;
                }
                for (var j = 0; j < diff.length; ++j) {
                    if (diff[j] == -diff[i]) {
                        if (best_j == -1 || dist(j, i) < dist(best_j, best_i)) {
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
            this.stone_from = coords(best_j);
            this.stone_to = coords(best_i);
            this.stone_colour = this.stones_shown[best_j];
            this.stones_shown[best_j] = 0;
        }
        else {
            black_bowl = [22, 15]; // position of black bowl
            white_bowl = [22, 3];
            // No more moving will help. Find stone to remove.
            var removed = false;
            // Prefer removing stones which are where the opposite colour wants to be
            // Randomise where we start looking
            var start = Math.floor(Math.random()*diff.length);
            for (var i = 0; i < diff.length; ++i) {
                var p = i + start % diff.length;
                if (diff[p] == black - white || diff[p] == white - black) {
                    this.moving_stone = true;
                    this.stone_from = coords(p);
                    this.stone_colour = this.stones_shown[p]
                    this.stone_to = this.stone_colour == white ? white_bowl : black_bowl;
                    this.stones_shown[p] = 0;
                    removed = true;
                    break;
                }
            }
            if (removed == false) {
                // Try removing other ones
                var start = Math.floor(Math.random()*diff.length);
                for (var i = 0; i < diff.length; ++i) {
                    var p = i + start % diff.length;
                    if (diff[p] == black || diff[p] == white) {
                        this.moving_stone = true;
                        this.stone_from = coords(p);
                        this.stone_colour = this.stones_shown[p]
                        this.stone_to = this.stone_colour == white ? white_bowl : black_bowl;
                        this.stones_shown[p] = 0;
                        removed = true;
                        break;
                    }
                }
            }
            if (removed == false) {
                // Finally do some adding
                var start = Math.floor(Math.random()*diff.length);
                for (var i = 0; i < diff.length; ++i) {
                    var p = i + start % diff.length;
                    if (diff[p] == -black || diff[p] == -white) {
                        this.moving_stone = true;
                        this.stone_colour = -diff[p];
                        this.stone_from = this.stone_colour == white ? white_bowl : black_bowl;
                        this.stone_to = coords(p);
                        break;
                    }
                }
            }
        }
        this.draw();
    }


};

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


function dist(i, j) {
    var xi = i%gridsize;
    var yi = (i-xi)/gridsize;
    var xj = j%gridsize;
    var yj = (j-xj)/gridsize;
    return Math.sqrt((xi - xj)*(xi - xj) + (yi - yj)*(yi - yj));
}

function coords(p) {
    return [p%gridsize, (p - p%gridsize)/gridsize];
}


// This runs after the DOM *and* images have loaded
$(window).load(function() {
    canvas = document.getElementById('goCanvas');
    context = canvas.getContext("2d");
    context.shadowColor = "rgba( 0, 0, 0, 0.3 )";

    goban = new Goban();
    resize();
    setInterval(function() {goban.update()}, 1000);
    setInterval(function() {goban.transform()}, 10);

});


