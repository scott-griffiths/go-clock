/**
 * Created by scott on 15/05/2014.
 */

var angle = 20;
var xFactor = Math.sin(angle*Math.PI/180);
var yFactor = Math.cos(angle*Math.PI/180);

var gridsize = 19;

var go_bowl = 999;

// These give the relative positions of the sides of the goban grid as a proportion of the goban image
var minx = 0.026;
var maxx = 0.974;
var miny = 0.03;
var maxy = 0.972;

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

function GoClock(){
    this.stones = []; // The current (desired) state
    this.stones_shown = []; // The stones last drawn
    this.moving_stone = false;
    this.stone_from = [0, 0]; // Board coordinates
    this.stone_to = [0, 0]; // Board coordinates
    this.clear_route = true; // Is the route from stone_from to stone_to clear of obstacles?
    this.stone_percent = 0; // Percentage stone is between the from and to
    this.stone_colour = white;
    this.stone_pos = [0, 0, 0, 0]; // Pixel position of last drawn moving stone: x, y, w, h

    this.hand_position = 9*19 + 9; // Position of hand that's moving the stones.

    this.offsets = []; // The small offsets of each stone position to make it less regular-looking
    this.white_stone = []; // Which white stone to use in each position (if a white stone is there!)

    this.view = 0; // The clock type

    this.speed = 9;
    this.sounds = 0;

    this.twenty_four_hour = true; // 24 hour mode for views that make sense

    this.clear = function() {
        this.stones = [];
        for (var i = 0; i < gridsize*gridsize; ++i){
            this.stones.push(0); // empty space
        }
    };

    this.reset_offsets = function() {
        this.offsets = [];
        var messiness = 0;
        for (var i = 0; i < gridsize*gridsize; ++i){
            this.offsets.push([Math.random()*messiness - messiness/2, Math.random()*messiness - messiness/2]);
        }
    };

    this.clear();
    this.reset_offsets();

    for (var i = 0; i < gridsize*gridsize; ++i){
        this.stones_shown.push(0); // empty space
    }

    // The coordinates of a point with a given index
    this.get_coords = function(p) {
        return [p%gridsize + this.offsets[p][0]/50, (p - p%gridsize)/gridsize + this.offsets[p][1]/50];
    };
    // The reverse operation: Get index of point from coordinates
    this.get_index = function(p) {
        return Math.round(p[0]) + gridsize*Math.round(p[1]);
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
        var $goban = $('#goban');
        $goban.empty();
        $goban.append('<img id="goban-image"/>');
        $('#goban-image').replaceWith(gobanImage);
        var $goban_img = $goban.find('img');
        $goban_img.width(this.goban_width).height(this.goban_height);
        var padding = ((height - this.goban_height) / 2) | 0;
        $goban_img.css('margin-top', padding);
        $goban_img.css('margin-bottom', padding);
        var s = this.goban_height / 50 | 0;
        $goban_img.css('box-shadow', s+'px '+2*s+'px '+2*s+'px '+' 0px rgba(0,0,0,0.6)');


        // Set up a div for every stone position
        for (var i = 0; i < gridsize*gridsize; ++i) {
            var coords = this.get_coords(i);
            var p = this.stonePosition(coords[0], coords[1], 0);
            var stone = "<div class='board_pos' id=p" + i + " style='position: absolute; left: " + p[0] + "px; top: " + p[1] + "px; width: " + p[2] + "px; height: " + p[3] + "px;'><img class='stone' src=''></div>";
            $goban.append(stone);
        }
        // And a single div for the moving stone
        $goban.append("<div id=moving_stone style='position: absolute'><img class='stone' src=''></div>");
        $("#moving_stone img").hide();

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
    this.drawStone = function(coords, colour, height) {
        if (coords[0] <= -0.5 || coords[0] >= gridsize - 0.5 || coords[1] <= -0.5 || coords[1] >= gridsize - 0.5) {
            return;
        }
        var p = this.stonePosition(coords[0], coords[1], height);
        var src = colour == white ? white_stone0.src : black_stone.src;
        var i = this.get_index(coords);
        var s = $('#p' + i + ' img');
        s.css('-webkit-filter', this.getShadowCss(height));
        s.attr('src', src).show();
        return p;
    };
    this.getShadow = function(height) {
        var shadowSize = this.goban_width/80 + height*this.goban_width / 160;
        var shadowX = (shadowSize * xFactor) | 0;
        var shadowY = (shadowSize * yFactor) | 0;
        var shadowColour = "rgba(0, 0, 0, " + (height < 4 ? (4 - height)/8 : 1/4) + ")";
        var shadowBlur = shadowSize / 1 | 0;
        return [shadowX, shadowY, shadowBlur, shadowColour];
    };
    this.getShadowCss = function(height) {
        s = this.getShadow(height);
        return 'drop-shadow(' + s[0] + 'px ' + s[1] + 'px ' + s[2] + 'px ' + s[3] + ')';
    }

    // Remove a stone from the buffered board
    this.eraseStone = function(coords) {
        var i = this.get_index(coords);
        $('#p' + i + ' img').hide();
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
        $("#moving_stone").css('opacity', '1.0').show();
        $('#moving_stone img').css('-webkit-filter', this.getShadowCss(0));
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
            self.stones_shown[Math.round(self.stone_to[0]) + gridsize*Math.round(self.stone_to[1])] = self.stone_colour;
            $("#moving_stone").hide();
            self.drawStone(self.stone_to, self.stone_colour, 0);
            self.moving_stone = false;
            self.transform();
        };
        
        $("#moving_stone").css({'left': p1[0]+'px', 'top': p1[1]+'px', 'width': p1[2]+'px', 'height': p1[3]+'px'});
        var src = colour == white ? white_stone0.src : black_stone.src;
        $("#moving_stone img").attr('src', src).show();
        var distance = dist(this.get_index(coords1), this.get_index(coords2));
        var duration = Math.sqrt(distance/speed);
        if (this.clear_route) {
            TweenMax.to("#moving_stone", duration, {
                left: p2[0],
                top: p2[1],
                force3D: true,
                onComplete: end_tasks});
        } else {
            var max_height = 8 + distance/2;
            if (max_height > 12) {
                max_height = 12;
            }
            var middle = this.stonePosition((coords1[0] + coords2[0])/2, (coords1[1] + coords2[1])/2, max_height);
            var shadowMiddle = this.getShadow(max_height);
            // TODO: Can't yet get the shadow to tween!
            TweenMax.to("#moving_stone", duration/2, {
                left: middle[0],
                top: middle[1],
                force3D: true,
                width: middle[2],
                height: middle[3],
                ease: Power2.easeIn
            });
            TweenMax.to("#moving_stone", duration/2, {
                left: p2[0],
                top: p2[1],
                width: p2[2],
                force3D: true,
                height: p2[3],
                delay: duration/2,
                /*filter: this.getShadowCss(0),*/
                ease: Power2.easeOut,
                onComplete: end_tasks});
        }
    };
    this.dropStone = function(coords, colour, speed) {
        var duration = Math.sqrt(1/speed);
        var p1 = this.stonePosition(coords[0], coords[1], 10);
        var p2 = this.stonePosition(coords[0], coords[1], 0);
        var self = this;
        var end_tasks = function() {
            // add stone to board
            self.stones_shown[Math.round(self.stone_to[0]) + gridsize*Math.round(self.stone_to[1])] = self.stone_colour;
            $("#moving_stone").hide();
            self.drawStone(self.stone_to, self.stone_colour, 0);
            self.moving_stone = false;
            self.transform();
        };
        
        $("#moving_stone").css({'left': p1[0]+'px', 'top': p1[1]+'px', 'width': p1[2]+'px', 'height': p1[3]+'px'});
        var src = colour == white ? white_stone0.src : black_stone.src;
        $("#moving_stone img").attr('src', src).show();
        $("#moving_stone").css('opacity', '0.3');
        TweenMax.to("#moving_stone", duration, {
            left: p2[0],
            top: p2[1],
            width: p2[2],
            force3D: true,
            height: p2[3],
            opacity: 1.0,
            onComplete: end_tasks});
/*        TweenMax.to("#moving_stone", duration, {
            opacity: 1.0,
            ease: Power3.easeOut});*/
    }
    this.pickupStone = function(coords, colour, speed) {
        duration = Math.sqrt(1/speed);
        var p1 = this.stonePosition(coords[0], coords[1], 0);
        var p2 = this.stonePosition(coords[0], coords[1], 10);
        var self = this;
        var end_tasks = function() {
            $("#moving_stone").hide();
            self.moving_stone = false;
            $("#moving_stone").css('opacity', '1.0');
            self.transform();
        };
        
        $("#moving_stone").css({'left': p1[0]+'px', 'top': p1[1]+'px', 'width': p1[2]+'px', 'height': p1[3]+'px'});
        var src = colour == white ? white_stone0.src : black_stone.src;
        $("#moving_stone img").attr('src', src).show();
        TweenMax.to("#moving_stone", duration, {
            left: p2[0],
            top: p2[1],
            width: p2[2],
            force3D: true,
            height: p2[3],
            opacity: 0.3,
            onComplete: end_tasks});
    };

    // Incrementally change the displayed goban to the desired configuration
    this.transform = function() {
        if (this.moving_stone == true) {
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
            this.stone_to = this.get_coords(best_i);
            this.hand_position = best_i;
            this.stone_colour = this.stones_shown[best_j];
            this.stones_shown[best_j] = 0;
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
                    this.stone_to = this.get_coords(best_i);
                    this.hand_position = best_i;
                }
            }
        }
        if (this.moving_stone == true) {
            this.move_stone();
        } else {
            // Set up next call to transform
            setTimeout(this.transform.bind(this), 500);
        }
    }
}

function nearest(point, points) {
    var nearest = points[0];
    for (var i=1; i < points.length; ++i) {
        if (dist(point, points[i]) < dist(point, nearest)) {
            nearest = points[i];
        }
    }
    return nearest;
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

function backingScale() {
    if ('devicePixelRatio' in window) {
        if (window.devicePixelRatio > 1) {
            return window.devicePixelRatio;
        }
    }
    return 1;
}
