import {GoClock} from './go-clock.js';
import {Sounds} from './sounds.js';
import {preloadTumbleSheets} from './flight.js';
import {startReplay, cancelReplay, loadGame, nextGameFile} from './replay.js';
import {gameTitle, gameResult} from './sgf.js';
import {faceIcons} from './face-icons.js';

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
// space the board has no grip and there is no table: a shoved stone glides
// off the edge and away.
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
// Name, how fast a stone moves (see moveDuration in moves.js), and how
// long a hand rests between stones, in ms. The rest is most of the
// difference: a slow player is slow to reach for the next stone, not slow
// in carrying it.
const stoneSpeeds = [['Torpid', 12, 1000], ['Slow', 18, 500], ['Normal', 26, 180], ['Fast', 45, 60], ['Insane!', 80, 15]];
const placements = ['Exact', 'Organic', 'Careless', 'Haphazard'];
const placementOptionLabels = ['Exact', 'Organic', 'Careless', 'Meh'];
const modes = ['12-hour', '24-hour'];
const woods = [
    ['Oak', 'saturate(0.8) hue-rotate(-12deg) sepia(0.5)'],
    ['Kaya', 'saturate(1.3) hue-rotate(-7deg)'],
    ['Bamboo', 'saturate(0.3) contrast(1.4) brightness(1.1) hue-rotate(-6deg)']
];
// A finger on the surround that has moved this far (in CSS pixels) has
// shown which way it is going: within this angle of level (as a slope),
// and it is a swipe; otherwise it is the hand.
const dragTolerance = 16;
const swipeSlope = Math.tan(15*Math.PI/180);
// A swipe across the surround changes the background once it is this long.
const swipeDistance = 48;

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
// a good shove makes several at once, so those are thinned out. ('prepare',
// which the shell also answers, warms its engine and is nothing elsewhere;
// nothing sends it now that the hand lands with the finger.)
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
        } else if (kind !== 'prepare') {
            navigator.vibrate?.(kind === 'grab' ? 15 : 5);
        }
    } catch {
        // No feedback to give.
    }
}

// The backgrounds either side of the current one, fetched ahead so a swipe
// is instant; the rest wait to be needed. (All seven at once was four and
// a half megabytes on every first visit, most of it never looked at.)
function preloadNeighbouringBackgrounds(index) {
    [index - 1, index + 1].forEach((neighbour) => {
        const image = new Image();
        image.src = `images/${backgrounds[wrap(neighbour, backgrounds.length)][0]}`;
    });
}

