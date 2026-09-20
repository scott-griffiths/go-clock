import {GoClock} from './go-clock.js';
import {Sounds} from './sounds.js';
import {preloadTumbleSheets} from './flight.js';
import {startReplay, cancelReplay, loadGame, nextGameFile, gameCategories} from './replay.js';
import {gameTitle, gameResult} from './sgf.js';
import {faceIcons, speedIcons, precisionIcons, gameIcons, icons} from './icons.js';

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

// The table the board sits on. Each is a seamless texture (CC0, from Poly
// Haven and ambientCG) repeated at `tile` board-widths per repeat, so the
// planks, blades and cracks come out the same size beside the board on
// every screen; `tint` colours a grey texture, blended in; `veil` is a
// translucent colour laid over one that is too loud; and `shimmer` lays
// a smaller copy over the top, the two drifting across each other (see
// sizeBackground). `grip` is how much
// the table drags on a stone skidding across it, relative to wood: stones
// stop short in grass and slide on ice. Space is a picture rather than a
// tile, and has no table: a shoved stone glides off the edge and away.
const backgrounds = [
    {file: 'mahogany.jpg', name: 'Dark wood', grip: 1, tile: 1.5},
    {file: 'walnut.jpg', name: 'Light wood', grip: 1, tile: 1.5},
    {file: 'turf.jpg', name: 'Grass', grip: 4, tile: 1.4},
    {file: 'ice.jpg', name: 'Ice', grip: 0.15, tile: 1.1, veil: 'rgb(178 196 200 / 0.55)'},
    {file: 'water.jpg', name: 'Water', grip: 1, tile: 1.3, tint: '#123c5e', shimmer: 0.62, isWater: true},
    {file: 'space.jpg', name: 'Space', grip: 1, isVoid: true}
];

const views = ['Analogue', 'Jumping hour', 'Digital', 'Hybrid'];
// Name, how fast a stone moves (see moveDuration in moves.js), and how
// long a hand rests between stones, in ms. The rest is most of the
// difference: a slow player is slow to reach for the next stone, not slow
// in carrying it.
const stoneSpeeds = [['Slow', 18, 500], ['Normal', 26, 180], ['Fast', 45, 60], ['Insane!', 80, 15]];
const placements = ['Exact', 'Organic', 'Careless'];
const modes = ['12-hour clock', '24-hour clock'];
const woods = [
    ['Oak', 'saturate(0.8) hue-rotate(-12deg) sepia(0.5)'],
    ['Kaya', 'saturate(1.3) hue-rotate(-7deg)'],
    ['Bamboo', 'saturate(0.3) contrast(1.4) brightness(1.1) hue-rotate(-6deg)']
];
// Tucked away, the toggle comes back to full strength at a touch anywhere,
// and dims again this long (in ms) after the last.
const toggleWakeTime = 1500;

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
// 'bump' is the finger knocking into a stone with some force, `strength`
// (0 to 1) being how much: a shove through a crowd of stones makes many
// bumps at once, so they are thinned out. 'prepare', as the finger lands,
// warms the shell's engine so the first bump is on time, and is nothing
// elsewhere.
let lastBump = 0;
function haptic(kind, strength = 1) {
    if (kind === 'bump') {
        const now = performance.now();
        if (now - lastBump < 70) {
            return;
        }
        lastBump = now;
    }
    try {
        const handler = window.webkit?.messageHandlers?.goClockHaptic;
        if (handler) {
            handler.postMessage(kind === 'bump' ? `bump:${strength.toFixed(2)}` : kind);
        } else if (kind === 'bump') {
            navigator.vibrate?.(Math.round(4 + 12*strength));
        }
    } catch {
        // No feedback to give.
    }
}

