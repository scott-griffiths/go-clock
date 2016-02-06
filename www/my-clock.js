
var xmouse;
var ymouse;
/*
$().mousemove(function(e) {
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
    console.log(xmouse + " : " + ymouse);
};*/

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
tips_of_the_day.push("Why not download on the new iPad Pro and then nail or glue it to your living room wall?");
tips_of_the_day.push("To use as an alarm clock simply employ a small child to watch the Go Clock and tell them to wake you when it shows the right time.");
tips_of_the_day.push("For extra accuracy when timing sporting events, use the view with the second counter.");
tips_of_the_day.push("Use The Go Clock on an iPhone sellotaped to your wrist and your friend(s) will think you have an Apple Watch!");

var backgrounds = [['wood1.jpg', "Dark wood"], ['wood2.jpg', "Light wood"], ['stone1.jpg', "Stone"],
                   ['mosaic1.jpg', "Mosaic"], ['tatami.jpg', "Tatami"], ['space.jpg', "Space"], ['grass.jpg', "Grass"], ['droplets.jpg', 'Droplets']];

var backgroundImages = [];

var views = {0 : 'Analogue', 1 : 'Jumping hour', 2 : 'Digital', 3 : 'Hybrid'};

var stone_speeds = [['Torpid', 5], ['Slow', 10], ['Normal', 20], ['Fast', 55], ['Insane!', 120]];

