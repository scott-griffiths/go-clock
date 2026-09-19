import {GoClock} from './go-clock.js';
import {Sounds} from './sounds.js';

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

// File, name, and how much the table drags on a stone skidding across it,
// relative to wood: stones stop short in grass and slide on wet glass. In
// space there is no table, and a stone over the edge falls away.
const backgrounds = [
    ['wood1.jpg', 'Dark wood', 1],
    ['wood2.jpg', 'Light wood', 1],
    ['stone1.jpg', 'Stone', 1],
    ['mosaic1.jpg', 'Mosaic', 1],
    ['grass.jpg', 'Grass', 4],
    ['droplets.jpg', 'Droplets', 0.35],
    ['space.jpg', 'Space', 1, 'void']
];

const views = ['Analogue', 'Jumping hour', 'Digital', 'Hybrid'];
const stoneSpeeds = [['Torpid', 5], ['Slow', 10], ['Normal', 20], ['Fast', 55], ['Insane!', 120]];
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
// A drag at least this far (in CSS pixels) is a swipe rather than a tap.
const swipeDistance = 48;
// A finger held on the board this long, moving less than this far, is the
// hand: a drag from then on pushes the stones about rather than swiping.
const holdDelay = 250;
const holdTolerance = 10;

const cookieKeys = new Map([
    ['background', 'goban_background'],
    ['speed', 'stone_speed'],
    ['view', 'goban_view'],
    ['mode', 'mode'],
    ['wood', 'wood'],
    ['placement', 'placement'],
    ['sound', 'sound'],
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

function wrap(index, length) {
    return ((index % length) + length) % length;
}

function readIndex(key, fallback, length) {
    const stored = readSetting(key);
    return isInt(stored) ? wrap(Number(stored), length) : fallback;
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

// A tap of feedback under the finger, where there is something to give it:
// the iOS shell (ios/GoClock/WebAppView.swift) answers `goClockHaptic`
// messages with the taptic engine; elsewhere, a phone that can vibrate does.
// 'grab' is the hand landing; 'tick' a stone going over the edge, of which
// a good shove makes several at once, so those are thinned out.
let lastTick = 0;
function haptic(kind) {
    if (kind === 'tick') {
        const now = performance.now();
        if (now - lastTick < 60) {
            return;
        }
        lastTick = now;
    }
    try {
        const handler = window.webkit?.messageHandlers?.goClockHaptic;
        if (handler) {
            handler.postMessage(kind);
        } else {
            navigator.vibrate?.(kind === 'grab' ? 15 : 5);
        }
    } catch {
        // No feedback to give.
    }
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
    // Sound is on unless it has been muted.
    let sound = readIndex('sound', 1, 2);
    const sounds = new Sounds();

    const goban = $('#goban');
    const toolbar = $('#toolbar');
    const speedSlider = $('#speed-slider');
    const settingsButton = $('#settings');
    const muteButton = $('#mute');
    const muteIcon = $('#mute-icon');
    const settingsMenu = $('#settings-menu');
    const boardHint = $('#board-hint');
    const backgroundHint = $('#background-hint');
    const swipeToast = $('#swipe-toast');
    const aboutButton = $('#about');
    const aboutBox = $('#about_box');
    let controlsHideTimer = null;
    let lastControlWake = 0;
    let swipeToastTimer = null;
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

    function setSettingsOpen(open) {
        settingsMenu.hidden = !open;
        settingsButton.setAttribute('aria-expanded', String(open));
        if (!open) {
            setOpenControl(null);
        }
        wakeControls();
    }

    // What a swipe just chose, in the chip's dress, at the top for a moment.
    function showSwipeToast(icon, value) {
        $('#swipe-toast-icon').textContent = icon;
        $('#swipe-toast-value').textContent = value;
        window.clearTimeout(swipeToastTimer);
        swipeToast.getAnimations?.().forEach((animation) => animation.cancel());
        swipeToast.style.opacity = '1';
        swipeToast.hidden = false;
        swipeToastTimer = window.setTimeout(() => fadeTo(swipeToast, 0, 400), 1400);
    }

    // The swipe reminders sit at the foot of the board and in the widest
    // part of the surround: beside the board on a wide screen, below it on
    // a tall one.
    function placeHints() {
        const {x_offset: x, y_offset: y, goban_width: width, goban_height: height} = goClock;
        const centreX = x + width / 2;
        boardHint.style.left = `${centreX}px`;
        boardHint.style.top = `${y + height - 48}px`;
        const sideMargin = window.innerWidth - x - width;
        const bottomMargin = window.innerHeight - y - height;
        const hintWidth = backgroundHint.offsetWidth + 16;
        const hintHeight = backgroundHint.offsetHeight + 16;
        if (sideMargin >= hintWidth || bottomMargin < hintHeight) {
            // Beside the board; on a cramped screen, as far right as fits.
            backgroundHint.style.left = `${Math.min(x + width + sideMargin / 2, window.innerWidth - hintWidth / 2)}px`;
            backgroundHint.style.top = `${y + height / 2}px`;
        } else {
            backgroundHint.style.left = `${centreX}px`;
            backgroundHint.style.top = `${y + height + bottomMargin / 2}px`;
        }
    }

    const showWood = createSettingControl('wood', woods.map(([name]) => name), woods.map(([name]) => name), setWood);
    const showPlacement = createSettingControl('placement', placementOptionLabels, placements, setPlacement);
    const showMode = createSettingControl('mode', modeOptionLabels, modes, (index) => {
        setMode(index);
        goClock.transform();
    });

    function setClockSpeed(index) {
        stoneSpeed = wrap(index, stoneSpeeds.length);
        const [name, speed] = stoneSpeeds[stoneSpeed];
        goClock.speed = speed;
        speedSlider.value = String(stoneSpeed);
        speedSlider.setAttribute('aria-valuetext', name);
        speedSlider.title = name;
        writeSetting('speed', stoneSpeed);
    }

    function setMode(index) {
        mode = wrap(index, modes.length);
        goClock.twenty_four_hour = mode === 1;
        showMode(mode);
        writeSetting('mode', mode);
    }

    function setWood(index) {
        wood = wrap(index, woods.length);
        const boardImage = $('#goban img:first-child');
        if (boardImage) {
            boardImage.style.filter = woods[wood][1];
        }
        showWood(wood);
        writeSetting('wood', wood);
    }

    function setSound(index) {
        sound = wrap(index, 2);
        const on = sound === 1;
        sounds.setEnabled(on);
        goClock.sound = on ? sounds : null;
        muteIcon.textContent = on ? '🔊' : '🔇';
        muteButton.setAttribute('aria-pressed', String(!on));
        muteButton.title = on ? 'Mute' : 'Unmute';
        muteButton.setAttribute('aria-label', on ? 'Mute' : 'Unmute');
        writeSetting('sound', sound);
    }

    function setPlacement(index) {
        placement = wrap(index, placements.length);
        goClock.placement = placement;
        showPlacement(placement);
        writeSetting('placement', placement);
    }

    function setView(index) {
        view = wrap(index, views.length);
        goClock.view = view;
        writeSetting('view', view);
    }

    function setBackground(index) {
        background = wrap(index, backgrounds.length);
        $('#sb-site').style.backgroundImage = `url('images/${backgrounds[background][0]}')`;
        goClock.table_grip = backgrounds[background][2];
        goClock.table_void = backgrounds[background][3] === 'void';
        if (goClock.table_void) {
            // Whatever was lying on the table has nothing under it now.
            goClock.dropTableStones();
        }
        writeSetting('background', background);
    }

    function setGobanState(state) {
        goClock.stones_shown = [...state].map((value) => Number(value));
    }

    function storeGobanState() {
        writeSetting('state', goClock.stones_shown.join(''));
    }

    function clearControlsFade() {
        if (controlsHideTimer !== null) {
            window.clearTimeout(controlsHideTimer);
            controlsHideTimer = null;
        }
    }

    function scheduleControlsFade() {
        clearControlsFade();
        controlsHideTimer = window.setTimeout(() => {
            if (toolbar.querySelector(':focus-visible')) {
                // Someone is tabbing through the controls; try again later.
                scheduleControlsFade();
                return;
            }
            if (openControl) {
                setControlOpen(openControl, false);
                openControl = null;
            }
            settingsMenu.hidden = true;
            settingsButton.setAttribute('aria-expanded', 'false');
            toolbar.dataset.visible = 'false';
        }, openControl ? openControlHideDelay : controlsHideDelay);
    }

    function wakeControls() {
        toolbar.dataset.visible = 'true';
        scheduleControlsFade();
    }

    // The controls out of the way at once, menus and all.
    function hideControls() {
        setOpenControl(null);
        settingsMenu.hidden = true;
        settingsButton.setAttribute('aria-expanded', 'false');
        // setOpenControl woke the controls; that is not wanted here.
        clearControlsFade();
        toolbar.dataset.visible = 'false';
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

    // After each rebuild of the board: the wood is a filter on the board
    // image, which draw() makes afresh, and the hints sit relative to it.
    goClock.onDraw = () => {
        setWood(wood);
        placeHints();
    };

    function resizeClock() {
        // Done now, or once the board is quiet (see draw() in go-clock.js).
        goClock.draw(window.innerWidth, window.innerHeight);
        aboutBox.hidden = true;
        aboutButton.setAttribute('aria-expanded', 'false');
    }

    // One rebuild per frame, however many resize events a window drag sends.
    let resizeFrame = null;
    function scheduleResize() {
        if (resizeFrame === null) {
            resizeFrame = window.requestAnimationFrame(() => {
                resizeFrame = null;
                resizeClock();
            });
        }
    }

    const storedState = readSetting('state');
    if (storedState && storedState.length === 361) {
        setGobanState(storedState);
    }

    speedSlider.max = String(stoneSpeeds.length - 1);
    speedSlider.addEventListener('input', () => setClockSpeed(Number(speedSlider.value)));
    setClockSpeed(stoneSpeed);
    setView(view);
    setBackground(background);
    setMode(mode);
    setPlacement(placement);
    setSound(sound);
    goClock.haptic = haptic;

    // Swipes and the hand. Sideways across the board changes the face,
    // sideways across the surround changes the background, and down the board
    // sweeps it clear; a shorter drag is a tap. A finger that stays put for
    // a moment instead becomes the hand (go-clock.js): from then until it
    // lifts, it pushes the stones about.
    let swipe = null;
    let hand = null;
    let holdTimer = null;
    let dragged = false;

    function isOnBoard(x, y) {
        const board = $('#goban-image')?.getBoundingClientRect();
        return Boolean(board) && x >= board.left && x <= board.right && y >= board.top && y <= board.bottom;
    }

    function cancelHold() {
        window.clearTimeout(holdTimer);
        holdTimer = null;
    }

    goban.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary) {
            return;
        }
        dragged = false;
        hand = null;
        cancelHold();
        swipe = {id: event.pointerId, x: event.clientX, y: event.clientY, onBoard: isOnBoard(event.clientX, event.clientY)};
        // A hold anywhere becomes the hand: on the surround it has the
        // stones on the table to push about.
        const {pointerId, clientX, clientY} = event;
        holdTimer = window.setTimeout(() => {
            holdTimer = null;
            if (!swipe || swipe.id !== pointerId || !goClock.fingerDown(clientX, clientY)) {
                // Gone, or the board is being swept.
                return;
            }
            hand = {id: pointerId};
            swipe = null;
            dragged = true;
            haptic('grab');
            // The hand is about the board, not the controls: if they are up, they go.
            hideControls();
        }, holdDelay);
        // So the release is heard even if it lands on the toolbar.
        goban.setPointerCapture(event.pointerId);
    });
    goban.addEventListener('pointermove', (event) => {
        // A mouse moving over the page brings the controls up; a finger does
        // not, so a swipe leaves the board as it was.
        if (event.pointerType === 'mouse') {
            wakeControlsForActivity();
        }
        if (hand && event.pointerId === hand.id) {
            goClock.fingerMove(event.clientX, event.clientY);
        } else if (holdTimer !== null && swipe && event.pointerId === swipe.id
                   && Math.hypot(event.clientX - swipe.x, event.clientY - swipe.y) >= holdTolerance) {
            // Off before the hold was up: a swipe or a tap, not the hand.
            cancelHold();
        }
    });
    function endPointer(event) {
        if (hand && event.pointerId === hand.id) {
            goClock.fingerUp();
            hand = null;
            return;
        }
        if (!swipe || event.pointerId !== swipe.id) {
            return;
        }
        cancelHold();
        const dx = event.clientX - swipe.x;
        const dy = event.clientY - swipe.y;
        const {onBoard} = swipe;
        swipe = null;
        if (event.type !== 'pointerup' || Math.max(Math.abs(dx), Math.abs(dy)) < swipeDistance) {
            return;
        }
        dragged = true;
        if (Math.abs(dx) > Math.abs(dy)) {
            // Swiping left brings on the next one, as with pages.
            const step = dx < 0 ? 1 : -1;
            if (onBoard) {
                setView(view + step);
                goClock.transform();
                showSwipeToast('◷', views[view]);
            } else {
                setBackground(background + step);
                showSwipeToast('▧', backgrounds[background][1]);
            }
            // A swipe is about the board, not the controls: if they are up, they go.
            hideControls();
        } else if (dy > 0 && onBoard) {
            goClock.resetBoard();
        }
    }
    goban.addEventListener('pointerup', endPointer);
    goban.addEventListener('pointercancel', endPointer);
    // Browsers that ignore -webkit-user-drag would otherwise pick the board
    // image up and cancel the swipe.
    goban.addEventListener('dragstart', (event) => event.preventDefault());
    goban.addEventListener('click', () => {
        // The click that follows a mouse drag is the drag, not a tap.
        if (dragged) {
            dragged = false;
            return;
        }
        wakeControls();
        goClock.update();
    });
    toolbar.addEventListener('pointermove', wakeControlsForActivity);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setSettingsOpen(false);
            hideAbout();
        }
        wakeControlsForActivity();
    });
    $$('#toolbar button, #toolbar input').forEach((control) => {
        control.addEventListener('click', wakeControls);
        control.addEventListener('input', wakeControls);
        control.addEventListener('focus', wakeControls);
    });
    // A touch anywhere outside an open setting closes it; likewise the about
    // box. Heard on pointerdown, touchstart and click alike: iOS is choosy
    // about which taps become clicks, a swipe never does, and closing twice
    // is harmless.
    function closeOutside(event) {
        if (openControl && !openControl.contains(event.target)) {
            setOpenControl(null);
        }
        if (!settingsMenu.hidden && !settingsMenu.contains(event.target) && !settingsButton.contains(event.target)) {
            setSettingsOpen(false);
        }
        if (!aboutBox.hidden && !aboutBox.contains(event.target) && !aboutButton.contains(event.target)) {
            hideAbout();
        }
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('touchstart', closeOutside, {passive: true});
    document.addEventListener('click', closeOutside);

    muteButton.addEventListener('click', () => setSound(sound === 1 ? 0 : 1));
    settingsButton.addEventListener('click', () => setSettingsOpen(settingsMenu.hidden));
    aboutButton.addEventListener('click', () => {
        if (aboutBox.hidden) {
            showAbout();
        } else {
            hideAbout();
        }
    });

    resizeClock();
    wakeControls();
    registerServiceWorker();
    window.addEventListener('resize', scheduleResize);
    setInterval(storeGobanState, 10000);
    goClock.transform();
});