// The backgrounds either side of the current one, fetched ahead so the
// arrow keys are instant; the rest wait to be needed. (All seven at once
// was four and a half megabytes on every first visit, most of it never
// looked at.)
function preloadNeighbouringBackgrounds(index) {
    [index - 1, index + 1].forEach((neighbour) => {
        const image = new Image();
        image.src = `images/${backgrounds[wrap(neighbour, backgrounds.length)].file}`;
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
    // The speed under a new key since Torpid, the slowest, went: an index
    // stored under the old one is one along.
    const oldSpeed = readSetting('speed');
    let stoneSpeed = readSetting('pace') !== null || !isInt(oldSpeed)
        ? readIndex('pace', 1, stoneSpeeds.length)
        : wrap(Math.max(0, Number(oldSpeed) - 1), stoneSpeeds.length);
    let view = readIndex('view', 0, views.length);
    let mode = readIndex('mode', 1, modes.length);
    let wood = readIndex('wood', 0, woods.length);
    // The sloppiest placement (the old fourth choice) has gone: a stored
    // index beyond the end is the sloppiest that is left.
    let placement = Math.min(readIndex('placement', 1, placements.length + 1), placements.length - 1);
    // Sound is on unless it has been muted.
    let sound = readIndex('sound', 1, 2);
    const sounds = new Sounds();

    const goban = $('#goban');
    const toolbar = $('#toolbar');
    const menuToggle = $('#menu-toggle');
    const modeButton = $('#mode');
    const muteButton = $('#mute');
    const replayControl = $('#replay-control');
    const replayButton = $('#replay');
    const swipeToast = $('#swipe-toast');
    const aboutButton = $('#about');
    const aboutBox = $('#about_box');
    let swipeToastTimer = null;
    let toggleWakeTimer = null;
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
            const button = addChoice(options, summary, {
                label,
                value: values[index],
                icon: icons?.[index],
                onChoose: () => onSelect(index)
            });
            button.dataset.index = String(index);
            button.setAttribute('aria-pressed', 'false');
        });

        openOnClick(control);

        return (activeIndex) => {
            summary.setAttribute('aria-label', `${settingName}: ${values[activeIndex]}`);
            summary.title = `${settingName}: ${values[activeIndex]}`;
            if (valueLabel) {
                valueLabel.textContent = labels[activeIndex];
            }
            if (icons && summaryIcon) {
                summaryIcon.innerHTML = icons[activeIndex];
            }
            $$('.choice-button', options).forEach((button) => {
                button.setAttribute('aria-pressed', String(Number(button.dataset.index) === activeIndex));
            });
        };
    }

    // One choice in a list: its name, the icon of what it chooses where
    // there is one, and what it does. Choosing closes the lists, and a
    // keyboard lands back on the button that opened them.
    function addChoice(options, summary, {label, value, icon, onChoose}) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choice-button';
        if (icon) {
            button.classList.add('choice-with-icon');
            button.innerHTML = `<span class="setting-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
        } else {
            button.textContent = label;
        }
        button.title = value;
        button.setAttribute('aria-label', value);
        button.addEventListener('click', (event) => {
            onChoose();
            setOpenControl(null);
            // Keyboard users land back on the button.
            if (event.detail === 0) {
                summary.focus({preventScroll: true});
            }
        });
        options.append(button);
        return button;
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
        $('span', menuToggle).innerHTML = collapsed ? icons.menu : icons.close;
        writeSetting('menu', collapsed ? 0 : 1);
    }

    // A touch anywhere brings the tucked-away toggle back to full strength
    // for a moment, so it can be found again.
    function wakeToggle() {
        toolbar.dataset.awake = 'true';
        window.clearTimeout(toggleWakeTimer);
        toggleWakeTimer = window.setTimeout(() => {
            toolbar.dataset.awake = 'false';
        }, toggleWakeTime);
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
    const showSpeed = createSettingControl('speed', stoneSpeeds.map(([name]) => name), stoneSpeeds.map(([name]) => name), setClockSpeed, speedIcons);
    const showWood = createSettingControl('wood', woods.map(([name]) => name), woods.map(([name]) => name), setWood);
    const showPlacement = createSettingControl('placement', placements, placements, setPlacement, precisionIcons);
    const showBackground = createSettingControl('background', backgrounds.map((table) => table.name), backgrounds.map((table) => table.name), setBackground);

    function setClockSpeed(index) {
        stoneSpeed = wrap(index, stoneSpeeds.length);
        goClock.speed = stoneSpeeds[stoneSpeed][1];
        goClock.pause = stoneSpeeds[stoneSpeed][2];
        showSpeed(stoneSpeed);
        writeSetting('pace', stoneSpeed);
    }

    // The hours and the sound, under the settings button: each shows where
    // it stands and swaps over when clicked. The hours say which clock is
    // showing in their own words; the sound wears a speaker, crossed out
    // while it is muted.
    function setMode(index) {
        mode = wrap(index, modes.length);
        goClock.twenty_four_hour = mode === 1;
        modeButton.textContent = modes[mode];
        modeButton.title = `Showing the ${modes[mode]}`;
        modeButton.setAttribute('aria-label', modeButton.title);
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
        muteButton.title = on ? 'Sound on' : 'Sound off';
        muteButton.setAttribute('aria-label', muteButton.title);
        $('.setting-icon', muteButton).innerHTML = icons.sound[sound];
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
        const table = backgrounds[background];
        const site = $('#sb-site');
        const image = `url('images/${table.file}')`;
        // Top layer first: a veil over the picture, or the picture's
        // shimmer over it, then the picture, then its tint underneath.
        const layers = [];
        const blends = [];
        if (table.veil) {
            layers.push(`linear-gradient(${table.veil}, ${table.veil})`);
            blends.push('normal');
        }
        if (table.shimmer) {
            layers.push(image);
            blends.push('soft-light');
        }
        layers.push(image);
        blends.push(table.tint ? 'multiply' : 'normal');
        site.style.backgroundImage = layers.join(', ');
        site.style.backgroundBlendMode = blends.join(', ');
        site.style.backgroundColor = table.tint ?? '';
        site.style.backgroundRepeat = table.tile ? 'repeat' : '';
        sizeBackground();
        preloadNeighbouringBackgrounds(background);
        goClock.table_grip = table.grip;
        goClock.table_void = Boolean(table.isVoid);
        goClock.table_water = Boolean(table.isWater);
        if (goClock.table_void) {
            // Whatever was lying on the table has nothing under it now.
            goClock.dropTableStones();
            preloadTumbleSheets();
        } else if (goClock.table_water) {
            // A sinking stone turns over as it goes down.
            goClock.sinkTableStones();
            preloadTumbleSheets();
        }
        showBackground(background);
        writeSetting('background', background);
    }

    // A tiled table repeats every `tile` board-widths; a picture covers
    // the screen. A shimmering one has its second layer at `shimmer` of
    // the first's size, and the two drift slowly across each other,
    // corner to corner in opposite directions, each by a whole tile per
    // pass so the loop is seamless.
    let drift = null;
    function sizeBackground() {
        const table = backgrounds[background];
        const site = $('#sb-site');
        drift?.cancel();
        drift = null;
        // Before the first draw the board has no width: onDraw comes back.
        const width = table.tile && goClock.goban_width ? Math.round(goClock.goban_width*table.tile) : 0;
        const size = width ? `${width}px auto` : 'cover';
        const sizes = [];
        if (table.veil) {
            sizes.push('auto');
        }
        if (table.shimmer) {
            sizes.push(width ? `${Math.round(width*table.shimmer)}px auto` : 'cover');
        }
        sizes.push(size);
        site.style.backgroundSize = sizes.join(', ');
        if (table.shimmer && width && site.animate) {
            const second = Math.round(width*table.shimmer);
            drift = site.animate([
                {backgroundPosition: '0px 0px, 0px 0px'},
                {backgroundPosition: `${-second}px ${second}px, ${width}px ${width}px`}
            ], {duration: 90000, iterations: Infinity, easing: 'linear'});
        }
    }

    // A game replayed on the board (replay.js): the button drops down the
    // shelves of games (historical, modern, and the games an engine
    // played), and one from the shelf chosen is replayed; while it runs
    // the button is pressed instead, and stops it. The game is named as it
    // starts, under the icon of its shelf, and its result given as it ends.
    function setReplaying(on) {
        replayButton.setAttribute('aria-pressed', String(on));
        replayButton.title = on ? 'Stop the replay' : 'Replay a game';
        replayButton.setAttribute('aria-label', replayButton.title);
    }

    // A game from one shelf, or, for the key, from any of them.
    function startGame(category = null) {
        const icon = category ? gameIcons[category.key] : icons.replay;
        const began = startReplay(goClock, loadGame(`games/${nextGameFile(category?.files)}`), {
            onStart: (game) => showSwipeToast(icon, gameTitle(game.info), 4000),
            onRest: (game) => {
                const result = gameResult(game.info);
                if (result) {
                    showSwipeToast(icon, result, 3000);
                }
            },
            onEnd: (error) => {
                setReplaying(false);
                if (error) {
                    console.error('The game could not be replayed', error);
                    showSwipeToast(icon, 'No game to replay');
                }
            }
        });
        if (began) {
            setReplaying(true);
        }
    }

    function toggleReplay() {
        if (goClock.replay) {
            cancelReplay(goClock);
        } else {
            startGame();
        }
    }

    // The next (or previous) face or background, announced with a toast:
    // what the arrow keys do.
    function changeView(step) {
        setView(view + step);
        cancelReplay(goClock);
        goClock.transform();
        showSwipeToast(faceIcons[view], views[view]);
    }

    function changeBackground(step) {
        setBackground(background + step);
        showSwipeToast(icons.background, backgrounds[background].name);
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
    // image, which draw() makes afresh, and the table is tiled to the
    // board's new width.
    goClock.onDraw = () => {
        setWood(wood);
        sizeBackground();
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

    $('#replay .setting-icon').innerHTML = icons.replay;
    gameCategories.forEach((category) => {
        addChoice($('.setting-options', replayControl), replayButton, {
            label: category.label,
            value: category.title,
            icon: gameIcons[category.key],
            onChoose: () => startGame(category)
        });
    });
    $('#settings-control .setting-icon').innerHTML = icons.settings;
    $('#background-control .setting-icon').innerHTML = icons.background;
    setClockSpeed(stoneSpeed);
    setView(view);
    setBackground(background);
    setMode(mode);
    setPlacement(placement);
    setSound(sound);
    goClock.haptic = haptic;

    // The hand: a finger on the board or its surround is the hand
    // (go-clock.js) from the moment it lands until it lifts, pushing the
    // stones about.
    let hand = null;

    goban.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary) {
            return;
        }
        hand = null;
        if (goClock.fingerDown(event.clientX, event.clientY)) {
            hand = {id: event.pointerId};
            haptic('prepare');
            // So the release is heard even if it lands on the toolbar.
            goban.setPointerCapture(event.pointerId);
        }
    });
    goban.addEventListener('pointermove', (event) => {
        if (hand && event.pointerId === hand.id) {
            goClock.fingerMove(event.clientX, event.clientY);
        }
    });
    function endPointer(event) {
        if (hand && event.pointerId === hand.id) {
            goClock.fingerUp();
            hand = null;
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
    document.addEventListener('pointerdown', wakeToggle);
    document.addEventListener('touchstart', wakeToggle, {passive: true});

    openOnClick($('#settings-control'));
    muteButton.addEventListener('click', () => setSound(sound === 1 ? 0 : 1));
    // The replay button opens its shelves, unless a game is running, in
    // which case it stops it.
    replayButton.addEventListener('click', () => {
        if (goClock.replay) {
            cancelReplay(goClock);
            setOpenControl(null);
        } else {
            setOpenControl(replayControl.dataset.open === 'true' ? null : replayControl);
        }
    });
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