// Keeps the screen on while the clock is showing, where the browser allows
// it (a secure context, and not the iOS shell, which does this itself).
// The browser lets the lock go when the page is hidden, so it is asked for
// again each time the page comes back.
let wakeLock = null;
async function keepScreenAwake() {
    if (!navigator.wakeLock || document.visibilityState !== 'visible' || wakeLock) {
        return;
    }
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            wakeLock = null;
        });
    } catch {
        // Low battery, or not allowed here: the screen dims as it usually would.
    }
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
    const menuToggle = $('#menu-toggle');
    const modeButton = $('#mode');
    const muteButton = $('#mute');
    const replayButton = $('#replay');
    const swipeToast = $('#swipe-toast');
    const aboutButton = $('#about');
    const aboutBox = $('#about_box');
    let swipeToastTimer = null;
    // The settings whose choices are showing, outermost first: a submenu
    // is open only while the list it is in is.
    let openControls = [];

    // A setting control is a button named for the setting that drops its
    // choices down (`.setting-summary` in the row; `.submenu-button` in a
    // list, which also shows the value). Given `icons` (SVG markup, one a
    // choice), each choice wears its icon, and the row's button the icon
    // of the current choice. Returns a setter that marks the chosen option
    // and puts the value in the button's accessible name.
    function createSettingControl(name, labels, values, onSelect, icons = null) {
        const control = $(`#${name}-control`);
        const summary = summaryOf(control);
        const options = $('.setting-options', control);
        const settingName = summary.getAttribute('aria-label');
        const valueLabel = $('.setting-value', summary);
        const summaryIcon = $('.setting-icon', summary);

        labels.forEach((label, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'choice-button';
            if (icons) {
                button.classList.add('choice-with-icon');
                button.innerHTML = `<span class="setting-icon" aria-hidden="true">${icons[index]}</span><span>${label}</span>`;
            } else {
                button.textContent = label;
            }
            button.title = values[index];
            button.dataset.index = String(index);
            button.setAttribute('aria-label', values[index]);
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', (event) => {
                onSelect(index);
                setOpenControl(null);
                // Keyboard users land back on the button.
                if (event.detail === 0) {
                    summary.focus({preventScroll: true});
                }
            });
            options.append(button);
        });

        openOnClick(control);

        return (activeIndex) => {
            summary.setAttribute('aria-label', `${settingName}: ${values[activeIndex]}`);
            summary.title = `${settingName}: ${values[activeIndex]}`;
            if (valueLabel) {
                valueLabel.textContent = labels[activeIndex];
            }
            if (icons) {
                summaryIcon.innerHTML = icons[activeIndex];
            }
            $$('.choice-button', options).forEach((button) => {
                button.setAttribute('aria-pressed', String(Number(button.dataset.index) === activeIndex));
            });
        };
    }

    function summaryOf(control) {
        return $(':scope > button', control);
    }

    function openOnClick(control) {
        summaryOf(control).addEventListener('click', () => {
            setOpenControl(control.dataset.open === 'true' ? control.parentElement.closest('.setting-control') : control);
        });
    }

    // A list of choices where it fits: hanging from its button (or, for a
    // button in the row in landscape, and for a submenu, out to its right),
    // and to the other side, or shifted, if it would leave the screen.
    function placePanel(control) {
        const panel = $('.setting-options', control);
        const anchor = summaryOf(control).getBoundingClientRect();
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const gap = 6;
        const margin = 10;
        const inset = safeInsets();
        const minX = margin + inset.left;
        const maxX = window.innerWidth - margin - inset.right - width;
        const minY = margin + inset.top;
        const maxY = window.innerHeight - margin - inset.bottom - height;
        const beside = control.parentElement.closest('.setting-options') || isLandscape();
        let left;
        let top;
        if (beside) {
            left = anchor.right + gap;
            if (left > maxX) {
                left = anchor.left - gap - width;
            }
            top = anchor.top;
        } else {
            top = anchor.bottom + gap;
            if (top > maxY) {
                top = anchor.top - gap - height;
            }
            left = anchor.left;
        }
        panel.style.left = `${Math.round(Math.max(minX, Math.min(maxX, left)))}px`;
        panel.style.top = `${Math.round(Math.max(minY, Math.min(maxY, top)))}px`;
    }

    function isLandscape() {
        return window.matchMedia('(orientation: landscape)').matches;
    }

    // The screen's safe area, as the stylesheet reads it (see :root).
    function safeInsets() {
        const style = getComputedStyle(document.documentElement);
        const read = (side) => parseFloat(style.getPropertyValue(`--safe-${side}`)) || 0;
        return {top: read('top'), right: read('right'), bottom: read('bottom'), left: read('left')};
    }

    function setControlOpen(control, open) {
        control.dataset.open = open ? 'true' : 'false';
        summaryOf(control).setAttribute('aria-expanded', String(open));
        $('.setting-options', control).hidden = !open;
        if (open) {
            placePanel(control);
        }
    }

    // Opens this setting's choices, and any list it is in; closes every
    // other. Null closes them all.
    function setOpenControl(control) {
        const wanted = [];
        for (let c = control; c; c = c.parentElement.closest('.setting-control')) {
            wanted.unshift(c);
        }
        openControls.filter((c) => !wanted.includes(c)).reverse().forEach((c) => setControlOpen(c, false));
        wanted.filter((c) => !openControls.includes(c)).forEach((c) => setControlOpen(c, true));
        openControls = wanted;
    }

    // The controls tucked away behind their first button, or brought back;
    // remembered, like a setting.
    function setCollapsed(collapsed) {
        setOpenControl(null);
        toolbar.dataset.collapsed = collapsed ? 'true' : 'false';
        menuToggle.setAttribute('aria-expanded', String(!collapsed));
        menuToggle.title = collapsed ? 'Show the controls' : 'Hide the controls';
        menuToggle.setAttribute('aria-label', menuToggle.title);
        $('span', menuToggle).textContent = collapsed ? '☰' : '✕';
        writeSetting('menu', collapsed ? 0 : 1);
    }

    // What a key just chose, in a button's dress, at the foot of the screen
    // for a moment. The icon is a character or one of our own SVGs.
    function showSwipeToast(icon, value, stay = 1400) {
        $('#swipe-toast-icon').innerHTML = icon;
        $('#swipe-toast-value').textContent = value;
        window.clearTimeout(swipeToastTimer);
        swipeToast.getAnimations?.().forEach((animation) => animation.cancel());
        swipeToast.style.opacity = '1';
        swipeToast.hidden = false;
        // Just above the board, or at the top of the screen where the
        // board reaches nearly to it (landscape).
        const board = $('#goban-image')?.getBoundingClientRect();
        const highest = 10 + safeInsets().top;
        swipeToast.style.top = `${Math.round(Math.max(highest, (board?.top ?? 0) - 8 - swipeToast.offsetHeight))}px`;
        swipeToastTimer = window.setTimeout(() => fadeTo(swipeToast, 0, 400), stay);
    }

    const showFace = createSettingControl('face', views, views, (index) => {
        setView(index);
        cancelReplay(goClock);
        goClock.transform();
    }, faceIcons);
    const showSpeed = createSettingControl('speed', stoneSpeeds.map(([name]) => name), stoneSpeeds.map(([name]) => name), setClockSpeed);
    const showWood = createSettingControl('wood', woods.map(([name]) => name), woods.map(([name]) => name), setWood);
    const showPlacement = createSettingControl('placement', placementOptionLabels, placements, setPlacement);

    function setClockSpeed(index) {
        stoneSpeed = wrap(index, stoneSpeeds.length);
        goClock.speed = stoneSpeeds[stoneSpeed][1];
        goClock.pause = stoneSpeeds[stoneSpeed][2];
        showSpeed(stoneSpeed);
        writeSetting('speed', stoneSpeed);
    }

    // The mode and sound buttons, under the settings button, are toggles,
    // pressed while they are on.
    function setMode(index) {
        mode = wrap(index, modes.length);
        goClock.twenty_four_hour = mode === 1;
        modeButton.setAttribute('aria-pressed', String(mode === 1));
        modeButton.title = modes[mode];
        writeSetting('mode', mode);
        describeBoard();
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
        muteButton.setAttribute('aria-pressed', String(on));
        muteButton.title = on ? 'Sound on' : 'Sound off';
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
        showFace(view);
        writeSetting('view', view);
    }

    function setBackground(index) {
        background = wrap(index, backgrounds.length);
        $('#sb-site').style.backgroundImage = `url('images/${backgrounds[background][0]}')`;
        preloadNeighbouringBackgrounds(background);
        goClock.table_grip = backgrounds[background][2];
        goClock.table_void = backgrounds[background][3] === 'void';
        if (goClock.table_void) {
            // Whatever was lying on the table has nothing under it now.
            goClock.dropTableStones();
            preloadTumbleSheets();
        }
        writeSetting('background', background);
    }

    // A game replayed on the board (replay.js): the button starts one, and
    // while it runs is pressed, and stops it. The game is named as it
    // starts, and its result given as it ends.
    function setReplaying(on) {
        replayButton.setAttribute('aria-pressed', String(on));
        replayButton.title = on ? 'Stop the replay' : 'Replay a game';
        replayButton.setAttribute('aria-label', replayButton.title);
    }

    function toggleReplay() {
        if (goClock.replay) {
            cancelReplay(goClock);
            return;
        }
        const began = startReplay(goClock, loadGame(`games/${nextGameFile()}`), {
            onStart: (game) => showSwipeToast('⏵', gameTitle(game.info), 4000),
            onRest: (game) => {
                const result = gameResult(game.info);
                if (result) {
                    showSwipeToast('⏵', result, 3000);
                }
            },
            onEnd: (error) => {
                setReplaying(false);
                if (error) {
                    console.error('The game could not be replayed', error);
                    showSwipeToast('⏵', 'No game to replay');
                }
            }
        });
        if (began) {
            setReplaying(true);
        }
    }

    // The next (or previous) face or background, announced with a toast:
    // what the arrow keys do, and a swipe across the surround.
    function changeView(step) {
        setView(view + step);
        cancelReplay(goClock);
        goClock.transform();
        showSwipeToast(faceIcons[view], views[view]);
    }

    function changeBackground(step) {
        setBackground(background + step);
        showSwipeToast('▧', backgrounds[background][1]);
    }

    // What the board shows, for assistive tech: a grid of stones means
    // nothing to a screen reader, so the board's label carries the time.
    function describeBoard() {
        const time = new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', hour12: mode === 0});
        goban.setAttribute('aria-label', `Go board clock showing ${time}`);
    }

    function setGobanState(state) {
        goClock.stones_shown = [...state].map((value) => Number(value));
    }

    function storeGobanState() {
        writeSetting('state', goClock.stones_shown.join(''));
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
    // image, which draw() makes afresh.
    goClock.onDraw = () => {
        setWood(wood);
    };

    function resizeClock() {
        // Done now, or once the board is quiet (see draw() in go-clock.js).
        goClock.draw(window.innerWidth, window.innerHeight);
        // The lists were placed for the old screen.
        setOpenControl(null);
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

    // A character per point: 0 empty, 1 white, 3 black. Anything else would
    // become a NaN in the model, which no move could ever mend.
    const storedState = readSetting('state');
    if (storedState && /^[013]{361}$/.test(storedState)) {
        setGobanState(storedState);
    }

    setClockSpeed(stoneSpeed);
    setView(view);
    setBackground(background);
    setMode(mode);
    setPlacement(placement);
    setSound(sound);
    goClock.haptic = haptic;

    // The hand and the swipe: a finger on the board is the hand
    // (go-clock.js) from the moment it lands until it lifts, pushing the
    // stones about. On the surround it waits to see which way it goes: a
    // drag sideways is a swipe, changing the background once it is long
    // enough, and any other drag is the hand, landing where the finger
    // has got to.
    let hand = null;
    let swipe = null;

    function isOnBoard(x, y) {
        const board = $('#goban-image')?.getBoundingClientRect();
        return Boolean(board) && x >= board.left && x <= board.right && y >= board.top && y <= board.bottom;
    }

    function landHand(pointerId, x, y) {
        if (goClock.fingerDown(x, y)) {
            hand = {id: pointerId};
            haptic('grab');
        }
    }

    goban.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary) {
            return;
        }
        hand = null;
        swipe = null;
        if (isOnBoard(event.clientX, event.clientY)) {
            landHand(event.pointerId, event.clientX, event.clientY);
            if (!hand) {
                // The board is being swept.
                return;
            }
        } else {
            swipe = {id: event.pointerId, x: event.clientX, y: event.clientY, sideways: null};
        }
        // So the release is heard even if it lands on the toolbar.
        goban.setPointerCapture(event.pointerId);
    });
    goban.addEventListener('pointermove', (event) => {
        if (hand && event.pointerId === hand.id) {
            goClock.fingerMove(event.clientX, event.clientY);
            return;
        }
        if (!swipe || event.pointerId !== swipe.id) {
            return;
        }
        const dx = event.clientX - swipe.x;
        const dy = event.clientY - swipe.y;
        if (swipe.sideways === null) {
            if (Math.hypot(dx, dy) < dragTolerance) {
                return;
            }
            swipe.sideways = Math.abs(dy) <= Math.abs(dx)*swipeSlope;
            if (!swipe.sideways) {
                // Not a swipe: the hand, from here.
                swipe = null;
                landHand(event.pointerId, event.clientX, event.clientY);
                return;
            }
        }
        if (Math.abs(dx) >= swipeDistance) {
            swipe = null;
            // Swiping left brings on the next one, as with pages.
            changeBackground(dx < 0 ? 1 : -1);
        }
    });
    function endPointer(event) {
        if (hand && event.pointerId === hand.id) {
            goClock.fingerUp();
            hand = null;
        } else if (swipe && event.pointerId === swipe.id) {
            // Lifted before it showed which way it was going, or too soon
            // for a swipe: a tap, which does nothing.
            swipe = null;
        }
    }
    goban.addEventListener('pointerup', endPointer);
    goban.addEventListener('pointercancel', endPointer);
    // Browsers that ignore -webkit-user-drag would otherwise pick the board
    // image up and cancel the hand.
    goban.addEventListener('dragstart', (event) => event.preventDefault());
    // Keys: the arrows change the face (left and right) and the background
    // (up and down), M mutes, R replays a game, I is the about box.
    const keyActions = {
        ArrowRight: () => changeView(1),
        ArrowLeft: () => changeView(-1),
        ArrowDown: () => changeBackground(1),
        ArrowUp: () => changeBackground(-1),
        m: () => setSound(sound === 1 ? 0 : 1),
        r: toggleReplay,
        i: () => aboutButton.click()
    };
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setOpenControl(null);
            hideAbout();
        } else if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            const action = keyActions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
            if (action) {
                event.preventDefault();
                action();
            }
        }
    });
    // A touch anywhere outside an open setting closes it; likewise the about
    // box. Heard on pointerdown, touchstart and click alike: iOS is choosy
    // about which taps become clicks, a swipe never does, and closing twice
    // is harmless.
    function closeOutside(event) {
        // The innermost open list that was touched stays, with its
        // parents; a touch outside them all closes everything.
        setOpenControl(openControls.findLast((c) => c.contains(event.target)) ?? null);
        if (!aboutBox.hidden && !aboutBox.contains(event.target) && !aboutButton.contains(event.target)) {
            hideAbout();
        }
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('touchstart', closeOutside, {passive: true});
    document.addEventListener('click', closeOutside);

    openOnClick($('#settings-control'));
    muteButton.addEventListener('click', () => setSound(sound === 1 ? 0 : 1));
    replayButton.addEventListener('click', toggleReplay);
    modeButton.addEventListener('click', () => {
        setMode(mode === 1 ? 0 : 1);
        goClock.transform();
    });
    menuToggle.addEventListener('click', () => setCollapsed(toolbar.dataset.collapsed !== 'true'));
    aboutButton.addEventListener('click', () => {
        setOpenControl(null);
        if (aboutBox.hidden) {
            showAbout();
        } else {
            hideAbout();
        }
    });
    // Each button's place in the row, for the slide in and out.
    $$('#toolbar-actions > *').forEach((child, index) => child.style.setProperty('--i', String(index)));

    resizeClock();
    // The controls as they were left: up, the first time.
    setCollapsed(readIndex('menu', 1, 2) === 0);
    registerServiceWorker();
    keepScreenAwake();
    document.addEventListener('visibilitychange', keepScreenAwake);
    window.addEventListener('resize', scheduleResize);
    setInterval(() => {
        storeGobanState();
        describeBoard();
    }, 10000);
    goClock.transform();
});

