/**
 * Created by scott on 15/05/2014.
 */

var canvas;
var context;
var w = 650; // Goban image width
var h = w*857/800; // Goban image height

var minx = 0.026;
var maxx = 0.974;
var miny = 0.03;
var maxy = 0.972;
var gridsize = 19;

var y_offset = 50;

var white_stone = new Image();
white_stone.src = "white_stone1.png";

var black_stone = new Image();
black_stone.src = "black_stone1.png";

var gobanImage = new Image();
gobanImage.src = "goban.jpg";

function Goban(){
    this.stones = [];
    this.drawnOnce = false;
    for (var i = 0; i < gridsize*gridsize; ++i){
        this.stones.push(0); // empty space
    }
    this.addStone = function(x, y, isWhite){
        this.stones[y*gridsize + x] = isWhite ? 1 : 2;
    }
    this.draw = function(){
       if (this.drawnOnce == false) {
           context.shadowColor = "rgba( 0, 0, 0, 0.6)";
           context.shadowOffsetX = w/80;
           context.shadowOffsetY = w/20;
           context.shadowBlur = 20;
           this.drawnOnce = true;
       }
       else {
           context.shadowOffsetX = context.shadowOffsetY = 0;
           context.shadowBlur = 0;
       }

       context.drawImage(gobanImage, 0, y_offset, w, h)
       context.shadowOffsetX = 1;
       context.shadowOffsetY = 3;
       context.shadowColor = "rgba( 0, 0, 0, 0.5)";
       context.shadowBlur = 50;
       for (var i = 0; i < gridsize; ++i){
           for (var j = 0; j < gridsize; ++j){
               var p = this.stones[i*gridsize + j];
               if (p == 1) {
                   this.drawStone(i, j, true);
               }
               if (p == 2) {
                   this.drawStone(i, j, false);
               }
           }
       }
    }
    this.drawStone = function(x, y, isWhite) {
        var tmp = x;
        x = y;
        y = tmp;

        x -= 1; // make zero based
        y -= 1;
        var xpos = minx*w + x*(maxx-minx)*w/(gridsize - 1);
        var ypos = miny*h + y*(maxy-miny)*h/(gridsize - 1);
        if (isWhite == true) {
            var diameter = w/20;
            context.drawImage(white_stone, xpos - diameter/2, ypos - diameter/2 + y_offset, diameter, diameter);
        }
        else {
            var diameter = w/20;
            context.drawImage(black_stone, xpos - diameter/2, ypos - diameter/2 + y_offset, diameter, diameter);
        }
    }

};

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
var goban;

function updateGoban() {
    var now = new Date();
    hour = now.getHours();
    minute = now.getMinutes();
    second = now.getSeconds();

    goban.stones = [];
    hour_stones = [[10, 2], [14, 3], [17, 6], [18, 10], [17, 14], [14, 17], [10, 18], [6, 17], [3, 14], [2, 10], [3, 6], [6, 3]];
    for (var i = 0; i < hour_stones.length; ++i) {
        goban.addStone(hour_stones[i][0], hour_stones[i][1], false);
    }
    var min_pos = 60*minute + second;
    min_pos += 45*60;
    var theta = 2*Math.PI*min_pos / 20;
    var R = 7.0;
    var endX = Math.round(10 + R*Math.cos(theta));
    var endY = Math.round(10 + R*Math.sin(theta));
    var hand_stones = line(10, endX, 10, endY);
    for (var i = 0; i < hand_stones.length; ++i) {
        goban.addStone(hand_stones[i][0], hand_stones[i][1], true);
    }

    hour %= 12;
    hour *= 5;
    hour += 45;
    hour += minute/12;
    var theta = 2*Math.PI*hour / 60;
    var R = 4.5;
    var endX = Math.round(10 + R*Math.cos(theta));
    var endY = Math.round(10 + R*Math.sin(theta));
    var hand_stones = line(10, endX, 10, endY);
    for (var i = 0; i < hand_stones.length; ++i) {
        goban.addStone(hand_stones[i][0], hand_stones[i][1], false);
    }


    goban.draw();

}
// This runs after the DOM *and* images have loaded
$(window).load(function() {
    canvas = document.getElementById('goCanvas');
    context = canvas.getContext("2d");
    context.shadowColor = "rgba( 0, 0, 0, 0.3 )";

    goban = new Goban();

    setInterval(updateGoban, 1000);
});


