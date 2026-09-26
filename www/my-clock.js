import {GoClock} from './go-clock.js';
import {Sounds} from './sounds.js';
import {preloadTumbleSheets} from './flight.js';
import {startReplay, cancelReplay, setReplayRate, seekReplay, loadGame, nextGameFile} from './replay.js';
import {Stopwatch} from './stopwatch.js';
import {pictureBoard, shuffledPictures} from './gallery.js';
import {gameDetails} from './sgf.js';
import {faceIcons, speedIcons, precisionIcons, backgroundIcons, woodIcons, icons} from './icons.js';
import {computerBoardSrc, gobanImageSrc, setFlatStones, stoneImageSrc, colourOfImage} from './stone-dom.js';

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
    {file: 'walnut.jpg', name: 'Wood', grip: 1, tile: 1.5},
    {file: 'turf.jpg', name: 'Grass', grip: 4, tile: 1.4},
    {file: 'ice.jpg', name: 'Ice', grip: 0.15, tile: 1.1, veil: 'rgb(178 196 200 / 0.55)'},
    {file: 'water.jpg', name: 'Water', grip: 1, tile: 1.3, tint: '#6fb4e6', shimmer: 0.62, isWater: true},
    {file: 'space.jpg', name: 'Space', grip: 1, isVoid: true}
];

