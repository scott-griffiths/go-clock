import {GoClock} from './go-clock.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const tipsOfTheDay = [
    'Why not download on an iPad and then nail or glue it to your living room wall?',
    'To use as an alarm clock simply employ a small child to watch the Go Clock and tell them to wake you when it shows the right time.',
    'For extra accuracy when timing sporting events, use the view with the second counter.',
    'Use The Go Clock on an iPhone sellotaped to your wrist and your friend(s) will think you have an Apple Watch!',
    'For best results, stare at the board until the time becomes obvious.',
    'If the stones are moving too slowly, try waiting for longer.',

];

const backgrounds = [
    ['wood1.jpg', 'Dark wood'],
    ['wood2.jpg', 'Light wood'],
    ['stone1.jpg', 'Stone'],
    ['mosaic1.jpg', 'Mosaic'],
    ['grass.jpg', 'Grass'],
    ['droplets.jpg', 'Droplets']
];

const views = ['Analogue', 'Jumping hour', 'Digital', 'Hybrid'];
const viewOptionLabels = ['Analogue', 'Jump', 'Digital', 'Hybrid'];
const backgroundOptionLabels = ['Dark', 'Light', 'Stone', 'Mosaic', 'Grass', 'Drops'];
const stoneSpeeds = [['Torpid', 5], ['Slow', 10], ['Normal', 20], ['Fast', 55], ['Insane!', 120]];
const speedOptionLabels = ['Torpid', 'Slow', 'Normal', 'Fast', 'Insane'];
const placements = ['Exact', 'Organic', 'Careless', 'Haphazard'];
const placementOptionLabels = ['Exact', 'Organic', 'Careless', 'Meh'];
const controlsHideDelay = 3600;
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
    ['placement', 'placement'],
    ['controlsPinned', 'controls_pinned'],
    ['state', 'goban_state']
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
    try {
        return localStorage.getItem(`goClock.${key}`) ?? readCookie(cookieKeys.get(key));
    } catch {
        return readCookie(cookieKeys.get(key));
    }
}

