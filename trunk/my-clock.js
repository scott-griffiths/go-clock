
var xmouse;
var ymouse;

var timeOut;
function showHelpIcon(time) {
    clearTimeout(timeOut);
    if (!$("#about").is(":visible")) {
        $("#help_icon").fadeIn(1000);
    }
    timeOut = setTimeout(function(){$("#help_icon").fadeOut()}, time);
}

document.onmousemove = function(e) {
    if (e.offsetX == undefined) // Firefox
    {
       xmouse = e.pageX;
       ymouse = e.pageY;
    }
    else // Chrome etc.
    {
      xmouse = e.offsetX;
      ymouse = e.offsetY;
    }
}

$(document).ready(function(){
    $("#splash_screen").show();
    var now = new Date();
    var time = now.getTime();
    time /= 1000*60*60*24; // convert from milliseconds to days
    time |= 0;
    current_tip = time % tips_of_the_day.length;
    $('#tip_of_the_day').html(tips_of_the_day[current_tip]);
});


// This runs after the DOM *and* images have loaded
$(window).load(function() {
    $("#splash_screen").hide();

    backgrounds = ['black.png', 'wood1.jpg', 'wood2.jpg', 'stone1.jpg', 'mosaic1.jpg'];
    var backgroundImages = [];
    for (var i = 0; i < backgrounds.length; ++i) {
        backgroundImages.push(new Image());
        backgroundImages[i].src = "http://go-clock.googlecode.com/svn/trunk/" + backgrounds[i];
    }
    var background = 0;
    var storedBackground = readCookie('goban_background');
    if (storedBackground) {
        background = parseInt(storedBackground);
        background %= backgrounds.length;
    }

    var goClock = new GoClock(document.getElementById('goCanvas'), backgroundImages[background]);
    var storedView = readCookie('goban_view');
    if (storedView) {
        goClock.view = parseInt(storedView);
    }
    $("#goban").click(function() {
        if ($('#about').is(':visible')) {
            $("#about").fadeOut();
            return;
        }
        var top_left = goClock.stonePosition(0, 0, 0);
        var bottom_right = goClock.stonePosition(18, 18, 0);
        if (xmouse < top_left[0] || (xmouse > bottom_right[0] + bottom_right[2]) ||
            ymouse < top_left[1] || (ymouse > bottom_right[1] + bottom_right[3])) {
            background += 1;
            if (background == backgrounds.length) {
                background = 0;
            }
            goClock.setBackground(backgroundImages[background]);
            goClock.draw(window.innerWidth, window.innerHeight - min_bottom_padding);
            createCookie('goban_background', goClock.background, 100);
        }
        else {
            goClock.view += 1;
            goClock.stone_queue = [];
            createCookie('goban_view', goClock.view, 100);
        }
        goClock.update();
    });

    $("#help_icon").click(function() {
        $("#help_icon").fadeOut();
        $("#about").fadeIn();
    });

    $('#next_tip').click(function() {
        current_tip += 1;
        current_tip %= tips_of_the_day.length;
        $('#tip_of_the_day').html(tips_of_the_day[current_tip]);
    });


    window.onresize = function() {goClock.draw(window.innerWidth, window.innerHeight - min_bottom_padding)};
    window.onresize();
    goClock.update();
    goClock.setup = true;
    setInterval(function() {goClock.update()}, 1000);
    setInterval(function() {goClock.transform()}, 20);

    showHelpIcon(10000);
});


