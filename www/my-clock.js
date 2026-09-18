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
const modes = ['12-hour', '24-hour'];
const modeOptionLabels = ['12h', '24h'];
const woods = [
    ['Oak', 'saturate(0.8) hue-rotate(-12deg) sepia(0.5)'],
    ['Kaya', 'saturate(1.3) hue-rotate(-7deg)'],
    ['Bamboo', 'saturate(0.3) contrast(1.4) brightness(1.1) hue-rotate(-6deg)']
];
// The controls fade this long after the last touch; an open setting gets a
// little longer, since its choices are being read rather than glanced at.
const controlsHideDelay = 3600;
const openControlHideDelay = 8000;

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
    // The iOS app injects its own version (ios/GoClock/WebAppView.swift) so the
    // about box matches the App Store listing rather than the web page's number.
    const shellVersion = window.goClockShell?.version;
    if (shellVersion) {
        $('#version').textContent = shellVersion;
    }
    preloadBackgrounds();
});

window.addEventListener('load', () => {
    const goClock = new GoClock();
    let background = readIndex('background', 0, backgrounds.length);
    let stoneSpeed = readIndex('speed', 2, stoneSpeeds.length);
    let view = readIndex('view', 0, views.length);
    let mode = readIndex('mode', 1, modes.length);
    let wood = readIndex('wood', 0, woods.length);
    let placement = readIndex('placement', 1, placements.length);
    let controlsPinned = readSetting('controlsPinned') === '1';

    const toolbar = $('#toolbar');
    const pinControlsButton = $('#pin-controls');
    const pinControlsIcon = $('#pin-controls-icon');
    const aboutButton = $('#about');
    const aboutBox = $('#about_box');
    let controlsHideTimer = null;
    let lastControlWake = 0;
    // The one setting whose choices are showing, if any.
    let openControl = null;

    // A setting control is a chip (`.setting-summary`) that shows the current
    // value and opens the choices beneath it. Returns a setter that marks the
    // chosen option and updates the chip.
    function createSettingControl(name, labels, values, onSelect) {
        const control = $(`#${name}-control`);
        const summary = $('.setting-summary', control);
        const options = $('.setting-options', control);
        const valueLabel = $(`#${name}-value`);

        labels.forEach((label, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'choice-button';
            button.textContent = label;
            button.title = values[index];
            button.dataset.index = String(index);
            button.setAttribute('aria-label', values[index]);
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', (event) => {
                onSelect(index);
                setOpenControl(null);
                // Keyboard users land back on the chip; a pointer is left
                // alone so the controls can still fade.
                if (event.detail === 0) {
                    summary.focus({preventScroll: true});
                }
            });
            options.append(button);
        });

        summary.addEventListener('click', () => {
            setOpenControl(control.dataset.open === 'true' ? null : control);
        });

        return (activeIndex) => {
            valueLabel.textContent = values[activeIndex];
            $$('.choice-button', options).forEach((button) => {
                button.setAttribute('aria-pressed', String(Number(button.dataset.index) === activeIndex));
            });
        };
    }

    function setControlOpen(control, open) {
        control.dataset.open = open ? 'true' : 'false';
        $('.setting-summary', control).setAttribute('aria-expanded', String(open));
        $('.setting-options', control).hidden = !open;
    }

    function setOpenControl(control) {
        if (openControl && openControl !== control) {
            setControlOpen(openControl, false);
        }
        openControl = control;
        if (control) {
            setControlOpen(control, true);
        }
        wakeControls();
    }

    const showView = createSettingControl('face', viewOptionLabels, views, (index) => {
        setView(index);
        goClock.transform();
    });
    const showBackground = createSettingControl('background', backgroundOptionLabels, backgrounds.map(([, name]) => name), setBackground);
    const showWood = createSettingControl('wood', woods.map(([name]) => name), woods.map(([name]) => name), setWood);
    const showSpeed = createSettingControl('speed', speedOptionLabels, stoneSpeeds.map(([name]) => name), setClockSpeed);
    const showPlacement = createSettingControl('placement', placementOptionLabels, placements, setPlacement);
    const showMode = createSettingControl('mode', modeOptionLabels, modes, (index) => {
        setMode(index);
        goClock.transform();
    });

    function setClockSpeed(index) {
        stoneSpeed = index % stoneSpeeds.length;
        goClock.speed = stoneSpeeds[stoneSpeed][1];
        showSpeed(stoneSpeed);
        writeSetting('speed', stoneSpeed);
    }

    function setMode(index) {
        mode = index % modes.length;
        goClock.twenty_four_hour = mode === 1;
        showMode(mode);
        writeSetting('mode', mode);
    }

    function setWood(index) {
        wood = index % woods.length;
        const boardImage = $('#goban img:first-child');
        if (boardImage) {
            boardImage.style.filter = woods[wood][1];
        }
        showWood(wood);
        writeSetting('wood', wood);
    }

    function setPlacement(index) {
        placement = index % placements.length;
        goClock.placement = placement;
        showPlacement(placement);
        writeSetting('placement', placement);
    }

    function setView(index) {
        view = index % views.length;
        goClock.view = view;
        showView(view);
        writeSetting('view', view);
    }

    function setBackground(index) {
        background = index % backgrounds.length;
        $('#goban').style.backgroundImage = `url('images/${backgrounds[background][0]}')`;
        showBackground(background);
        writeSetting('background', background);
    }

    function setGobanState(state) {
        goClock.stones_shown = [...state].map((value) => Number(value));
    }

    function storeGobanState() {
        writeSetting('state', goClock.stones_shown.join(''));
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
        wakeControls();
    }

    function clearControlsFade() {
        if (controlsHideTimer !== null) {
            window.clearTimeout(controlsHideTimer);
            controlsHideTimer = null;
        }
    }

    function scheduleControlsFade() {
        clearControlsFade();
        if (controlsPinned) {
            return;
        }

        controlsHideTimer = window.setTimeout(() => {
            if (toolbar.contains(document.activeElement)) {
                // Someone is tabbing through the controls; try again later.
                scheduleControlsFade();
                return;
            }
            if (openControl) {
                setControlOpen(openControl, false);
                openControl = null;
            }
            toolbar.dataset.visible = 'false';
        }, openControl ? openControlHideDelay : controlsHideDelay);
    }

    function wakeControls() {
        toolbar.dataset.visible = 'true';
        scheduleControlsFade();
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
            aboutButton.setAttribute('aria-expanded', 'false');
            fadeTo(aboutBox, 0, 200);
        }
    }

    function showAbout() {
        aboutButton.setAttribute('aria-expanded', 'true');
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
        aboutButton.setAttribute('aria-expanded', 'false');
        setWood(wood);
    }

    const storedState = readSetting('state');
    if (storedState && storedState.length === 361) {
        setGobanState(storedState);
    }

    setClockSpeed(stoneSpeed);
    setView(view);
    setBackground(background);
    setMode(mode);
    setPlacement(placement);

    $('#goban').addEventListener('click', () => {
        wakeControls();
        goClock.update();
    });
    $('#goban').addEventListener('pointermove', wakeControlsForActivity);
    $('#goban').addEventListener('touchstart', wakeControls, {passive: true});
    toolbar.addEventListener('pointermove', wakeControlsForActivity);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setOpenControl(null);
            hideAbout();
        }
        wakeControlsForActivity();
    });
    $$('#toolbar button').forEach((button) => {
        button.addEventListener('click', wakeControls);
        button.addEventListener('focus', wakeControls);
    });
    $$('.toolbar-actions button').forEach((button) => {
        button.addEventListener('click', () => setOpenControl(null));
    });
    // A tap anywhere outside an open setting closes it; likewise the about box.
    document.addEventListener('click', (event) => {
        if (openControl && !openControl.contains(event.target)) {
            setOpenControl(null);
        }
        if (!aboutBox.hidden && !aboutBox.contains(event.target) && event.target !== aboutButton && !aboutButton.contains(event.target)) {
            hideAbout();
        }
    });

    $('#reset-board').addEventListener('click', () => goClock.resetBoard());
    pinControlsButton.addEventListener('click', () => setControlsPinned(!controlsPinned));
    aboutButton.addEventListener('click', () => {
        if (aboutBox.hidden) {
            showAbout();
        } else {
            hideAbout();
        }
    });

    resizeClock();
    setControlsPinned(controlsPinned);
    wakeControls();
    registerServiceWorker();
    window.addEventListener('resize', resizeClock);
    setInterval(storeGobanState, 10000);
    goClock.transform();
});