function writeSetting(key, value) {
    try {
        localStorage.setItem(`goClock.${key}`, String(value));
    } catch {
        // Preferences are non-critical; keep the clock running if storage is blocked.
    }
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

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.register('./service-worker.js', {scope: './'})
        .catch((error) => {
            console.info('Service worker registration failed', error);
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
    let placement = readIndex('placement', 1, placements.length);
    let controlsPinned = readSetting('controlsPinned') === '1';

    const sidebar = $('#sidebar');
    const toolbar = $('#toolbar');
    const menuButton = $('#menu');
    const pinControlsButton = $('#pin-controls');
    const pinControlsIcon = $('#pin-controls-icon');
    const aboutBox = $('#about_box');
    let controlsHideTimer = null;
    let lastControlWake = 0;

    function setActiveOption(containerSelector, activeIndex) {
        $$('.choice-button', $(containerSelector)).forEach((button) => {
            const isActive = Number(button.dataset.index) === activeIndex;
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    function createOptionButtons(containerSelector, labels, values, onSelect) {
        const container = $(containerSelector);
        labels.forEach((label, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'choice-button';
            button.textContent = label;
            button.title = values[index];
            button.dataset.index = String(index);
            button.setAttribute('aria-label', values[index]);
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', () => onSelect(index));
            container.append(button);
        });
    }

    function setClockSpeed(index) {
        stoneSpeed = index % stoneSpeeds.length;
        const value = stoneSpeeds[stoneSpeed][0];
        goClock.speed = stoneSpeeds[stoneSpeed][1];
        $('#speed-control').setAttribute('aria-label', `Stone speed, current ${value}`);
        setActiveOption('#speed-options', stoneSpeed);
        writeSetting('speed', stoneSpeed);
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

    function setPlacement(index) {
        placement = index % placements.length;
        const value = placements[placement];
        goClock.placement = placement;
        $('#placement-control').setAttribute('aria-label', `Precision, current ${value}`);
        setActiveOption('#placement-options', placement);
        writeSetting('placement', placement);
    }

    function setView(index) {
        view = index % views.length;
        const value = views[view];
        goClock.view = view;
        $('#face-control').setAttribute('aria-label', `Clock face, current ${value}`);
        setActiveOption('#face-options', view);
        writeSetting('view', view);
    }

    function setBackground(index) {
        background = index % backgrounds.length;
        const value = backgrounds[background][1];
        $('#goban').style.backgroundImage = `url('images/${backgrounds[background][0]}')`;
        $('#background-control').setAttribute('aria-label', `Background, current ${value}`);
        setActiveOption('#background-options', background);
        writeSetting('background', background);
    }

    function setGobanState(state) {
        goClock.stones_shown = [...state].map((value) => Number(value));
    }

    function storeGobanState() {
        writeSetting('state', goClock.stones_shown.join(''));
    }

    function setMenuOpen(open) {
        const isOpen = Boolean(open);
        const action = isOpen ? 'Hide sidebar' : 'Show sidebar';
        sidebar.dataset.open = isOpen ? 'true' : 'false';
        menuButton.setAttribute('aria-expanded', String(isOpen));
        menuButton.setAttribute('aria-label', action);
        menuButton.title = action;
        wakeControls({hold: isOpen});
    }

    function setControlsPinned(pinned) {
        controlsPinned = Boolean(pinned);
        const action = controlsPinned ? 'Unpin controls' : 'Pin controls';
        toolbar.dataset.pinned = controlsPinned ? 'true' : 'false';
        pinControlsIcon.textContent = controlsPinned ? '📌' : '📍';
        pinControlsButton.setAttribute('aria-label', action);
        pinControlsButton.setAttribute('aria-pressed', String(controlsPinned));
        pinControlsButton.title = action;
        writeSetting('controlsPinned', controlsPinned ? 1 : 0);
        wakeControls({hold: controlsPinned || sidebar.dataset.open === 'true'});
    }

    function clearControlsFade() {
        if (controlsHideTimer !== null) {
            window.clearTimeout(controlsHideTimer);
            controlsHideTimer = null;
        }
    }

    function scheduleControlsFade() {
        clearControlsFade();
        if (controlsPinned || sidebar.dataset.open === 'true') {
            return;
        }

        controlsHideTimer = window.setTimeout(() => {
            if (sidebar.dataset.open !== 'true' && !toolbar.contains(document.activeElement)) {
                toolbar.dataset.visible = 'false';
            }
        }, controlsHideDelay);
    }

    function wakeControls({hold = false} = {}) {
        toolbar.dataset.visible = 'true';
        clearControlsFade();
        if (!hold) {
            scheduleControlsFade();
        }
    }

    function wakeControlsForActivity() {
        const now = Date.now();
        if (toolbar.dataset.visible !== 'true' || now - lastControlWake > 250) {
            lastControlWake = now;
            wakeControls();
        }
    }

    function hideAbout() {
        if (!aboutBox.hidden) {
            fadeTo(aboutBox, 0, 200);
        }
    }

    function showAbout() {
        Object.assign(aboutBox.style, {
            opacity: '0',
            transform: 'translate(-50%, -12px)'
        });
        aboutBox.hidden = false;
        animateStyles(aboutBox, [
            {opacity: 0, transform: 'translate(-50%, -12px)'},
            {opacity: 1, transform: 'translate(-50%, 0)'}
        ], {
            duration: 900,
            easing: 'ease-out'
        });
    }

    function resizeClock() {
        goClock.draw(window.innerWidth, window.innerHeight);
        aboutBox.hidden = true;
        setWood(wood);
    }

    const storedState = readSetting('state');
    if (storedState && storedState.length === 361) {
        setGobanState(storedState);
    }

    createOptionButtons('#face-options', viewOptionLabels, views, (index) => {
        setView(index);
        goClock.transform();
    });
    createOptionButtons('#background-options', backgroundOptionLabels, backgrounds.map(([, name]) => name), setBackground);
    createOptionButtons('#speed-options', speedOptionLabels, stoneSpeeds.map(([name]) => name), setClockSpeed);
    createOptionButtons('#placement-options', placementOptionLabels, placements, setPlacement);

    setClockSpeed(stoneSpeed);
    setView(view);
    setBackground(background);
    setMode(mode);
    setPlacement(placement);

    $('#goban').addEventListener('click', () => {
        hideAbout();
        wakeControls();
        goClock.update();
    });
    $('#goban').addEventListener('pointermove', wakeControlsForActivity);
    $('#goban').addEventListener('touchstart', wakeControls, {passive: true});
    document.addEventListener('keydown', wakeControlsForActivity);
    $$('#toolbar button, #sidebar button').forEach((button) => {
        button.addEventListener('click', hideAbout);
        button.addEventListener('click', wakeControls);
        button.addEventListener('focus', wakeControls);
    });

    menuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        setMenuOpen(sidebar.dataset.open !== 'true');
    });
    $('#reset-board').addEventListener('click', () => {
        setMenuOpen(false);
        goClock.resetBoard();
    });
    pinControlsButton.addEventListener('click', () => setControlsPinned(!controlsPinned));
    document.addEventListener('click', (event) => {
        if (sidebar.dataset.open === 'true' && !sidebar.contains(event.target) && event.target !== menuButton) {
            setMenuOpen(false);
        }
    });

    $('#setting-mode').addEventListener('click', () => {
        setMode(goClock.twenty_four_hour ? 0 : 1);
        goClock.transform();
    });
    $('#setting-wood').addEventListener('click', () => setWood(wood + 1));
    $('#about').addEventListener('click', () => {
        setMenuOpen(false);
        showAbout();
    });

    setMenuOpen(false);
    resizeClock();
    setControlsPinned(controlsPinned);
    wakeControls();
    registerServiceWorker();
    window.addEventListener('resize', resizeClock);
    setInterval(storeGobanState, 10000);
    goClock.transform();
});