const views = ['Analogue', 'Jumping hour', 'Digital', 'Hybrid'];
// Name, how fast a stone moves (see moveDuration in moves.js: a move
// takes the square root of its length over this, so four times the speed
// is twice as quick), and how long a hand rests between stones, in ms.
// The rest is most of the difference: a slow player is slow to reach for
// the next stone, not slow in carrying it. Magic (the fourth entry true)
// has as many hands as it needs: every change is made in one go
// (magic.js), and the rest is between one go and the next.
const stoneSpeeds = [['Slow', 26, 180], ['Normal', 45, 60], ['Fast', 320, 8], ['Magic!', 320, 150, true]];
const placements = ['Exact', 'Organic', 'Careless'];
// How fast a game replays, in moves a second, at each of the hand's
// speeds (stoneSpeeds, above): not how fast the hands are, but how fast
// the game asks them for moves, so a slow board falls behind a brisk game
// rather than the game waiting for it. Magic has as many hands as it
// needs, and plays as fast as the hands can.
const playbackRates = [1, 2, 6, 20];
const modes = ['12-hour', '24-hour'];
// Each a filter on the board image; the last is no wood at all but the
// computer's board, drawn plain (stone-dom.js), with flat stones to match.
const woods = [
    ['Oak', 'saturate(0.8) hue-rotate(-12deg) sepia(0.5)'],
    ['Kaya', 'saturate(1.3) hue-rotate(-7deg)'],
    ['Computer', 'none', true]
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

// A setting stored as JSON; null if there is none, or it will not parse.
function readJSON(key) {
    try {
        return JSON.parse(readSetting(key));
    } catch {
        return null;
    }
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
// elsewhere. 'press' is a finger held still winding up, and 'blast' the
// moment it goes off: as hard a jolt as there is to give.
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
        } else if (kind === 'press') {
            navigator.vibrate?.(25);
        } else if (kind === 'blast') {
            navigator.vibrate?.(200);
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
    // Dark wood went the way Slow did (below): an index already stored
    // under a new key (`background2`) is used as is; one only under the
    // old `background` is dropped once, on the way to it.
    const oldBackground = readSetting('background');
    const newBackground = readSetting('background2');
    let background = isInt(newBackground)
        ? wrap(Number(newBackground), backgrounds.length)
        : isInt(oldBackground) ? wrap(Math.max(0, Number(oldBackground) - 1), backgrounds.length) : 0;
    // Slow speeds keep going: Torpid first, then Slow, each dropped from
    // the front of the list, its key retired and a new one taken up so an
    // index already in the new scheme (`pace2`) is never shifted again —
    // only a `pace` left from before Slow went is dropped once, on the way
    // to it.
    const dropped = (index) => wrap(Math.max(0, index - 1), stoneSpeeds.length);
    const oldSpeed = readSetting('speed');
    const oldPace = readSetting('pace');
    const newPace = readSetting('pace2');
    let stoneSpeed = isInt(newPace)
        ? wrap(Number(newPace), stoneSpeeds.length)
        : isInt(oldPace) ? dropped(Number(oldPace))
        : isInt(oldSpeed) ? dropped(Math.max(0, Number(oldSpeed) - 1)) : 0;
    let view = readIndex('view', 3, views.length);
    let mode = readIndex('mode', 1, modes.length);
    let wood = readIndex('wood', 0, woods.length);
    // The sloppiest placement (the old fourth choice) has gone: a stored
    // index beyond the end is the sloppiest that is left.
    let placement = Math.min(readIndex('placement', 1, placements.length + 1), placements.length - 1);
    // Sound is off unless it has been turned on.
    let sound = readIndex('sound', 0, 2);
    // Seconds show unless they have been turned off.
    let showSeconds = readIndex('seconds', 1, 2);
    // The one stopwatch, kept whatever the board shows and saved whenever
    // it is started, stopped or reset, so one left running is still
    // running after a reload, or the app being closed and opened again.
    const stopwatch = Stopwatch.fromJSON(readJSON('stopwatch'));
    // The tool on the board: 'clock', 'stopwatch', 'replay' or 'gallery'
    // (setTool).
    let tool = 'clock';
    const sounds = new Sounds();

    const goban = $('#goban');
    const toolbar = $('#toolbar');
    const menuToggle = $('#menu-toggle');
    const modeButton = $('#mode');
    const secondsButton = $('#seconds-toggle');
    const muteButton = $('#mute');
    const replayButton = $('#replay');
    const stopwatchButton = $('#stopwatch');
    const galleryButton = $('#gallery');
    const info = $('#info');
    const aboutButton = $('#about');
    const aboutBox = $('#about_box');
    let infoTimer = null;
    // The button or choice a finger (or pointer) is holding down, whose
    // line of information stays until it lets go.
    let toggleWakeTimer = null;
    // The settings whose choices are showing, outermost first: a submenu
    // is open only while the list it is in is.
    let openControls = [];

    // A setting control is a button named for the setting that drops its
    // choices down (`.setting-summary` in the row; `.submenu-button` in a
    // list, which also shows the value). Given `icons` (SVG markup, one a
    // choice), each choice wears its icon, and the row's button the icon
    // of the current choice. `keepOpen` leaves the list open once a choice
    // is made, for one tried after another (face, speed, background,
    // board); other choices close it, as a single pick would be expected
    // to. `row` (face, speed) drops the choices as icons alone, in a row
    // under the button rather than a list beneath it: it starts under the
    // button's own place in the toolbar row, and, sized and spaced the
    // same, lands its choices under the buttons after it. Each choice, and
    // the button, carries its line of information ("Board: Kaya"). Returns
    // a setter that marks the chosen option and puts the value in the
    // button's accessible name and its information.
    function createSettingControl(name, labels, values, onSelect, icons = null, keepOpen = false, row = false) {
        const control = $(`#${name}-control`);
        const summary = summaryOf(control);
        const options = $('.setting-options', control);
        const settingName = summary.getAttribute('aria-label');
        const valueLabel = $('.setting-value', summary);
        const summaryIcon = $('.setting-icon', summary);
        options.classList.toggle('setting-options-row', row);
        if (row) {
            enableRowScrub(options);
        }

        labels.forEach((label, index) => {
            const button = addChoice(options, summary, {
                label,
                value: values[index],
                icon: icons?.[index],
                onChoose: () => onSelect(index),
                keepOpen,
                iconOnly: row,
                info: `${settingName}: ${values[index]}`
            });
            button.dataset.index = String(index);
            button.setAttribute('aria-pressed', 'false');
        });

        openOnClick(control);

        return (activeIndex) => {
            summary.setAttribute('aria-label', `${settingName}: ${values[activeIndex]}`);
            summary.title = `${settingName}: ${values[activeIndex]}`;
            summary.dataset.info = summary.title;
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
    // there is one, and what it does. `iconOnly` (a row's choices) wears
    // the icon alone, its name left to the accessible label. Choosing
    // closes the lists, unless `keepOpen`, and a keyboard lands back on
    // the button that opened them.
    function addChoice(options, summary, {label, value, icon, onChoose, keepOpen = false, iconOnly = false, info = null}) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choice-button';
        if (iconOnly) {
            button.innerHTML = `<span class="setting-icon" aria-hidden="true">${icon}</span>`;
        } else if (icon) {
            button.classList.add('choice-with-icon');
            button.innerHTML = `<span class="setting-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
        } else {
            button.textContent = label;
        }
        button.title = value;
        button.setAttribute('aria-label', value);
        if (info) {
            button.dataset.info = info;
        }
        button.addEventListener('click', (event) => {
            onChoose();
            if (keepOpen) {
                return;
            }
            setOpenControl(null);
            // Keyboard users land back on the button.
            if (event.detail === 0) {
                summary.focus({preventScroll: true});
            }
        });
        options.append(button);
        return button;
    }

    // A row's choices (face, speed, background, board): pressing one and
    // dragging across the rest picks up each in turn as the finger (or
    // pointer) reaches it, so trying several is one held gesture rather
    // than a tap, a lift, a tap, a lift. Release wherever; whatever was
    // last under the finger stays chosen, exactly as tapping it would
    // have left it. The row holds on to the pointer, so the browser's own
    // click lands on the row, or (iOS) on the first choice touched,
    // rather than the one let go of: those are ignored, and the row
    // clicks its choices itself. A keyboard's click (detail 0) goes
    // through as usual.
    function enableRowScrub(options) {
        let dragging = false;
        let current = null;
        let chosen = null;
        function choiceUnder(x, y) {
            return $$('.choice-button', options).find((button) => {
                const rect = button.getBoundingClientRect();
                return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
            });
        }
        options.addEventListener('click', (event) => {
            if (event.isTrusted && event.detail > 0) {
                event.stopImmediatePropagation();
            }
        }, true);
        options.addEventListener('pointerdown', (event) => {
            const button = event.target.closest('.choice-button');
            if (!event.isPrimary || !button) {
                return;
            }
            dragging = true;
            current = button;
            chosen = null;
            options.setPointerCapture?.(event.pointerId);
        });
        options.addEventListener('pointermove', (event) => {
            if (!dragging || !event.isPrimary) {
                return;
            }
            const button = choiceUnder(event.clientX, event.clientY);
            if (button && button !== current) {
                current = button;
                chosen = button;
                button.click();
            }
        });
        function endDrag(event) {
            if (!dragging) {
                return;
            }
            options.releasePointerCapture?.(event.pointerId);
            dragging = false;
            // A tap, or a drag let go on a choice it has not yet picked.
            const button = event.type === 'pointerup' ? choiceUnder(event.clientX, event.clientY) : null;
            if (button && button !== chosen) {
                button.click();
            }
            current = null;
            chosen = null;
        }
        options.addEventListener('pointerup', endDrag);
        options.addEventListener('pointercancel', endDrag);
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
        const anchor = anchorOf(control);
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const gap = 6;
        const margin = 10;
        const inset = safeInsets();
        const minX = margin + inset.left;
        const maxX = window.innerWidth - margin - inset.right - width;
        const minY = margin + inset.top;
        const maxY = window.innerHeight - margin - inset.bottom - height;
        // A list's submenu opens out beside it; a setting in a row (the
        // board's) drops its choices beneath, as the row's own do.
        const list = control.parentElement.closest('.setting-options');
        const beside = isLandscape() || (list && !list.classList.contains('setting-options-row'));
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
            // A board setting's row, under its own button, stops short of
            // the board menu's cross: it ends, at the furthest, under the
            // setting beside it, as the toolbar's rows start under the
            // tool beside its cross.
            if (control.parentElement.id === 'board-actions') {
                left = Math.min(left, $('#board-actions').getBoundingClientRect().right - width);
            }
        }
        panel.style.left = `${Math.round(Math.max(minX, Math.min(maxX, left)))}px`;
        panel.style.top = `${Math.round(Math.max(minY, Math.min(maxY, top)))}px`;
    }

    // Where a setting's button sits, or, for the toolbar's (the faces, its
    // first tool), where it is sliding out to: one step on from the cross.
    function anchorOf(control) {
        const rect = summaryOf(control).getBoundingClientRect();
        if (!control.closest('#toolbar')) {
            return rect;
        }
        const {left, top} = firstToolPlace();
        return {left, top, right: left + rect.width, bottom: top + rect.height};
    }

    // The toolbar's first tool's place once the row is out, after the
    // cross (whose size is the stylesheet's --close-size), measured from
    // the toolbar itself: the tool may still be sliding out, and the
    // toggle still shrinking to the cross.
    function firstToolPlace() {
        const bar = toolbar.getBoundingClientRect();
        const style = getComputedStyle(toolbar);
        const step = (parseFloat(style.getPropertyValue('--close-size')) || 30) + (parseFloat(style.columnGap) || 6);
        return isLandscape() ? {left: bar.left, top: bar.top + step} : {left: bar.left + step, top: bar.top};
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

    // The board's menu (index.html), a second toolbar at the bottom left:
    // its button brings the board's settings out along the row, wearing a
    // cross while they are out, and puts them back on a second press, as
    // the toolbar's toggle does.
    const boardControl = $('#board-control');
    const boardToggle = $('#board-toggle');
    function setBoardOpen(open) {
        if (!open && openControls[0]?.closest('#board-control')) {
            setOpenControl(null);
        }
        // The board's menu and the toolbar's are one at a time.
        if (open && toolbar.dataset.collapsed !== 'true') {
            setCollapsed(true);
        }
        boardControl.dataset.open = String(open);
        // For the stylesheet: the toolbar's toggle does not dim meanwhile.
        toolbar.dataset.boardOpen = String(open);
        boardToggle.setAttribute('aria-expanded', String(open));
        boardToggle.title = open ? 'Close the board\'s settings' : 'The board';
        boardToggle.setAttribute('aria-label', boardToggle.title);
        $('span', boardToggle).innerHTML = open ? icons.close : icons.board;
    }

    // The controls tucked away behind their first button, or brought back;
    // remembered, like a setting.
    // Tucked away, the toggle wears the tool in use (the clock, the
    // stopwatch, the gallery, or the replay while a game is on); open, a
    // cross, at the start of the row, that tucks it away. Brought back by a
    // tap, the tool's own row comes out with it: the faces, the
    // stopwatch's buttons, or the replay's play and line (those two come
    // and go with the row anyway).
    function setCollapsed(collapsed, openTool = false) {
        setOpenControl(null);
        // The toolbar's menu and the board's are one at a time.
        if (!collapsed) {
            setBoardOpen(false);
        }
        toolbar.dataset.collapsed = collapsed ? 'true' : 'false';
        menuToggle.setAttribute('aria-expanded', String(!collapsed));
        menuToggle.title = collapsed ? 'Show the controls' : 'Hide the controls';
        menuToggle.setAttribute('aria-label', menuToggle.title);
        showToggleIcon();
        writeSetting('menu', collapsed ? 0 : 1);
        if (!collapsed && openTool && tool === 'clock') {
            // With the row, not after it: its second row is placed from
            // the toggle, which does not move (anchorOf).
            setOpenControl($('#face-control'));
        }
    }

    // Each button's place in its row, for the slide in and out.
    function numberRow(row) {
        [...row.children].forEach((child, i) => child.style.setProperty('--i', String(i)));
    }

    function showToggleIcon() {
        $('span', menuToggle).innerHTML = toolbar.dataset.collapsed === 'true' ? icons[tool] : icons.close;
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

    // The information, on the board's top edge (see index.html): `lines`,
    // the first a heading, beside an `icon` if there is one, for `stay`
    // milliseconds, or until hideInfo if that is null. For now, only a
    // replayed game's details (the replay's info button).
    function showInfo(lines, {icon = '', stay = 1600} = {}) {
        $('#info-icon').innerHTML = icon;
        $('#info-text').replaceChildren(...lines.map((line) => {
            const div = document.createElement('div');
            div.textContent = line;
            return div;
        }));
        window.clearTimeout(infoTimer);
        info.getAnimations?.().forEach((animation) => animation.cancel());
        info.style.opacity = '1';
        info.hidden = false;
        placeInfo();
        if (stay !== null) {
            infoTimer = window.setTimeout(() => fadeTo(info, 0, 400), stay);
        }
    }

    function hideInfo() {
        window.clearTimeout(infoTimer);
        if (!info.hidden) {
            fadeTo(info, 0, 400);
        }
    }

    // Centred over the board: in portrait just above its top edge, clear
    // of the stones, but below the toolbar's rows (a tool's own row
    // among them), over the board's edge if it must be; in landscape,
    // where the board reaches nearly to the top of the screen, on the
    // edge, kept on the screen.
    function placeInfo() {
        const board = $('#goban-image')?.getBoundingClientRect();
        if (!board) {
            return;
        }
        const width = info.offsetWidth;
        const height = info.offsetHeight;
        const margin = 10;
        const inset = safeInsets();
        const portrait = window.innerHeight > window.innerWidth;
        let floor = 4 + inset.top;
        if (portrait) {
            [toolbar, replayBar, stopwatchBar, galleryBar].forEach((row) => {
                if (!row.hidden && (row === toolbar || toolbar.dataset.collapsed !== 'true')) {
                    floor = Math.max(floor, row.getBoundingClientRect().bottom + 8);
                }
            });
        }
        const top = Math.max(board.top - (portrait ? height + 8 : height/2), floor);
        const centre = board.left + board.width/2;
        const left = Math.max(margin + inset.left + width/2, Math.min(window.innerWidth - margin - inset.right - width/2, centre));
        info.style.top = `${Math.round(top)}px`;
        info.style.left = `${Math.round(left)}px`;
    }

    const showFace = createSettingControl('face', views, views, (index) => {
        setView(index);
        setTool('clock');
        cancelReplay(goClock);
        goClock.transform();
    }, faceIcons, true, true);
    const showSpeed = createSettingControl('speed', stoneSpeeds.map(([name]) => name), stoneSpeeds.map(([name]) => name), setClockSpeed, speedIcons, true, true);
    const showWood = createSettingControl('wood', woods.map(([name]) => name), woods.map(([name]) => name), setWood, woodIcons, true, true);
    const showPlacement = createSettingControl('placement', placements, placements, setPlacement, precisionIcons, true, true);
    const showBackground = createSettingControl('background', backgrounds.map((table) => table.name), backgrounds.map((table) => table.name), setBackground, backgroundIcons, true, true);

    function setClockSpeed(index) {
        stoneSpeed = wrap(index, stoneSpeeds.length);
        goClock.speed = stoneSpeeds[stoneSpeed][1];
        goClock.pause = stoneSpeeds[stoneSpeed][2];
        goClock.magic = Boolean(stoneSpeeds[stoneSpeed][3]);
        playReplay();
        showSpeed(stoneSpeed);
        writeSetting('pace2', stoneSpeed);
    }

    // The hours, the seconds and the sound, in the tools' row: each shows
    // where it stands by its icon and swaps over when clicked. The hours
    // wear their own figures, 12 or 24; the seconds a dial, and the sound
    // a speaker, each crossed out while it is off.
    function describeToggle(button, text, icon) {
        button.title = text;
        button.setAttribute('aria-label', text);
        button.dataset.info = text;
        $('.setting-icon', button).innerHTML = icon;
    }

    function setMode(index) {
        mode = wrap(index, modes.length);
        goClock.twenty_four_hour = mode === 1;
        describeToggle(modeButton, `Clock: ${modes[mode]}`, icons.hours[mode]);
        writeSetting('mode', mode);
        describeBoard();
    }

    // Whether the second hand and counting stones show at all (faces.js):
    // off, the analogue face drops its second hand, the digital face its
    // ring of counting stones, and the jumping hour face shows its minutes
    // alone rather than over the seconds.
    function setSeconds(index) {
        showSeconds = wrap(index, 2);
        const on = showSeconds === 1;
        goClock.show_seconds = on;
        describeToggle(secondsButton, on ? 'Seconds: On' : 'Seconds: Off', icons.seconds[showSeconds]);
        writeSetting('seconds', showSeconds);
    }

    function setWood(index) {
        wood = wrap(index, woods.length);
        const [, filter, computer = false] = woods[wood];
        const boardImage = $('#goban img:first-child');
        if (boardImage) {
            boardImage.style.filter = filter;
            const src = computer ? computerBoardSrc : gobanImageSrc;
            if (!boardImage.src.endsWith(src) && boardImage.src !== src) {
                boardImage.src = src;
            }
        }
        setFlatStones(computer);
        goClock.flat_stones = computer;
        // The stones already showing change with the board.
        $$('#goban img.stone').forEach((image) => {
            if (!image.hidden && image.src) {
                image.src = stoneImageSrc(colourOfImage(image), image.src);
            }
        });
        showWood(wood);
        writeSetting('wood', wood);
    }

    function setSound(index) {
        sound = wrap(index, 2);
        const on = sound === 1;
        sounds.setEnabled(on);
        goClock.sound = on ? sounds : null;
        describeToggle(muteButton, on ? 'Sound: On' : 'Sound: Off', icons.sound[sound]);
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
        // The clock's button wears the clock, whichever face is showing.
        $('.setting-icon', summaryOf($('#face-control'))).innerHTML = icons.clock;
        writeSetting('view', view);
        showToggleIcon();
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
        writeSetting('background2', background);
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

    // The clock, the stopwatch, a game replayed on the board (replay.js)
    // and the gallery are one at a time, like radio buttons: the face's button
    // is pressed while the board is the clock's, the stopwatch's while it
    // shows the stopwatch, and the replay's while a game is on it. The
    // replay's starts a game, picked at random; the face's opens the
    // faces; either of the face's or the stopwatch's takes the board from
    // whichever tool has it, stopping a game but never the stopwatch,
    // which runs on to be found where it has got to. The game is named as
    // it starts, and its result given as it ends.
    const faceSummary = summaryOf($('#face-control'));
    const toolButtons = {clock: faceSummary, stopwatch: stopwatchButton, replay: replayButton, gallery: galleryButton};
    // The tool in use: its button pressed, worn by the toggle and first in
    // the row, and its own row beneath (the replay's bar, the stopwatch's
    // buttons) out with the toolbar's; the board shows the stopwatch while
    // that is the tool. Remembered, but a game is not taken up again: on
    // a reload that is the clock.
    function setTool(name) {
        const previous = tool;
        tool = name;
        Object.entries(toolButtons).forEach(([key, button]) => button.setAttribute('aria-pressed', String(key === name)));
        goClock.stopwatch = name === 'stopwatch' ? stopwatch : null;
        replayBar.hidden = name !== 'replay';
        stopwatchBar.hidden = name !== 'stopwatch';
        galleryBar.hidden = name !== 'gallery';
        if (name !== 'replay') {
            showGameInfo(false);
        }
        // The faces are the clock's own row, in the place another tool's
        // takes: they go when it does.
        if (name !== 'clock' && openControls.includes($('#face-control'))) {
            setOpenControl(null);
        }
        if (name === 'gallery') {
            showPicture();
        } else {
            goClock.picture = null;
            window.clearTimeout(galleryTimer);
            galleryTimer = null;
        }
        writeSetting('tool', name);
        showToggleIcon();
        placeToolBars();
        describeBoard();
    }

    // The board to the clock or the stopwatch, from whichever tool has it:
    // at once, though the clock may take the board back from a game only
    // once the hands have landed what they carry. The hands make the new
    // face as they would a face chosen.
    function useTool(name) {
        if (tool !== name) {
            setTool(name);
            cancelReplay(goClock);
            goClock.transform();
        }
    }

    // Instead of the button's own opening and closing of the faces: chosen,
    // the clock always shows them. Pressed again while it is already the
    // tool in use, it puts the row away instead, as each tool's button does
    // (below).
    faceSummary.addEventListener('click', (event) => {
        event.stopImmediatePropagation();
        if (tool === 'clock') {
            setCollapsed(true);
            return;
        }
        useTool('clock');
        setOpenControl($('#face-control'));
    }, true);

    // A tool's own row (index.html), beneath the toolbar's and from under
    // its first tool (the clock, after the toggle's cross), and, for the
    // replay's line, on to the board's right edge; in landscape, beside
    // that button, running down (the line to the board's foot). It comes
    // and goes with the toolbar's own row when that is tucked away or
    // brought back (the CSS, keyed off the toolbar's data-collapsed). The
    // first tool's place is measured from the toolbar (firstToolPlace):
    // the tool itself may still be sliding out.
    function placeToolBar(bar, stretch) {
        const board = $('#goban-image')?.getBoundingClientRect();
        if (!board || bar.hidden) {
            return;
        }
        const row = toolbar.getBoundingClientRect();
        const first = firstToolPlace();
        // The row beneath the toolbar's, spaced as the toolbar's own are.
        const gap = parseFloat(getComputedStyle(bar).columnGap) || 6;
        if (isLandscape()) {
            const top = first.top;
            Object.assign(bar.style, {
                left: `${Math.round(row.right + gap)}px`,
                top: `${Math.round(top)}px`,
                width: '',
                height: stretch ? `${Math.round(board.bottom - top)}px` : ''
            });
        } else {
            const left = first.left;
            Object.assign(bar.style, {
                left: `${Math.round(left)}px`,
                top: `${Math.round(row.bottom + gap)}px`,
                width: stretch ? `${Math.round(board.right - left)}px` : '',
                height: ''
            });
        }
    }

    function placeToolBars() {
        placeToolBar(replayBar, true);
        placeToolBar(stopwatchBar, false);
        placeToolBar(galleryBar, false);
    }

    // The stopwatch's buttons (index.html), as a stopwatch has them: start
    // or stop, one button that shows which it would do (a play triangle,
    // or the pause bars), and reset, greyed out unless the stopwatch is
    // stopped with a time on it.
    const stopwatchBar = $('#stopwatch-bar');
    const stopwatchStart = $('#stopwatch-start');
    const stopwatchReset = $('#stopwatch-reset');

    function showStopwatchControls() {
        const label = stopwatch.running ? 'Stop' : 'Start';
        stopwatchStart.title = label;
        stopwatchStart.setAttribute('aria-label', label);
        $('.setting-icon', stopwatchStart).innerHTML = stopwatch.running ? icons.pause : icons.play;
        stopwatchReset.disabled = stopwatch.running || stopwatch.elapsed() === 0;
    }

    // Started, stopped or reset: saved, and the board taken to the new
    // face in a single magic change (magic.js), whatever the hand's
    // speed, as a replay is taken to a move (replay.js). The hundredths a
    // stop brings out are to be read now, not once the hands have got
    // there; and a start puts them away again as quickly, before the
    // seconds they are in the way of move on.
    function stopwatchChanged() {
        writeSetting('stopwatch', JSON.stringify(stopwatch));
        showStopwatchControls();
        describeBoard();
        if (goClock.stopwatch) {
            goClock.magic_once = true;
            goClock.transform();
        }
    }

    function startOrStopStopwatch() {
        if (stopwatch.running) {
            stopwatch.stop();
        } else {
            stopwatch.start();
        }
        stopwatchChanged();
    }

    // The gallery (gallery.js): its pictures in an order shuffled afresh
    // each time the page opens, one on the board at a time and named on
    // its top edge while it is. Playing, the hands make each picture, it
    // stays for half a minute once made, and the next is begun; paused,
    // the picture stays. Back and on move a picture either way, playing
    // or not, and the hands start on it at once.
    const galleryBar = $('#gallery-bar');
    const galleryBack = $('#gallery-back');
    const galleryPlay = $('#gallery-play');
    const galleryNext = $('#gallery-next');
    const galleryPictures = shuffledPictures();
    const galleryWait = 30000;
    let galleryIndex = 0;
    let galleryPlaying = true;
    let galleryTimer = null;

    function showPicture() {
        const picture = galleryPictures[galleryIndex];
        goClock.picture = pictureBoard(picture);
        window.clearTimeout(galleryTimer);
        galleryTimer = null;
    }

    function stepGallery(step) {
        galleryIndex = wrap(galleryIndex + step, galleryPictures.length);
        showPicture();
        goClock.transform();
    }

    function showGalleryPlay() {
        const label = galleryPlaying ? 'Pause' : 'Play';
        galleryPlay.title = label;
        galleryPlay.setAttribute('aria-label', label);
        $('.setting-icon', galleryPlay).innerHTML = galleryPlaying ? icons.pause : icons.play;
    }

    // The hands have made the picture (go-clock.js): the wait before the
    // next, if the gallery is playing and not already waiting.
    goClock.onFinished = () => {
        if (tool === 'gallery' && galleryPlaying && galleryTimer === null) {
            galleryTimer = window.setTimeout(() => {
                galleryTimer = null;
                stepGallery(1);
            }, galleryWait);
        }
    };

    // The replay's bar (index.html): play or pause, next to the game's
    // line, with a marker at the move the board shows, which can be dragged
    // to any move, while a game is running (placeToolBar, above).
    const replayBar = $('#replay-bar');
    const replayTrack = $('#replay-track');
    const replayMarker = $('#replay-marker');
    let replayMoves = 0;

    function showReplayProgress(moves, total) {
        replayMoves = total;
        replayTrack.setAttribute('aria-valuemax', String(total));
        replayTrack.setAttribute('aria-valuenow', String(moves));
        replayTrack.setAttribute('aria-valuetext', `Move ${moves} of ${total}`);
        replayMarker.style.setProperty('--progress', total > 0 ? String(moves/total) : '0');
    }

    // Held where it is, or playing at the rate for the hand's speed: the
    // play button shows the one it would change to.
    const playButton = $('#replay-play');
    let replayPaused = false;

    function playReplay() {
        setReplayRate(goClock, replayPaused ? 0 : playbackRates[stoneSpeed]);
        const label = replayPaused ? 'Play' : 'Pause';
        playButton.title = label;
        playButton.setAttribute('aria-label', label);
        playButton.dataset.info = replayPaused ? 'Replay: Paused' : 'Replay: Playing';
        $('.setting-icon', playButton).innerHTML = replayPaused ? icons.play : icons.pause;
    }

    // The marker dragged (or the line touched): the move under the pointer,
    // from the first at the left (or top) to the last at the right (or
    // bottom), and the board taken there as it goes.
    let scrubbing = null;
    function moveUnderPointer(event) {
        const rect = replayTrack.getBoundingClientRect();
        const inset = 8;
        const along = isLandscape()
            ? (event.clientY - rect.top - inset)/(rect.height - 2*inset)
            : (event.clientX - rect.left - inset)/(rect.width - 2*inset);
        return Math.round(Math.max(0, Math.min(1, along))*replayMoves);
    }
    function scrubTo(move) {
        if (goClock.replay && move !== scrubbing?.move && seekReplay(goClock, move)) {
            scrubbing.move = move;
        }
    }
    replayTrack.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary || !goClock.replay) {
            return;
        }
        event.preventDefault();
        scrubbing = {id: event.pointerId, move: null};
        replayTrack.setPointerCapture(event.pointerId);
        scrubTo(moveUnderPointer(event));
    });
    replayTrack.addEventListener('pointermove', (event) => {
        if (scrubbing && event.pointerId === scrubbing.id) {
            scrubTo(moveUnderPointer(event));
        }
    });
    function endScrub(event) {
        if (scrubbing && event.pointerId === scrubbing.id) {
            if (event.type === 'pointerup') {
                scrubTo(moveUnderPointer(event));
            }
            scrubbing = null;
        }
    }
    replayTrack.addEventListener('pointerup', endScrub);
    replayTrack.addEventListener('pointercancel', endScrub);
    replayTrack.addEventListener('keydown', (event) => {
        const step = {ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1, Home: -Infinity, End: Infinity}[event.key];
        if (step === undefined || !goClock.replay) {
            return;
        }
        event.preventDefault();
        const now = Number(replayTrack.getAttribute('aria-valuenow'));
        seekReplay(goClock, Math.max(0, Math.min(replayMoves, now + step)));
    });

    // The replay's info button: the game's details (sgf.js) on the
    // board's top edge while it is pressed, as long as there is a game to
    // tell of; pressed again, or the game gone, and they go.
    const infoButton = $('#replay-info');
    let replayGame = null;

    function showGameInfo(show) {
        const shown = show && replayGame !== null;
        infoButton.setAttribute('aria-pressed', String(shown));
        infoButton.disabled = replayGame === null;
        if (shown) {
            showInfo(gameDetails(replayGame.info), {icon: icons.replay, stay: null});
        } else {
            hideInfo();
        }
    }

    // A game that has not yet come to its end is left for the next,
    // swept off the board as a first game is; one still being replayed
    // hands over when it has let go of the board (the replay's onEnd).
    let nextGameWanted = false;
    function nextGame() {
        if (goClock.replay) {
            nextGameWanted = true;
            cancelReplay(goClock);
        } else {
            startGame();
        }
    }

    function startGame() {
        const loading = loadGame(`games/${nextGameFile()}`);
        const began = startReplay(goClock, loading, {
            onStart: (game) => {
                showReplayProgress(0, game.moves.length);
            },
            onProgress: showReplayProgress,
            // Held at its last move rather than handed back to the clock:
            // play starts it again from the beginning, and the replay
            // button gives the board back to the time.
            onRest: () => {
                replayPaused = true;
                playReplay();
            },
            // The board is the clock's again, unless another tool has
            // already taken it, or the next game is wanted: that begins
            // once the transform this is called from is done with the
            // board, and if it cannot, the clock has it.
            // The game's details, if showing, stay for the next game's to
            // replace (startGame).
            onEnd: (error) => {
                replayGame = null;
                if (nextGameWanted && !error && tool === 'replay') {
                    nextGameWanted = false;
                    window.setTimeout(() => {
                        if (tool === 'replay' && !goClock.replay && !startGame()) {
                            setTool('clock');
                        }
                    }, 0);
                    return;
                }
                nextGameWanted = false;
                showGameInfo(false);
                if (tool === 'replay') {
                    setTool('clock');
                }
                if (error) {
                    console.error('The game could not be replayed', error);
                }
            }
        });
        if (began) {
            // Its details to be had as soon as the record is in. Those of
            // the game before, still showing (the next button), stay until
            // then, and are replaced by this one's.
            const replay = goClock.replay;
            replayGame = null;
            infoButton.disabled = infoButton.getAttribute('aria-pressed') !== 'true';
            loading.then((game) => {
                if (goClock.replay === replay) {
                    replayGame = game;
                    showGameInfo(infoButton.getAttribute('aria-pressed') === 'true');
                }
            }, () => {});
            setTool('replay');
            replayPaused = false;
            playReplay();
            // Straight away, while the board is still being cleared.
            showReplayProgress(0, 0);
        }
        return began;
    }

    function toggleReplay() {
        if (goClock.replay) {
            cancelReplay(goClock);
        } else {
            startGame();
        }
    }

    // The next (or previous) face or background: what the arrow keys do.
    // A face is the clock's, so the board goes back to the clock for it.
    function changeView(step) {
        setView(view + step);
        setTool('clock');
        cancelReplay(goClock);
        goClock.transform();
    }

    function changeBackground(step) {
        setBackground(background + step);
    }

    // What the board shows, for assistive tech: a grid of stones means
    // nothing to a screen reader, so the board's label carries the time,
    // or the stopwatch's (its hundredths once it has stopped, as the
    // board has them).
    function describeBoard() {
        if (tool === 'stopwatch') {
            const ms = stopwatch.elapsed();
            const two = (n) => String(n).padStart(2, '0');
            const time = `${Math.floor(ms/60000)}:${two(Math.floor(ms/1000)%60)}`;
            const reading = stopwatch.running ? `${time}, running` : `${time}.${two(Math.floor(ms/10)%100)}, stopped`;
            goban.setAttribute('aria-label', `Go board stopwatch showing ${reading}`);
            return;
        }
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
        placeToolBars();
        if (!info.hidden) {
            placeInfo();
        }
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
    $('#stopwatch .setting-icon').innerHTML = icons.stopwatch;
    $('.setting-icon', stopwatchReset).innerHTML = icons.reset;
    showStopwatchControls();
    $('#tools-control .setting-icon').innerHTML = icons.tools;
    setBoardOpen(false);
    boardToggle.addEventListener('click', () => setBoardOpen(boardControl.dataset.open !== 'true'));
    $('#about .setting-icon').innerHTML = icons.about;
    setClockSpeed(stoneSpeed);
    setView(view);
    setBackground(background);
    setMode(mode);
    setSeconds(showSeconds);
    setPlacement(placement);
    setSound(sound);
    // The clock, or the stopwatch if that was on the board when the page
    // was last shut.
    const storedTool = readSetting('tool');
    setTool(storedTool === 'stopwatch' || storedTool === 'gallery' ? storedTool : 'clock');
    goClock.haptic = haptic;

    // The hand: up to two fingers on the board or its surround are the
    // hand (go-clock.js) from the moment each lands until it lifts,
    // pushing the stones about. A third finger touching down is left
    // alone rather than crowding the board.
    const hands = new Set();

    goban.addEventListener('pointerdown', (event) => {
        if (hands.has(event.pointerId)) {
            return;
        }
        if (goClock.fingerDown(event.pointerId, event.clientX, event.clientY)) {
            hands.add(event.pointerId);
            haptic('prepare');
            // So the release is heard even if it lands on the toolbar.
            goban.setPointerCapture(event.pointerId);
        }
    });
    goban.addEventListener('pointermove', (event) => {
        if (hands.has(event.pointerId)) {
            goClock.fingerMove(event.pointerId, event.clientX, event.clientY);
        }
    });
    function endPointer(event) {
        if (hands.has(event.pointerId)) {
            goClock.fingerUp(event.pointerId);
            hands.delete(event.pointerId);
        }
    }
    goban.addEventListener('pointerup', endPointer);
    goban.addEventListener('pointercancel', endPointer);
    // Browsers that ignore -webkit-user-drag would otherwise pick the board
    // image up and cancel the hand.
    goban.addEventListener('dragstart', (event) => event.preventDefault());
    // Keys: the arrows change the face (left and right) and the background
    // (up and down), M mutes, R replays a game, S shows the stopwatch (or
    // the clock again) and the space bar starts and stops it while it is
    // showing, I is the about box.
    const keyActions = {
        ArrowRight: () => changeView(1),
        ArrowLeft: () => changeView(-1),
        ArrowDown: () => changeBackground(1),
        ArrowUp: () => changeBackground(-1),
        m: () => {
            setSound(sound === 1 ? 0 : 1);
        },
        r: toggleReplay,
        s: () => useTool(tool === 'stopwatch' ? 'clock' : 'stopwatch'),
        ' ': startOrStopStopwatch,
        i: () => aboutButton.click()
    };
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setOpenControl(null);
            hideAbout();
        } else if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            // The space bar is the stopwatch's only while it is on the
            // board, and never on a button, whose own press it is.
            if (key === ' ' && (tool !== 'stopwatch' || event.target.closest?.('button'))) {
                return;
            }
            const action = keyActions[key];
            if (action) {
                event.preventDefault();
                action();
            }
        }
    });
    // A touch anywhere outside the about box closes it (each menu and
    // submenu closes only on its own button, not on a touch elsewhere:
    // openOnClick, setCollapsed, setBoardOpen). Heard on pointerdown,
    // touchstart and click alike: iOS is choosy about which taps become
    // clicks, a swipe never does, and closing twice is harmless.
    function closeOutside(event) {
        // A toggle redraws its own icon as it is clicked, so by the time
        // the click reaches here what was touched may have gone: it was
        // inside, not out.
        if (!event.target.isConnected) {
            return;
        }
        if (!aboutBox.hidden && !aboutBox.contains(event.target) && !aboutButton.contains(event.target)) {
            hideAbout();
        }
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('touchstart', closeOutside, {passive: true});
    document.addEventListener('click', closeOutside);
    document.addEventListener('pointerdown', wakeToggle);
    document.addEventListener('touchstart', wakeToggle, {passive: true});

    openOnClick($('#tools-control'));
    muteButton.addEventListener('click', () => {
        setSound(sound === 1 ? 0 : 1);
    });
    // Each tool's button, pressed while its tool is the one in use, puts
    // the toolbar's row away instead of doing what it otherwise would
    // (starting a game, opening the gallery, starting the stopwatch): the
    // other way to tuck the row away, along with the toggle's cross
    // (menuToggle).
    replayButton.addEventListener('click', () => {
        if (tool === 'replay') {
            setCollapsed(true);
            return;
        }
        if (!goClock.replay) {
            startGame();
        }
    });
    $('#gallery .setting-icon').innerHTML = icons.gallery;
    $('.setting-icon', galleryBack).innerHTML = icons.back;
    $('.setting-icon', galleryNext).innerHTML = icons.next;
    showGalleryPlay();
    galleryButton.addEventListener('click', () => {
        if (tool === 'gallery') {
            setCollapsed(true);
            return;
        }
        useTool('gallery');
    });
    galleryBack.addEventListener('click', () => stepGallery(-1));
    galleryNext.addEventListener('click', () => stepGallery(1));
    galleryPlay.addEventListener('click', () => {
        galleryPlaying = !galleryPlaying;
        showGalleryPlay();
        window.clearTimeout(galleryTimer);
        galleryTimer = null;
        // Played again with the picture made: the wait starts now.
        goClock.transform();
    });
    stopwatchButton.addEventListener('click', (event) => {
        if (tool === 'stopwatch') {
            setCollapsed(true);
        } else {
            useTool('stopwatch');
        }
        // Clicked rather than pressed from the keyboard, it lets go of the
        // focus it took, which would have the space bar pressing it again
        // rather than starting the stopwatch.
        if (event.detail > 0) {
            stopwatchButton.blur();
        }
    });
    stopwatchStart.addEventListener('click', startOrStopStopwatch);
    stopwatchReset.addEventListener('click', () => {
        stopwatch.reset();
        stopwatchChanged();
    });
    $('.setting-icon', $('#replay-next')).innerHTML = icons.next;
    $('#replay-next').addEventListener('click', nextGame);
    $('.setting-icon', infoButton).innerHTML = icons.about;
    showGameInfo(false);
    infoButton.addEventListener('click', () => showGameInfo(infoButton.getAttribute('aria-pressed') !== 'true'));
    playButton.addEventListener('click', () => {
        const atEnd = replayMoves > 0 && Number(replayTrack.getAttribute('aria-valuenow')) >= replayMoves;
        if (replayPaused && atEnd) {
            seekReplay(goClock, 0);
        }
        replayPaused = !replayPaused;
        playReplay();
    });
    modeButton.addEventListener('click', () => {
        setMode(mode === 1 ? 0 : 1);
        goClock.transform();
    });
    secondsButton.addEventListener('click', () => {
        setSeconds(showSeconds === 1 ? 0 : 1);
        goClock.transform();
    });
    menuToggle.addEventListener('click', () => setCollapsed(toolbar.dataset.collapsed !== 'true', true));
    aboutButton.addEventListener('click', () => {
        setOpenControl(null);
        if (aboutBox.hidden) {
            showAbout();
        } else {
            hideAbout();
        }
    });
    numberRow($('#toolbar-actions'));
    numberRow($('#board-actions'));

    resizeClock();
    // The controls as they were left: up, the first time.
    setCollapsed(readIndex('menu', 1, 2) === 0);
    registerServiceWorker();
    keepScreenAwake();
    document.addEventListener('visibilitychange', keepScreenAwake);
    window.addEventListener('resize', scheduleResize);
    // On a phone the safe area can arrive after the first layout, moving
    // the toolbar down clear of the notch with no resize to say so; all
    // that is placed from it (a tool's row, an open list) moves with it.
    const toolbarPlace = document.createElement('div');
    toolbarPlace.className = 'toolbar-place';
    toolbarPlace.setAttribute('aria-hidden', 'true');
    document.body.append(toolbarPlace);
    new ResizeObserver(() => {
        placeToolBars();
        openControls.forEach(placePanel);
    }).observe(toolbarPlace);
    setInterval(() => {
        storeGobanState();
        describeBoard();
    }, 10000);
    goClock.transform();
});

