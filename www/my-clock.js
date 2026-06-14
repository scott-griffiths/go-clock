import {GoClock} from './go-clock.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const tipsOfTheDay = [
    'Why not download on the new iPad Pro and then nail or glue it to your living room wall?',
    'To use as an alarm clock simply employ a small child to watch the Go Clock and tell them to wake you when it shows the right time.',
    'For extra accuracy when timing sporting events, use the view with the second counter.',
    'Use The Go Clock on an iPhone sellotaped to your wrist and your friend(s) will think you have an Apple Watch!'
];

const backgrounds = [
    ['wood1.jpg', 'Dark wood'],
    ['wood2.jpg', 'Light wood'],
    ['stone1.jpg', 'Stone'],
    ['mosaic1.jpg', 'Mosaic'],
    ['tatami.jpg', 'Tatami'],
    ['space.jpg', 'Space'],
    ['grass.jpg', 'Grass'],
    ['droplets.jpg', 'Droplets']
];

const views = ['Analogue', 'Jumping hour', 'Digital', 'Hybrid'];
const stoneSpeeds = [['Torpid', 5], ['Slow', 10], ['Normal', 20], ['Fast', 55], ['Insane!', 120]];
const woods = [
    ['Oak', 'saturate(0.8) hue-rotate(-12deg) sepia(0.5)'],
    ['Kaya', 'saturate(1.3) hue-rotate(-7deg)'],
    ['Bamboo', 'saturate(0.3) contrast(1.4) brightness(1.1) hue-rotate(-6deg)']
];

const cookieKeys = new Map([
    ['background', 'goban_background'],
    ['speed', 'stone_speed'],
    ['view', 'goban_view'],
    ['mode', 'mode'],
    ['wood', 'wood'],
    ['sound', 'stone_sound'],
    ['state', 'goban_state'],
    ['usedMenu', 'used_menu']
]);

function isInt(value) {
    return value !== null && value !== '' && Number.isInteger(Number(value));
}

function readCookie(name) {
    const prefix = `${name}=`;
    return document.cookie
        .split(';')
        .map((value) => value.trim())
        .find((value) => value.startsWith(prefix))
        ?.slice(prefix.length) ?? null;
}

function readSetting(key) {
    return localStorage.getItem(`goClock.${key}`) ?? readCookie(cookieKeys.get(key));
}

function writeSetting(key, value) {
    localStorage.setItem(`goClock.${key}`, String(value));
}

function readIndex(key, fallback, length) {
    const stored = readSetting(key);
    return isInt(stored) ? Number(stored) % length : fallback;
}

function animateStyles(element, keyframes, options) {
    if (!element.animate) {
        Object.assign(element.style, keyframes.at(-1));
        options?.onFinish?.();
        return;
    }

    const animation = element.animate(keyframes, {
        duration: 300,
        easing: 'ease',
        fill: 'forwards',
        ...options
    });
    animation.addEventListener('finish', () => {
        Object.assign(element.style, keyframes.at(-1));
        animation.cancel();
        options?.onFinish?.();
    }, {once: true});
}

function fadeTo(element, opacity, duration = 300, onFinish) {
    element.hidden = false;
    animateStyles(element, [{opacity: getComputedStyle(element).opacity}, {opacity}], {
        duration,
        onFinish: () => {
            if (opacity === 0) {
                element.hidden = true;
            }
            onFinish?.();
        }
    });
}

