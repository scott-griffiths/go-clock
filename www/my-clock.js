
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

function isInt(value) {
  var x = parseFloat(value);
  return !isNaN(value) && (x | 0) === x;
}

function createCookie(name, value, days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime() + (days*24*60*60*1000));
		var expires = "; expires=" + date.toGMTString();
	}
	else expires = "";
	document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name, "", -1);
}

var tips_of_the_day = [];
tips_of_the_day.push("Why not download as a web app on the new iPad Air 2 and then nail or glue it to your living room wall?");
tips_of_the_day.push("To use as an alarm clock simply employ a small child to watch the Go Clock and tell them to wake you when it shows the right time.");
tips_of_the_day.push("For extra accuracy when timing sporting events, use the view with the second counter.");
tips_of_the_day.push("Use the Go Clock on an iPhone sellotaped to your wrist and your friend(s) will think you have an Apple Watch!");
var current_tip;

var backgrounds = [['wood1.jpg', "Dark wood"], ['wood2.jpg', "Light wood"], ['stone1.jpg', "Stone"], ['mosaic1.jpg', "Mosaic"], ['tatami.jpg', "Tatami"]];
var backgroundImages = [];

var views = {0 : 'Analogue', 1 : 'Jumping hour', 2 : 'Digital', 3 : 'Hybrid'};

var stone_speeds = [['Torpid', 2], ['Slow', 5], ['Normal', 9], ['Fast', 18], ['Insane!', 50]];

$(document).ready(function(){
    var now = new Date();
    var time = now.getTime();
    time /= 1000*60*60*24; // convert from milliseconds to days
    time |= 0;
    var current_tip = time % tips_of_the_day.length;
    $('#tip_of_the_day').html(tips_of_the_day[current_tip]);
    for (var i = 0; i < backgrounds.length; ++i) {
        backgroundImages.push(new Image());
        backgroundImages[i].src = 'images/' + backgrounds[i][0];
    }
});

// This runs after the DOM *and* images have loaded
$(window).load(function() {
    var mySlidebars = new $.slidebars();
    $('#menu').fadeIn();
    var background = 0;
    var storedBackground = readCookie('goban_background');
    if (isInt(storedBackground)) {
        background = parseInt(storedBackground) % backgrounds.length;
    }
    var goClock = new GoClock(document.getElementById('goCanvas'), backgroundImages[background]);

    var stone_speed = 2;
    var storedSpeed = readCookie('stone_speed');
    if (isInt(storedSpeed)) {
        stone_speed = parseInt(storedSpeed) % stone_speeds.length;
    }

    var view = 0;
    var storedView = readCookie('goban_view');
    if (isInt(storedView)) {
        view = parseInt(storedView) % 4;
    }

    function setClockSpeed(s) {
        s %= stone_speeds.length;
        goClock.speed = stone_speeds[s][1];
        $('#stone_speed').text(stone_speeds[s][0]);
        createCookie('stone_speed', goClock.speed, 100);
    }

    function setView(v) {
        v %= 4;
        goClock.view = v;
        $('#clock_face').text(views[v]);
        createCookie('goban_view', goClock.view, 100);
    }

    function setBackground(b) {
        b %= backgrounds.length;
        goClock.backgroundImage = backgroundImages[b];
        goClock.draw(window.innerWidth, window.innerHeight - min_bottom_padding);
        $('#change_background').text(backgrounds[b][1]);
        createCookie('goban_background', goClock.background, 100);
    }

    setClockSpeed(stone_speed);
    setView(view);
    setBackground(background);

    var fade_menu_timer;
    $('#about_box, #goban').click(function() {
        if ($('#about_box').is(':visible')) {
            $("#about_box").fadeOut();
        }
    });
    $("#goban").click(function() {
//        $('#menu').fadeIn();
//        clearTimeout(fade_menu_timer);
//        fade_menu_timer = setTimeout(function() {
//            $('#menu').fadeOut();
//        }, 3000);
        var top_left = goClock.stonePosition(0, 0, 0);
        var bottom_right = goClock.stonePosition(18, 18, 0);
        if (xmouse < top_left[0] || (xmouse > bottom_right[0] + bottom_right[2]) ||
            ymouse < top_left[1] || (ymouse > bottom_right[1] + bottom_right[3])) {
            // Click not on the goban
        }
        else if (!mySlidebars.slidebars.active('left')) {
            // Clicked on the goban when sidebar not active
            setView(goClock.view + 1);
            goClock.stone_queue = [];
        }
        goClock.update();
    });

    $('#clock_face').closest('a').click(function() {
        setView(goClock.view + 1);
    });

    $('#change_background').closest('a').click(function() {
        background += 1;
        setBackground(background);
    });
    $('#stone_speed').closest('a').click(function() {
        stone_speed += 1;
        setClockSpeed(stone_speed);
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


