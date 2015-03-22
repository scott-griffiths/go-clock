/**
 * Created by scott on 15/05/2014.
 */

var angle = 30;

var min_bottom_padding = 0;
var gridsize = 19;

var go_bowl = 999;

ext = "images/";

images = ["white_stone0.png", "white_stone1.png", "white_stone2.png", "white_stone3.png",
    "black_stone1.png", "goban_1200.jpg", "goban_400.jpg", "goban_200.jpg"];

var white_stone0 = new Image();
white_stone0.src = ext + "white_stone0.png";
var white_stone1 = new Image();
white_stone1.src = ext + "white_stone1.png";
var white_stone2 = new Image();
white_stone2.src = ext + "white_stone2.png";
var white_stone3 = new Image();
white_stone3.src = ext + "white_stone3.png";

var black_stone = new Image();
black_stone.src = ext + "black_stone1.png";

var goban_1200 = new Image();
goban_1200.src = ext + "goban_1200.jpg";
var goban_400 = new Image();
goban_400.src = ext + "goban_400.jpg";
var goban_200 = new Image();
goban_200.src = ext + "goban_200.jpg";

var white = 1;
var black = 3;

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


function GoClock(mainCanvas, backgroundImage){
    this.mainCanvas = mainCanvas;
    this.mainContext = this.mainCanvas.getContext("2d");

    this.backgroundImage = backgroundImage;

    this.stones = []; // The current (desired) state
    this.stones_shown = []; // The stones last drawn
    this.stone_queue = []; // Prioritise putting these stones on the board, in this order.
    this.moving_stone = false;
    this.stone_from = [0, 0]; // Board coordinates
    this.stone_to = [0, 0]; // Board coordinates
    this.stone_percent = 0; // Percentage stone is between the from and to
    this.stone_colour = white;
    this.stone_pos = [0, 0, 0, 0]; // Pixel position of last drawn moving stone: x, y, w, h

    this.view = 0; // The clock type
    this.setup = true; // if true we're doing the first drawing of the clock

    this.bufferCanvas = document.createElement('canvas');
    this.bufferContext = this.bufferCanvas.getContext('2d');

    this.emptyBoardCanvas = document.createElement('canvas');
    this.emptyBoardContext = this.emptyBoardCanvas.getContext('2d');

    this.speed = 9;
    this.sounds = 1;

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

    // Draw the underlying board (i.e. everything except any moving stones)
    this.draw = function(width, height) {
        this.goban_width = width * 0.90; // Some padding to show background
        this.goban_height = height * 0.90;
        var goban_ratio = 857/800; // Ratio of the goban image

        if (this.goban_width*goban_ratio > this.goban_height) {
            // clip to height
            this.goban_width = this.goban_height/goban_ratio | 0;
        } else {
            this.goban_height = this.goban_width*goban_ratio | 0;
        }
        this.y_offset = (height - this.goban_height) / 2 | 0;
        if (this.y_offset > this.goban_height/4) {
            this.y_offset = this.goban_height/4;
        }
        this.x_offset = (width - this.goban_width) / 2 | 0;
        this.mainCanvas.width = this.bufferCanvas.width = this.emptyBoardCanvas.width = width;
        this.mainCanvas.height = this.bufferCanvas.height = this.emptyBoardCanvas.height = height;

        this.bufferContext.shadowColor = "rgba( 0, 0, 0, 0.6)";
        var shadowLength = this.goban_width/20;
        this.bufferContext.shadowOffsetX = shadowLength * Math.sin(angle*Math.PI/180);
        this.bufferContext.shadowOffsetY = shadowLength * Math.cos(angle*Math.PI/180);
        this.bufferContext.shadowBlur = this.goban_width/50;
        // We choose the goban image based on the display size as the canvas
        // isn't very good at resizing and keeping the board line detail
        var gobanImage = goban_1200;
        if (this.goban_width <= 400) {
            gobanImage = goban_400;
        }
        if (this.goban_width <= 200) {
            gobanImage = goban_200;
        }
        var bg = this.backgroundImage;
        // Work out background dimensions to cover everything but not distort the image
        var ratio = this.bufferCanvas.width/this.bufferCanvas.height;
        if (bg.width/bg.height >= ratio) {
            // Show background full height and trim width
            this.bufferContext.drawImage(bg, (bg.width - bg.height*ratio)/2, 0, bg.height*ratio, bg.height, 0, 0, this.bufferCanvas.width, this.bufferCanvas.height);

        } else {
            // show full width and trim height
            this.bufferContext.drawImage(bg, 0, (bg.height - bg.width/ratio)/2, bg.width, bg.width/ratio, 0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
        }

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
        this.mainContext.shadowOffsetX = 0;
        this.mainContext.shadowOffsetY = 0;
        this.mainContext.shadowBlur = 0;
        this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainContext.drawImage(this.bufferCanvas, 0, 0);
    };

    this.drawNumber = function(number, x_offset, y_offset, small, colour) {
        var num = small ? tiny_num[number] : small_num[number];
        for (var i = 0; i < num.length; ++i) {
            this.addStoneToQueue(num[i][0] + x_offset, num[i][1] + y_offset, colour);
        }
    };
    this.addStone = function(x, y, colour){
        this.stones[y*gridsize + x] = colour;
    };
    this.addStoneToQueue = function(x, y, colour) {
        this.stone_queue.push([x, y, colour]);
        this.addStone(x, y, colour);
    };
    this.drawStone = function(ctx, coords, colour, height) {
        if (coords[0] < 0 || coords[0] > gridsize - 1 || coords[1] < 0 || coords[1] > gridsize - 1) {
            return;
        }
        var p = this.stonePosition(coords[0], coords[1], height);
        if (height != 0) {
            var shadowSize = height*this.goban_width/800;
            ctx.shadowOffsetX = shadowSize;
            ctx.shadowOffsetY = 5*shadowSize;
            ctx.shadowColor = "rgba(0, 0, 0, " + (0.5 - height/20) + ")";
            ctx.shadowBlur = shadowSize;
            ctx.globalAlpha = height < 3 ? 1 : 1 - (height - 3)/8;
        } else {
/*            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = 5;*/
        }
        if (colour == white) {
            // TODO: This just picks a white stone randomly - looks silly when they move!
            var r = (Math.random()*6 | 0) - 2;
            var s = white_stone0;
//            if (r == 1) s = white_stone1;
//            if (r == 2) s = white_stone2;
//            if (r == 3) s = white_stone3;
            ctx.drawImage(s, p[0], p[1], p[2], p[3]);
        } else {
            ctx.drawImage(black_stone, p[0], p[1], p[2], p[3]);
        }
        ctx.globalAlpha = 1;
        return p;
    };

    // Remove a stone from the buffered board
    this.eraseStone = function(coords) {
        var p = this.stonePosition(coords[0], coords[1], 0);
        this.bufferContext.shadowOffsetX = this.bufferContext.shadowOffsetY = 0;
        this.bufferContext.shadowBlur = 0;
        this.bufferContext.drawImage(this.emptyBoardCanvas, p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);
        this.mainContext.drawImage(this.bufferCanvas, p[0], p[1], p[2], p[3], p[0], p[1], p[2], p[3]);
    };

    // Update the desired state of the clock
    this.update = function(seconds, minutes, hours, days) {
        var now = new Date();

        hours = typeof hours !== 'undefined' ? hours : now.getHours();
        minutes = typeof minutes !== 'undefined' ? minutes : now.getMinutes();
        seconds = typeof seconds !== 'undefined' ? seconds : now.getSeconds();
        days = typeof days !== 'undefined' ? days : 0;

        var views = 4;
        this.view %= views;
        this.clear();
        if (this.view == 0) {
            var hour_stones = [[9, 1], [13, 2], [16, 5], [17, 9], [16, 13], [13, 16], [9, 17], [5, 16], [2, 13], [1, 9], [2, 5], [5, 2]];
            for (var i = 0; i < hour_stones.length; ++i) {
                this.addStoneToQueue(hour_stones[i][0], hour_stones[i][1], black);
            }
            var min_pos = 60*minutes + seconds;
            var theta = 2*Math.PI*min_pos / 3600;
            var R = 7.0;
            var endX = Math.round(9 + R*Math.sin(theta));
            var endY = Math.round(9 - R*Math.cos(theta));
            var hand_stones = line(9, endX, 9, endY);
            for (var i = 0; i < hand_stones.length; ++i) {
                this.addStoneToQueue(hand_stones[i][0], hand_stones[i][1], white);
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
                this.addStoneToQueue(hand_stones[i][0], hand_stones[i][1], black);
            }
        }
        else if (this.view == 1) {
            hour_stones = [[9, 1], [13, 2], [16, 5], [17, 9], [16, 13], [13, 16], [9, 17], [5, 16], [2, 13], [1, 9], [2, 5], [5, 2]];
            for (var i = 0; i < hour_stones.length; ++i) {
                this.addStoneToQueue(hour_stones[i][0], hour_stones[i][1], hours%12 == i ? white : black);
            }
            this.drawNumber((minutes - minutes%10)/10, 6, 4, true, black);
            this.drawNumber(minutes%10, 10, 4, true, black);
            this.drawNumber((seconds - seconds%10)/10, 6, 10, true, white);
            this.drawNumber(seconds%10, 10, 10, true, white);
        }
        else if (this.view == 2) {
            this.drawNumber((hours - hours%10)/10, 4, 2, false, black);
            this.drawNumber(hours%10, 10, 2, false, black);
            this.drawNumber((minutes - minutes%10)/10, 4, 10, false, white);
            this.drawNumber(minutes%10, 10, 10, false, white);
        }
        else if (this.view == 3) {
            this.drawNumber((hours - hours%10)/10, 1, 1, true, black);
            this.drawNumber(hours%10, 5, 1, true, black);
            this.addStoneToQueue(9, 2, black);
            this.addStoneToQueue(9, 4, black);
            this.drawNumber((minutes - minutes%10)/10, 11, 1, true, black);
            this.drawNumber(minutes%10, 15, 1, true, black);

            var second_stones = [[9, 6], [12, 7], [14, 9], [15, 12], [14, 15], [12, 17], [9, 18], [6, 17], [4, 15], [3, 12], [4, 9], [6, 7]];
            for (var i=0; i < second_stones.length; ++i) {
                this.addStoneToQueue(second_stones[i][0], second_stones[i][1], i == Math.floor(seconds/5) ? black : white);
            }

            var theta = 2*Math.PI*seconds / 60;
            var R = 4;
            var endX = Math.round(9 + R*Math.sin(theta));
            var endY = Math.round(12 - R*Math.cos(theta));
            var hand_stones = line(9, endX, 12, endY);
            for (var i=0; i < hand_stones.length; ++i) {
                this.addStoneToQueue(hand_stones[i][0], hand_stones[i][1], white);
            }
        }
        else if (this.view == 4) {
            var u = days%10;
            var t = (days - u)/10;
            this.drawNumber((t - t%10)/10, 1, 1, true, black);
            this.drawNumber(t%10, 5, 1, true, black);
            this.drawNumber(u, 9, 1, true, black);
            this.drawNumber((hours - hours%10)/10, 5, 7, true, white);
            this.drawNumber(hours%10, 9, 7, true, white);
            this.drawNumber((minutes - minutes%10)/10, 5, 13, true, black);
            this.drawNumber(minutes%10, 9, 13, true, black);
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
        var diameter = (this.goban_width/20) * (1 + height/20) | 0;
        return [xpos - diameter/2 + this.x_offset | 0, ypos - diameter/2 + this.y_offset | 0, diameter, diameter];
    };

    this.move_stone = function() {
        var start_of_movement = this.stone_percent == 0;
        if (this.stone_percent == 0 && this.stone_from[0] != go_bowl) {
            this.eraseStone(this.stone_from);
        }
        if (this.stone_percent != 0) {
            // Erase previous moving stone
            this.mainContext.shadowColor = "rgba(80, 80, 80, 0)";
            var xpos = this.stone_pos[0];
            var ypos = this.stone_pos[1];
            var w = this.stone_pos[2];
            var h = this.stone_pos[3];
            // We erase 4* the area to make sure we get the shadow. Bit of a hack.
            this.mainContext.drawImage(this.bufferCanvas, xpos, ypos, w*2, h*2, xpos, ypos, w*2, h*2);
        }

        this.stone_percent += this.setup ? this.speed*2 : this.speed; // Goes faster when first putting down stones
        if (this.stone_percent >= 100) {
            if (this.stone_to[1] >= 0 && this.stone_to[1] < gridsize && this.stone_to[0] >= 0 && this.stone_to[0] < gridsize) {
                // add stone to board and draw on buffer and shown context
                this.stones_shown[this.stone_to[0] + gridsize*this.stone_to[1]] = this.stone_colour;
                this.drawStone(this.bufferContext, this.stone_to, this.stone_colour, 0);
                this.drawStone(this.mainContext, this.stone_to, this.stone_colour, 0);
                if (this.stone_from[0] == go_bowl && this.sounds) {
                    var click_sound = new Audio("sounds/click_x.wav");
                    click_sound.play();
                }
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
            this.stone_pos = this.drawStone(this.mainContext, this.stone_to, this.stone_colour, 10*(1 - this.stone_percent/100));
        }
        else if (this.stone_to[0] == go_bowl) {
            // Stone being removed
            if (start_of_movement && this.sounds) {
                var removal_sound = new Audio("sounds/bottle_x.wav");
                removal_sound.play();
            }
            this.stone_pos = this.drawStone(this.mainContext, this.stone_from, this.stone_colour, 10*this.stone_percent/100);
        }
        else {
            if (start_of_movement && this.sounds) {
                var dragging_sound = new Audio("sounds/baseball_hit.wav");
                dragging_sound.play();
            }

            // In/out quadratic easing to get more natural movement
            var t = this.stone_percent;
            var x, y;
            t /= 50;
            if (t < 1) {
                x = this.stone_from[0] + (this.stone_to[0] - this.stone_from[0])/2*t*t;
                y = this.stone_from[1] + (this.stone_to[1] - this.stone_from[1])/2*t*t;
            } else {
                t -= 1;
                x = this.stone_from[0] - (this.stone_to[0] - this.stone_from[0])/2*(t*(t - 2) - 1);
                y = this.stone_from[1] - (this.stone_to[1] - this.stone_from[1])/2*(t*(t - 2) - 1);
            }
            this.stone_pos = this.drawStone(this.mainContext, [x, y], this.stone_colour, 0);
        }
        return;

    };

    // Incrementally change the displayed goban to the desired configuration
    this.transform = function() {
        if (this.moving_stone == true) {
            this.move_stone();
            return;
        }
        // No moving stones, so work out what, if anything, needs to change
        var diff = [];
        for (var i = 0; i < this.stones_shown.length; ++i) {
            diff.push(this.stones_shown[i] - this.stones[i]);
        }
        // Randomise where we start looking
        var start = Math.random()*diff.length | 0;

        var best_i = -1;
        var best_j = -1;
        // First look for stones on a spot where the opposite colour wants to be
        for (var j = 0; j < diff.length; ++j) {
            if (diff[j] == black - white || diff[j] == white - black) {
                var wanted = (diff[j] == black - white) ? -black : -white;
                for (var i = 0; i < diff.length; ++i) {
                    if (diff[i] == wanted) {
                        if (best_j == -1 || dist(j, i) < dist(best_j, best_i)) {
                            best_i = i;
                            best_j = j;
                        }
                    }
                }
            }
        }
        if (best_j == -1) {
            for (var i = 0; i < diff.length; ++i) {
                var p = (i + start) % diff.length;
                if (diff[p] == -white || diff[p] == -black) {
                    // we want a white or black stone here - search for the nearest excess white or black
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
            var to_remove_first = [];
            var to_remove_next = [];
            var to_add = [];
            for (var i = 0; i < diff.length; ++i) {
                if (diff[i] == black - white || diff[i] == white - black) {
                    to_remove_first.push(i);
                }
                else if (diff[i] == black || diff[i] == white) {
                    to_remove_next.push(i);
                }
                else if (diff[i] == -black || diff[i] == -white) {
                    to_add.push(i);
                }
            }
            var i = -1;
            if (to_remove_first.length != 0) {
                i = to_remove_first[Math.random() * to_remove_first.length | 0];
            }
            if (i == -1 && to_remove_next.length != 0) {
                i = to_remove_next[Math.random() * to_remove_next.length | 0];
            }
            if (i != -1) {
                this.moving_stone = true;
                this.stone_from = coords(i);
                this.stone_colour = this.stones_shown[i];
                this.stone_to = [go_bowl, go_bowl];
                this.stones_shown[i] = 0;
            }
            else {
                // Finally do some adding
                var added = false;
                while (this.stone_queue.length != 0) {
                    var new_stone = this.stone_queue.shift();
                    if (this.stones_shown[new_stone[0] + gridsize * new_stone[1]] == 0 &&
                        this.stones[new_stone[0] + gridsize * new_stone[1]] == new_stone[2]) {
                        this.moving_stone = true;
                        this.stone_colour = new_stone[2];
                        this.stone_from = [go_bowl, go_bowl];
                        this.stone_to = [new_stone[0], new_stone[1]];
                        added = true;
                        break;
                    }
                }
                if (added == false) {
                    this.setup = false; // We've finished adding the initial set of stones
                    if (to_add.length != 0) {
                        var i = to_add[Math.random() * to_add.length | 0];
                        this.moving_stone = true;
                        this.stone_colour = -diff[i];
                        this.stone_from = [go_bowl, go_bowl];
                        this.stone_to = coords(i);
                    }
                }
            }
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

function backingScale() {
    if ('devicePixelRatio' in window) {
        if (window.devicePixelRatio > 1) {
            return window.devicePixelRatio;
        }
    }
    return 1;
}