function preloadBackgrounds() {
    backgrounds.forEach(([file]) => {
        const image = new Image();
        image.src = `images/${file}`;
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    $('#tip_of_the_day').textContent = tipsOfTheDay[currentDay % tipsOfTheDay.length];
    preloadBackgrounds();
});

window.addEventListener('load', () => {
    const goClock = new GoClock();
    let background = readIndex('background', 0, backgrounds.length);
    let stoneSpeed = readIndex('speed', 2, stoneSpeeds.length);
    let view = readIndex('view', 0, views.length);
    let mode = readIndex('mode', 1, 2);
    let wood = readIndex('wood', 0, woods.length);
    let sounds = readIndex('sound', 1, 2);

    const sidebar = $('#sidebar');
    const menuButton = $('#menu');
    const aboutBox = $('#about_box');
    const info = $('#info');
    let infoFadeTimer;
    let controlsFadeTimer;

    function setClockSpeed(index) {
        stoneSpeed = index % stoneSpeeds.length;
        goClock.speed = stoneSpeeds[stoneSpeed][1];
        $('#stone_speed').textContent = stoneSpeeds[stoneSpeed][0];
        writeSetting('speed', stoneSpeed);
    }

    function setAudio(index) {
        sounds = index % 2;
        goClock.sounds = sounds;
        $('#stone_sound') && ($('#stone_sound').textContent = sounds ? 'On' : 'Off');
        writeSetting('sound', sounds);
    }

    function setMode(index) {
        mode = index % 2;
        goClock.twenty_four_hour = mode === 1;
        $('#mode').textContent = goClock.twenty_four_hour ? '24-hour' : '12-hour';
        writeSetting('mode', mode);
    }

    function setWood(index) {
        wood = index % woods.length;
        $('#wood').textContent = woods[wood][0];
        const boardImage = $('#goban img:first-child');
        if (boardImage) {
            boardImage.style.filter = woods[wood][1];
        }
        writeSetting('wood', wood);
    }

    function setView(index) {
        view = index % views.length;
        goClock.view = view;
        $('#clock_face').textContent = views[view];
        writeSetting('view', view);
    }

    function setBackground(index) {
        background = index % backgrounds.length;
        $('#goban').style.backgroundImage = `url('images/${backgrounds[background][0]}')`;
        $('#change_background').textContent = backgrounds[background][1];
        writeSetting('background', background);
    }

    function setGobanState(state) {
        goClock.stones_shown = [...state].map((value) => Number(value));
    }

    function storeGobanState() {
        writeSetting('state', goClock.stones_shown.join(''));
    }

    function setInfo(value) {
        info.textContent = value;
        fadeTo(info, 1, 150);
        clearTimeout(infoFadeTimer);
        infoFadeTimer = setTimeout(() => fadeTo(info, 0, 300), 2000);
    }

    function setMenuOpen(open) {
        sidebar.dataset.open = open ? 'true' : 'false';
        menuButton.setAttribute('aria-expanded', String(open));
    }

    function wakeControls() {
        $$('.button').forEach((button) => {
            button.hidden = false;
            fadeTo(button, button.id === 'menu' ? 1 : 0.96, 250);
        });
        clearTimeout(controlsFadeTimer);
        controlsFadeTimer = setTimeout(() => {
            fadeTo(menuButton, 0.4, 600);
            ['#change-background', '#change-speed', '#change-face'].forEach((selector) => fadeTo($(selector), 0, 600));
        }, 8000);
    }

    function hideAbout() {
        fadeTo(aboutBox, 0, 200);
    }

    function showAbout() {
        const wholeWidth = window.innerWidth;
        const gobanWidth = parseInt(getComputedStyle($('#goban img')).width, 10);
        let border = (wholeWidth - gobanWidth) / 1.95;
        if (border > gobanWidth / 4) {
            border = gobanWidth / 4;
        }

        Object.assign(aboutBox.style, {
            left: `${border}px`,
            right: `${border}px`,
            width: 'auto',
            top: '-500px',
            opacity: '0'
        });
        aboutBox.hidden = false;
        animateStyles(aboutBox, [{top: '-500px', opacity: 0}, {top: '5%', opacity: 1}], {
            duration: 900,
            easing: 'ease-out'
        });
    }

    function resizeClock() {
        goClock.draw(window.innerWidth, window.innerHeight);
        aboutBox.hidden = true;

        if (window.innerWidth > window.innerHeight) {
            Object.assign($('#change-face').style, {top: '70px', left: '0px'});
            Object.assign($('#change-background').style, {top: '140px', left: '0px'});
            Object.assign($('#change-speed').style, {top: '210px', left: '0px'});
            Object.assign(info.style, {top: '13px', left: '70px'});
        } else {
            Object.assign($('#change-face').style, {left: '70px', top: '0px'});
            Object.assign($('#change-background').style, {left: '140px', top: '0px'});
            Object.assign($('#change-speed').style, {left: '210px', top: '0px'});
            Object.assign(info.style, {top: '70px', left: '13px'});
        }
        setWood(wood);
    }

    function showFirstRunHints() {
        if (isInt(readSetting('usedMenu'))) {
            $('#sb-site').style.filter = 'grayscale(0) brightness(1)';
            return;
        }

        const welcome = $('#welcome_box');
        welcome.hidden = false;
        animateStyles(welcome, [{opacity: 0}, {opacity: 1}], {duration: 800});
        animateStyles(welcome, [{transform: 'translateY(0)', opacity: 1}, {transform: 'translateY(-50px)', opacity: 0}], {
            duration: 1000,
            delay: 2000,
            onFinish: () => {
                welcome.hidden = true;
            }
        });
        setTimeout(() => {
            $('#sb-site').style.filter = 'grayscale(0) brightness(1)';
        }, 2000);
        animateStyles($('#look_here'), [{top: '-80px'}, {top: '18px'}], {
            duration: 900,
            delay: 3000,
            easing: 'cubic-bezier(.34,1.56,.64,1)'
        });
        animateStyles($('#look_here'), [{top: '18px', opacity: 1}, {top: '-70px', opacity: 0}], {
            duration: 500,
            delay: 9000
        });
    }

    const storedState = readSetting('state');
    if (storedState && storedState.length === 361) {
        setGobanState(storedState);
    }

    setClockSpeed(stoneSpeed);
    setView(view);
    setBackground(background);
    setMode(mode);
    setAudio(sounds);

    $('#goban').addEventListener('click', () => {
        hideAbout();
        wakeControls();
        goClock.update();
    });
    $$('.button').forEach((button) => {
        button.addEventListener('click', hideAbout);
        button.addEventListener('click', wakeControls);
    });

    menuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        writeSetting('usedMenu', 1);
        setMenuOpen(sidebar.dataset.open !== 'true');
    });
    document.addEventListener('click', (event) => {
        if (sidebar.dataset.open === 'true' && !sidebar.contains(event.target) && event.target !== menuButton) {
            setMenuOpen(false);
        }
    });

    $('#change-face').addEventListener('click', () => {
        setView(view + 1);
        setInfo(`Face: ${views[view]}`);
        goClock.transform();
    });
    $('#clock_face').closest('li').addEventListener('pointerdown', () => {
        setView(view + 1);
        goClock.transform();
    });
    $('#mode').closest('li').addEventListener('pointerdown', () => {
        setMode(goClock.twenty_four_hour ? 0 : 1);
        goClock.transform();
    });
    $('#wood').closest('li').addEventListener('pointerdown', () => setWood(wood + 1));
    $('#change-background').addEventListener('click', () => {
        setBackground(background + 1);
        setInfo(`Background: ${backgrounds[background][1]}`);
    });
    $('#change_background').closest('li').addEventListener('pointerdown', () => setBackground(background + 1));
    $('#change-speed').addEventListener('click', () => {
        setClockSpeed(stoneSpeed + 1);
        setInfo(`Stone speed: ${stoneSpeeds[stoneSpeed][0]}`);
    });
    $('#stone_speed').closest('li').addEventListener('pointerdown', () => setClockSpeed(stoneSpeed + 1));
    $('#stone_sound')?.closest('li')?.addEventListener('pointerdown', () => setAudio(1 - sounds));
    $('#about').closest('li').addEventListener('pointerdown', () => {
        setMenuOpen(false);
        showAbout();
    });

    setMenuOpen(false);
    resizeClock();
    showFirstRunHints();
    wakeControls();
    window.addEventListener('resize', resizeClock);
    setInterval(storeGobanState, 10000);
    goClock.transform();
});
