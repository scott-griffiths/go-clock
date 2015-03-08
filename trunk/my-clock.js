
var xmouse;
var ymouse;

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

var tips_of_the_day = [];
tips_of_the_day.push("Why not download as a web app on the new iPad Air and then nail or glue it to your living room wall?");
tips_of_the_day.push("To use as an alarm clock simply employ a small child to watch the Go Clock and tell them to wake you when it shows the right time.");
tips_of_the_day.push("For extra accuracy when timing sporting events, use the view with the second counter.");
tips_of_the_day.push("Use the Go Clock on an iPhone sellotaped to your wrist and your friend(s) will think you have an iWatch!");
tips_of_the_day.push("If you need more than one clock, why not also try the <a href='https://itunes.apple.com/gb/app/shogi-clock/id538427388?mt=8'>Shogi Clock</a> on the iPad? (I didn't write that one, but I think it's really cool.)");

var current_tip;


var backgrounds = ['wood1.jpg', 'wood2.jpg', 'stone1.jpg', 'mosaic1.jpg'];
var backgroundImages = [];

$(document).ready(function(){
    var now = new Date();
    var time = now.getTime();
    time /= 1000*60*60*24; // convert from milliseconds to days
    time |= 0;
    var current_tip = time % tips_of_the_day.length;
    $('#tip_of_the_day').html(tips_of_the_day[current_tip]);
    $.slidebars();
    for (var i = 0; i < backgrounds.length; ++i) {
        backgroundImages.push(new Image());
        backgroundImages[i].src = 'images/' + backgrounds[i];
    }
});

// This runs after the DOM *and* images have loaded
$(window).load(function() {
    setTimeout(function() {
        $('#menu').fadeIn();
    }, 3000);
    var background = 0;
    var storedBackground = readCookie('goban_background');
    if (storedBackground) {
        background = parseInt(storedBackground);
        background %= backgrounds.length;
    }
    if (background === parseInt(background, 10)) {
    } else {
        background = 0;
    }


    var goClock = new GoClock(document.getElementById('goCanvas'), backgroundImages[background]);
    var storedView = readCookie('goban_view');
    if (storedView) {
        goClock.view = parseInt(storedView);
    }
    var fade_menu_timer;
    $("#goban").click(function() {
        if ($('#about_box').is(':visible')) {
            $("#about_box").fadeOut();
            return;
        }
        $('#menu').fadeIn();
        clearTimeout(fade_menu_timer);
        fade_menu_timer = setTimeout(function() {
            $('#menu').fadeOut();
        }, 3000);
        var top_left = goClock.stonePosition(0, 0, 0);
        var bottom_right = goClock.stonePosition(18, 18, 0);
        if (xmouse < top_left[0] || (xmouse > bottom_right[0] + bottom_right[2]) ||
            ymouse < top_left[1] || (ymouse > bottom_right[1] + bottom_right[3])) {
            // Click not on the goban
        }
        else {
            goClock.view += 1;
            goClock.stone_queue = [];
            createCookie('goban_view', goClock.view, 100);
        }
        goClock.update();
    });

    $('#next_tip').click(function() {
        current_tip += 1;
        current_tip %= tips_of_the_day.length;
        $('#tip_of_the_day').html(tips_of_the_day[current_tip]);
    });

    $('#change_background').click(function() {
        background += 1;
        if (background == backgrounds.length) {
            background = 0;
        }
        goClock.backgroundImage = backgroundImages[background];
        goClock.draw(window.innerWidth, window.innerHeight - min_bottom_padding);
        createCookie('goban_background', goClock.background, 100);
    });
    $('#about').click(function() {
        $('#about_box').show();
    });


    window.onresize = function() {goClock.draw(window.innerWidth, window.innerHeight - min_bottom_padding)};
    window.onresize();
    goClock.update();
    goClock.setup = true;
    setInterval(function() {goClock.update()}, 1000);
    setInterval(function() {goClock.transform()}, 20);
});