var woods = [['Oak', 'saturate(0.8) hue-rotate(-12deg) sepia(0.5)'],
             ['Kaya', 'saturate(1.3) hue-rotate(-7deg)'],
             ['Bamboo', 'saturate(0.3) contrast(1.4) brightness(1.1) hue-rotate(-6deg)']];

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

    $(document.body).click(function(evt){
  var clicked = evt.target;
  var currentID = clicked.id || "No ID!";
//  alert(currentID);
})
/*    $().mousemove(function(e){
        xmouse = e.pageX;
        ymouse = e.pageY;
        console.log(xmouse + " : " + ymouse);
    });*/
    var drawEmpty = false;
    if (drawEmpty) {
        // Draw empty board
        var goClock = new GoClock(document.getElementById('goCanvasOverlay'), document.getElementById('goCanvasMain'));
        setBackground(0);
        goClock.draw(window.innerWidth, window.innerHeight);
        $('body').css('-webkit-filter', 'grayscale(0.7) brightness(1.1)');
    }

    var mySlidebars = new $.slidebars();

    $('#menu').fadeIn();
    var background = 0;
    var storedBackground = readCookie('goban_background');
    if (isInt(storedBackground)) {
        background = parseInt(storedBackground) % backgrounds.length;
    }
    var goClock = new GoClock(document.getElementById('goCanvasOverlay'), document.getElementById('goCanvasMain'));
    setBackground(background);
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

    var mode = 0;
    var storedMode = readCookie('mode');
    if (isInt(storedMode)) {
        mode = parseInt(storedMode) % 2;
    }

    var wood = 0;
    var storedWood = readCookie('wood');
    if (isInt(storedWood)) {
        wood = parseInt(storedWood) % woods.length;
    }

    var sounds = 0;
    var storedSound = readCookie('stone_sound');
    if (isInt(storedSound)) {
        setAudio(parseInt(storedSound));
    } else {
        setAudio(1);
    }

    function setClockSpeed(s) {
        s %= stone_speeds.length;
        goClock.speed = stone_speeds[s][1];
        $('#stone_speed').text(stone_speeds[s][0]);
        createCookie('stone_speed', s, 100);
    }

    function setAudio(a) {
        sounds = a;
        goClock.sounds = a;
        $('#stone_sound').text(a ? 'On' : 'Off');
        createCookie('stone_sound', a ? '1' : '0');
    }

    function setMode(m) {
        goClock.twenty_four_hour = (m == 1);
        $('#mode').text(goClock.twenty_four_hour ? "24-hour" : "12-hour");
        createCookie('mode', m, 100);
    }

    function setWood(w) {
        w %= woods.length;
        $('#wood').text(woods[w][0]);
        $('#goban img:first').css('-webkit-filter', woods[w][1]);
        createCookie('wood', w, 100);
    }

    function setView(v) {
        v %= 4;
        goClock.view = v;
        $('#clock_face').text(views[v]);
        createCookie('goban_view', goClock.view, 100);
    }

    function setBackground(b) {
        b %= backgrounds.length;
        $('#goban').css('background-image', "url('images/" + backgrounds[b][0] + "')");
        $('#goban').css('background-size', 'cover');
        $('#change_background').text(backgrounds[b][1]);
        createCookie('goban_background', b, 100);
    }

    function setGobanState(s) {
        var stones = [];
        for (var x = 0; x < s.length; ++x) {
            stones.push(parseInt(s[x]));
        }
        goClock.stones_shown = stones;
    }

    var storeGobanState = function() {
        var s = "";
        for (var x = 0; x < 361; ++x) {
            s += goClock.stones_shown[x];
        }
        createCookie('goban_state', s, 100);
    }
    var storedState = readCookie('goban_state');
    if (storedState && storedState.length == 361) {
        setGobanState(storedState);
    }

    setClockSpeed(stone_speed);
    setView(view);
    setBackground(background);
    setMode(mode);

    var info_fade_timer;
    function setInfo(val) {
        $('#info').text(val);
        $('#info').fadeIn();
        clearTimeout(info_fade_timer);
        info_fade_timer = setTimeout(function() {$('#info').fadeOut();}, 2000);
    }

    var fade_menu_timer;
    $('#about_box, #goban').click(function() {
        TweenMax.to('#about_box', 1, {
            top: -500,
            force3D: true,
            opactity: 0.0,
            ease: Power2.easeIn
        });


    });
    $("#goban, #menu").click(function() {
        $('#menu').fadeTo('slow', 1.0);
        clearTimeout(fade_menu_timer);
        fade_menu_timer = setTimeout(function() {
            $('#menu').fadeTo('slow', 0.4);
        }, 2000);
        goClock.update();
    });
    // Rather convoluted method of getting clicks on the goban
    var can_change_goban = true;
    $(document).on('click', ':not(#goban)', function(e){
        if (can_change_goban) {
            can_change_goban = false;
            setTimeout(function() {can_change_goban = true;}, 500);
            if (e.target.id !== 'goban') { // Yes, I do mean not equal to - long story.
                if (!mySlidebars.slidebars.active('left')) {
                    // Clicked on the goban when sidebar not active
                    setView(goClock.view + 1);
                    setInfo(views[goClock.view]);
                }
                goClock.update();
            }
        }
    });

    $('#clock_face').closest('li').mousedown(function() {
        setView(goClock.view + 1);
    });
    $('#mode').closest('li').mousedown(function() {
        setMode(goClock.twenty_four_hour ? 0 : 1);
    });
    $('#wood').closest('li').mousedown(function() {
        wood += 1;
        setWood(wood);
    });
    $('#change_background').closest('li').mousedown(function() {
        background += 1;
        setBackground(background);
    });
    $('#stone_speed').closest('li').mousedown(function() {
        stone_speed += 1;
        setClockSpeed(stone_speed);
    });
    $('#stone_sound').closest('li').mousedown(function() {
        sounds = 1 - sounds;
        setAudio(sounds);
    });

    $('#about').closest('li').mousedown(function() {
        var whole_width = $(window).width();
        var goban_width = $('#goban img').css('width');
        var border = ((parseInt(whole_width) - parseInt(goban_width)) / 1.95).toString() + 'px';
        $('#about_box').css({
            'left': border,
            'right': border,
            'width': 'auto',
        });
        TweenMax.fromTo('#about_box', 1, {
            top: -500,
            opacity: 0.0,
        }, {
            top: "5%",
            opacity: 1.0,
            ease: Power2.easeOut
        })
    });

    $('#menu').click(function(){
        // Don't show the startup arrow for a while
        createCookie('used_menu', 1, 1); // Lasts for a day
    });

    var usedMenu = readCookie('used_menu');
    //if (isInt(usedMenu) === false)
    {
        TweenMax.fromTo('#welcome_box', 0.8, {
            force3D: true,
            opacity: 0.0
        }, {
            force3D: true,
            opacity: 1.0
        });
        TweenMax.to('#welcome_box', 1, {
            y: -50,
            force3D: true,
            opacity: 0.0,
            delay: 2
        });
        TweenMax.to('#sb-site', 1, {

        });
        setTimeout(function() {
            $('#sb-site').css('-webkit-filter', 'grayscale(0.0) brightness(1.0)');
        }, 2000)
        TweenMax.to('#look_here', 1, {
            top: 18,
            delay: 3,
            force3D: true,
            ease: Bounce.easeOut
        });
        TweenMax.to('#look_here', 0.5, {
            top: -70,
            force3D: true,
            opacity: 0.0,
            delay: 9
        });
        TweenMax.to('#look_here2', 1, {
            top: 80,
            delay: 6,
            force3D: true,
            ease: Bounce.easeOut
        });
        TweenMax.to('#look_here2', 0.5, {
            top: -70,
            force3D: true,
            opacity: 0.0,
            delay: 10
        });
    }

    fade_menu_timer = setTimeout(function() {
        $('#menu').fadeTo('slow', 0.4);
    }, 5000);


    window.onresize = function() {
        goClock.draw(window.innerWidth, window.innerHeight);
    };
    window.onresize();
    setWood(wood);
    setInterval(storeGobanState, 2000);
    goClock.transform();
    setInterval(function() {goClock.transform()}, 1000);

});


