// A game replayed on the clock: the board is cleared — swept, the stones
// pushed off onto the table (sweep.js), or in space flung off in all
// directions into the dark; then the game record (sgf.js) is played
// through, a stone at a time on an even beat, each flying in from the
// table while there are any there and then from the bowl, and the stones
// a move captures lifted off as it lands; then, after a moment with the
// finished game on the board, the clock takes the board back and its
// hands make the time of it as they always do.
//
// The hands have no part in it: the clock (go-clock.js) keeps the replay
// under way as `clock.replay`, and while there is one its transform()
// hands the board to replayTransform(), which sets the stones flying as
// the magic does (magic.js), whatever the speed setting. The game is a
// run of positions (`stages`), one per move, or two for a move that
// captures: the stone down, then the captured stones off. What matters is
// the cadence the stones land at, `rate` a second (setReplayRate; 0 holds
// the game where it is), each setting off as long before its moment as
// its own flight takes (planPlacements). A drag of the marker
// (seekReplay), the page opened on a game, or a finger that has disturbed
// the board, takes the board to the position in one quick magic change,
// and the game goes on from there on its beat. A change of face, or the
// button again, cancels the replay (cancelReplay), and the clock carries
// on from the board as it stands.

import {gridsize, emptyBoard, white, pointX, pointY} from './board.js';
import {chooser} from './planner.js';
import {flightTime, crossTimeFor, launchFlight, magicTransform, takeFromTable} from './magic.js';
import {parseSgf, playGame} from './sgf.js';
import {sweepBoard} from './sweep.js';
import {flyOn} from './flight.js';
import {setTumbling} from './physics.js';
import {$, setVisible, setStoneShadow, cancelElementAnimations} from './stone-dom.js';

// The games that come with the clock, in www/games, on three shelves:
// the castle games and the great matches of the Edo houses, played on the
// floor before the shogun; the modern professional era, from the first
// newspaper matches of the 1920s to last year's titles; and the games an
// engine played. Shusai's three games sit at the head of the modern shelf:
// he was the last of the hereditary Honinbo, but those games were the
// newspaper spectacles the modern era began with.
export const gameCategories = [
    {
        key: 'historical',
        label: 'Historical',
        title: 'A game from the Edo houses',
        files: [
        'dosaku-tengen.sgf',
        'dosaku-santetsu-1683.sgf',
        'genjo-chitoku-jigo.sgf',
        'chitoku-genjo-1815.sgf',
        'jowa-genjo-1815.sgf',
        'blood-vomiting.sgf',
        'shuwa-gennan-1840.sgf',
        'shuwa-gennan-1842.sgf',
        'ear-reddening.sgf',
        'shusaku-castle-1.sgf',
        'shusaku-castle-4.sgf',
        'shusaku-castle-6.sgf',
        'shusaku-castle-8.sgf',
        'shusaku-castle-10.sgf',
        'shusaku-castle-13.sgf',
        'shusaku-castle-16.sgf',
        'shusaku-castle-19.sgf',
        ]
    },
    {
        key: 'modern',
        label: 'Modern',
        title: 'A game from the modern era',
        files: [
        'shusai-karigane-1926.sgf',
        'go-seigen-shusai.sgf',
        'shusai-retirement.sgf',
        'go-seigen-kitani-7-dan.sgf',
        'go-seigen-kitani-fever.sgf',
        'go-seigen-kitani-kamakura-8.sgf',
        'honinbo-1941.sgf',
        'go-seigen-fujisawa-1944.sgf',
        'atomic-bomb.sgf',
        'go-seigen-fujisawa-1952.sgf',
        'go-seigen-sakata-1954.sgf',
        'go-seigen-takagawa-1956.sgf',
        'honinbo-1961.sgf',
        'meijin-1965.sgf',
        'honinbo-1971.sgf',
        'meijin-1975.sgf',
        'meijin-1976.sgf',
        'kisei-1977.sgf',
        'meijin-1980.sgf',
        'kisei-1982.sgf',
        'kisei-1983.sgf',
        'judan-1984.sgf',
        'honinbo-1985.sgf',
        'kisei-1987.sgf',
        'meijin-1988.sgf',
        'ing-cup-1989.sgf',
        'honinbo-1990.sgf',
        'kisei-1996.sgf',
        'fujitsu-cup-1996.sgf',
        'chunlan-cup-1999.sgf',
        'lg-cup-2009.sgf',
        'meijin-2009.sgf',
        'samsung-cup-2020.sgf',
        'honinbo-2023.sgf',
        ]
    },
    {
        key: 'ai',
        label: 'AI',
        title: 'A game an engine played',
        files: [
        'alphago-fan-hui-1.sgf',
        'alphago-lee-sedol-1.sgf',
        'alphago-lee-sedol-2.sgf',
        'alphago-lee-sedol-3.sgf',
        'alphago-lee-sedol-4.sgf',
        'alphago-lee-sedol-5.sgf',
        'master-ke-jie.sgf',
        'alphago-ke-jie-2.sgf',
        ]
    }
];

// Every game, whatever shelf it is on.
export const gameFiles = gameCategories.flatMap((category) => category.files);

// How long the flung stones take to rise out of sight, and so have the
// board to themselves before the first stone of the game arrives (a
// sweep takes its own time), and how long the finished game stays before
// the clock takes the board back, in ms.
const flingTime = 2500;
const restTime = 6000;

// The next game to replay from a given set: each of its files once, in a
// random order, then shuffled again. A set keeps its own deck, so one
// shelf being worked through does not disturb another's.
const decks = new Map();
export function nextGameFile(files = gameFiles) {
    let deck = decks.get(files);
    if (!deck || deck.length === 0) {
        deck = [...files];
        for (let i = deck.length - 1; i > 0; --i) {
            const j = Math.floor(Math.random()*(i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        decks.set(files, deck);
    }
    return deck.pop();
}

// A game fetched and played out: {info, moves, stages} (see sgf.js for
// the first two), the stages the positions the board goes through.
export async function loadGame(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${url}: ${response.status}`);
    }
    const game = parseSgf(await response.text());
    const moves = playGame(game.moves);
    return {info: game.info, moves, stages: gameStages(moves)};
}

// The positions a game goes through, from the moves with their captures:
// {board, stoneMore, move} for each, `stoneMore` when the position is the
// one before with a stone added (as against captured stones taken off),
// and `move` the index of the move it belongs to.
export function gameStages(moves) {
    const board = emptyBoard();
    const stages = [];
    moves.forEach((move, index) => {
        board[move.point] = move.colour;
        if (move.captures.length > 0) {
            stages.push({board: [...board], stoneMore: true, move: index});
            move.captures.forEach((point) => {
                board[point] = 0;
            });
            stages.push({board: [...board], stoneMore: false, move: index});
        } else {
            stages.push({board: [...board], stoneMore: true, move: index});
        }
    });
    return stages;
}

// The last stage of a move: the position once its stone is down and its
// captures are off. -1 for `move` -1, the board before the first.
export function stageOfMove(stages, move) {
    let at = -1;
    while (at + 1 < stages.length && stages[at + 1].move <= move) {
        ++at;
    }
    return at;
}

// The replay begun: the board cleared, and the game, once `loading`
// (a promise of loadGame's game) has it, played through. `onStart` is
// called with the game as its first stone sets out, `onRest` with it as
// the last lands, `onEnd` when the clock has the board back, with the
// error if the game could not be had, and `onProgress` with the number
// of moves the board shows whenever that changes. Returns whether it
// began: not while a finger is on the board, the board is being swept,
// or a replay is already under way. `from`, a number of moves, takes the
// game up where it was left when the page was last shut: the board is not
// cleared, being that game's already, and is taken to that move in one
// magic change once the record is in, if it does not show it already.
export function startReplay(clock, loading, {onStart = null, onRest = null, onEnd = null, onProgress = null, from = null} = {}) {
    if (clock.replay || clock.sweeping_board || clock.finger || typeof document === 'undefined') {
        return false;
    }
    const replay = {
        game: null,
        stage: 0, // The first position the board has not yet reached
        cleared: false,
        started: false,
        resting: false,
        rate: 0, // Stones a second; my-clock.js sets it as the game starts
        planned: 0, // The first stage whose stone is not yet planned
        nextLandAt: 0, // When the next stone may land (performance.now())
        wake: null, // A timer: the next stones to plan
        seeking: null, // The stage the board is being taken to, or null
        cancelled: false,
        error: null,
        timer: null,
        onStart,
        onRest,
        onEnd,
        onProgress
    };
    clock.replay = replay;
    window.clearTimeout(clock.idle_timer);

    // The game begins once the board is clear and the record is here. In
    // space the stones are flung off; elsewhere the board is swept, and
    // the sweep calls transform() once the stones have come to rest.
    if (from !== null) {
        replay.cleared = true;
    } else if (clock.table_void) {
        flingStones(clock);
        replay.timer = window.setTimeout(() => {
            replay.timer = null;
            replay.cleared = true;
            clock.transform();
        }, flingTime);
    } else {
        replay.cleared = true;
        sweepBoard(clock);
    }
    loading.then((game) => {
        if (clock.replay === replay) {
            replay.game = game;
            if (from === null || !seekReplay(clock, from)) {
                clock.transform();
            }
        }
    }, (error) => {
        if (clock.replay === replay) {
            replay.error = error;
            cancelReplay(clock);
        }
    });
    return true;
}

// A stone lands on the board every `1000/rate` ms while the game plays,
// each flying in as the magic's do (magic.js) from the nearest stone of
// its colour on the table, or else from the bowl, and setting off as
// long before its moment as its flight takes. Every stone travels at the
// one steady pace (crossTimeFor), whatever the beat: a faster beat has
// more of them in the air at once, not each going faster; and a stone
// from far across the table takes longer than one dropped in from the
// bowl, so it may set off before a stone that lands ahead of it. The
// stones landing within `horizon` ms are planned (which stone, from
// where) and set waiting for their moment; the rest as their turn comes
// nearer. It is longer than any flight, so each can set off in time.
const horizon = 5000;

// The next stones to land, planned: for each placing stage from `stage`
// (the first not yet planned) on, which stone of the table's to fetch
// (the nearest of its colour to its point, a tie either way by chance),
// or the bowl, and when it lands and so sets off. Each lands a beat
// (`1000/rate` ms) after the one before, on from `nextLandAt` if that is
// still to come; starting afresh (nothing on the beat yet), the first
// lands as soon as every stone planned with it can keep the beat after
// it, so none is late. Only those landing within `horizon` ms of `now`
// are planned (from the first, starting afresh). `tableStones` are
// {colour, coords}; `travel(entry, point)` a flight's ms, from that table
// stone (null, the bowl) to that point. Pure, for the tests: returns the
// plans, {stage, move, entry, landAt, departAt}, the stage it stopped at
// and when the next stone after them lands. A capture's second stage
// (the stones taken off) is not a stone to place: it goes with its move's.
export function planPlacements({stages, moves, stage, nextLandAt, now, rate, tableStones, travel, random = Math.random}) {
    const beat = 1000/rate;
    const table = [...tableStones];
    const onBeat = nextLandAt > now ? nextLandAt : null;
    const picks = [];
    while (stage < stages.length) {
        if (!stages[stage].stoneMore) {
            ++stage;
            continue;
        }
        if ((onBeat ?? now) + picks.length*beat - now > horizon) {
            break;
        }
        const move = moves[stages[stage].move];
        const nearest = chooser(random);
        table.forEach((entry) => {
            if (entry.colour == move.colour) {
                nearest.offer(entry, Math.hypot(entry.coords[0] - pointX(move.point), entry.coords[1] - pointY(move.point)));
            }
        });
        const entry = nearest.best;
        if (entry) {
            table.splice(table.indexOf(entry), 1);
        }
        picks.push({stage, move, entry, flight: travel(entry, move.point)});
        ++stage;
    }
    if (picks.length == 0) {
        return {plans: [], stage, nextLandAt};
    }
    let landAt = onBeat ?? Math.max(...picks.map((pick, i) => now + pick.flight - i*beat));
    const plans = picks.map((pick) => {
        // Never set off before now: a stone planned late lands late, and
        // the beat goes on from it.
        landAt = Math.max(landAt, now + pick.flight);
        const plan = {stage: pick.stage, move: pick.move, entry: pick.entry, landAt, departAt: landAt - pick.flight};
        landAt += beat;
        return plan;
    });
    return {plans, stage, nextLandAt: landAt};
}

// How far a table stone is from a point, in points.
function tableDistance(entry, point) {
    return Math.hypot(entry.coords[0] - pointX(point), entry.coords[1] - pointY(point));
}

// A stone's flight to `point`, in ms: across from the table at the
// replay's steady pace, or dropped in from the bowl.
function travel(entry, point) {
    return entry ? flightTime('table', crossTimeFor(tableDistance(entry, point))) : flightTime('bowl');
}

// The board a game being replayed wants, made (called from the clock's
// transform() while there is a replay): true while the replay has the
// board, false once it is over and the clock has it back. The board is
// first taken to where the game is, if it is not there (a seek, the
// page opened on a game, or a finger having disturbed it), in one quick
// magic change; then, while the game plays, its stones are set going
// on their beat.
export function replayTransform(clock) {
    const replay = clock.replay;
    window.clearTimeout(replay.wake);
    replay.wake = null;
    if (replay.cancelled) {
        unschedule(clock);
        if (clock.magic_flights.length > 0) {
            return true;
        }
        finish(clock);
        return false;
    }
    if (!replay.cleared || !replay.game) {
        clock.stones = emptyBoard();
        return true;
    }
    if (!replay.started) {
        replay.started = true;
        replay.onStart?.(replay.game);
        reportProgress(replay);
    }
    const stages = replay.game.stages;
    // Nothing planned or in the air: the board should show the position
    // reached, and the game is planned on from there.
    if (clock.magic_flights.length == 0) {
        replay.planned = replay.stage;
        if (replay.seeking === null) {
            const reached = replay.stage > 0 ? stages[replay.stage - 1].board : emptyBoard();
            if (!sameBoard(clock.stones_shown, reached)) {
                replay.seeking = replay.stage - 1;
            }
        }
    }
    // Taken to a position: once whatever is in the air has landed, in one
    // quick change, and the game goes on from there.
    if (replay.seeking !== null) {
        if (clock.magic_flights.length > 0) {
            return true;
        }
        const board = replay.seeking < 0 ? emptyBoard() : stages[replay.seeking].board;
        clock.stones = board;
        if (!sameBoard(clock.stones_shown, board) && magicTransform(clock, {quick: true})) {
            return true;
        }
        replay.stage = replay.planned = replay.seeking + 1;
        replay.seeking = null;
        replay.nextLandAt = 0;
        reportProgress(replay);
    }
    clock.stones = replay.stage > 0 ? stages[replay.stage - 1].board : emptyBoard();
    if (replay.rate > 0) {
        schedule(clock);
    }
    if (replay.stage >= stages.length && clock.magic_flights.length == 0) {
        replaySettled(clock);
    }
    return true;
}

// The stones due soon planned (planPlacements) and set waiting for their
// moment, and a look again when the next is due to be planned.
function schedule(clock) {
    const replay = clock.replay;
    const game = replay.game;
    const now = performance.now();
    const {plans, stage, nextLandAt} = planPlacements({
        stages: game.stages,
        moves: game.moves,
        stage: replay.planned,
        nextLandAt: replay.nextLandAt,
        now,
        rate: replay.rate,
        tableStones: clock.table_stones,
        travel
    });
    replay.planned = stage;
    replay.nextLandAt = nextLandAt;
    plans.forEach((plan) => {
        const flight = plan.entry
            ? {kind: 'table', entry: plan.entry, to: plan.move.point, colour: plan.move.colour}
            : {kind: 'bowl', to: plan.move.point, colour: plan.move.colour};
        flight.stage = plan.stage;
        flight.landAt = plan.landAt;
        if (plan.entry) {
            flight.crossTime = crossTimeFor(tableDistance(plan.entry, plan.move.point));
        }
        if (plan.entry) {
            takeFromTable(clock, plan.entry);
        }
        launchFlight(clock, flight, Math.max(0, plan.departAt - now), () => landed(clock, replay, flight));
    });
    if (replay.planned < game.stages.length) {
        replay.wake = window.setTimeout(() => {
            replay.wake = null;
            if (clock.replay === replay && !clock.finger && !clock.sweeping_board) {
                clock.transform();
            }
        }, Math.max(16, replay.nextLandAt - horizon - performance.now()));
    }
}

// A stone of the game down: the position reached, and a capture's stones
// taken off to the bowl at once.
function landed(clock, replay, flight) {
    if (clock.replay !== replay) {
        return;
    }
    clock.sound?.place(flight.colour == white ? 'white' : 'black');
    const stages = replay.game.stages;
    if (!replay.cancelled && replay.seeking === null && flight.stage === replay.stage) {
        replay.stage = flight.stage + 1;
        const next = stages[replay.stage];
        if (next && !next.stoneMore) {
            const before = stages[flight.stage].board;
            for (let i = 0; i < before.length; ++i) {
                if (before[i] != 0 && next.board[i] == 0 && clock.stones_shown[i] != 0) {
                    launchFlight(clock, {kind: 'away', from: i, colour: clock.stones_shown[i]}, 0, () => {
                        if (clock.replay === replay && clock.magic_flights.length == 0 && !clock.finger && !clock.sweeping_board) {
                            clock.transform();
                        }
                    });
                }
            }
            replay.stage += 1;
        }
        reportProgress(replay);
    }
    if (!clock.finger && !clock.sweeping_board) {
        clock.transform();
    }
}

// Of the game's flights (each with its `stage`, and `waiting` until it
// sets off), which to call off: every one still waiting; or, with
// `keepCommitted` (a change of beat), only those after the last stage
// already in the air. A stone from far across the table sets off before
// one from the bowl that lands ahead of it, so one still waiting may
// come before one already flying: calling that off, and planning again
// from it, would plan the flying one a second time, to land on a point
// its first flight has already filled. Pure, for the tests: returns the
// flights to call off.
export function flightsToCallOff(flights, {keepCommitted = false} = {}) {
    const flying = flights.filter((flight) => !flight.waiting && flight.stage !== undefined);
    const lastFlying = keepCommitted && flying.length > 0 ? Math.max(...flying.map((flight) => flight.stage)) : -Infinity;
    return flights.filter((flight) => flight.waiting && !(flight.stage !== undefined && flight.stage <= lastFlying));
}

// The stones planned but not yet set off called off (flightsToCallOff),
// a stone one was to fetch from the table put back on it, and the game
// planned again from the first of them, a beat after the last stone left
// to land.
function unschedule(clock, {keepCommitted = false} = {}) {
    const replay = clock.replay;
    window.clearTimeout(replay.wake);
    replay.wake = null;
    clock.magic_flights.forEach((flight) => {
        flight.waiting = flight.timeoutId != null;
    });
    const callOff = new Set(flightsToCallOff(clock.magic_flights, {keepCommitted}));
    let first = null;
    callOff.forEach((flight) => {
        window.clearTimeout(flight.timeoutId);
        if (flight.kind == 'table') {
            clock.table_stones.push(flight.entry);
        }
        if (flight.stage !== undefined && (first === null || flight.stage < first)) {
            first = flight.stage;
        }
    });
    clock.magic_flights = clock.magic_flights.filter((flight) => !callOff.has(flight));
    if (first !== null) {
        replay.planned = first;
    }
    const left = clock.magic_flights.filter((flight) => flight.landAt !== undefined);
    const last = left.length > 0 ? Math.max(...left.map((flight) => flight.landAt)) : 0;
    replay.nextLandAt = last > 0 && replay.rate > 0 ? last + 1000/replay.rate : 0;
}

// The hands have nothing to do (transform() found no move): if the game
// is over, a moment to look at it, then the board is the clock's again.
function replaySettled(clock) {
    const replay = clock.replay;
    if (!replay.game || replay.rate === 0 || replay.stage < replay.game.stages.length || replay.resting) {
        return;
    }
    replay.resting = true;
    replay.timer = window.setTimeout(() => {
        replay.timer = null;
        finish(clock);
        // The board is the clock's again, and nothing else will ask for it.
        if (!clock.busy() && !clock.finger && !clock.sweeping_board) {
            clock.transform();
        }
    }, restTime);
    // After the timer is set, so that onRest holding the game (a rate of
    // 0) can call it off.
    replay.onRest?.(replay.game);
}

// How many moves the board shows: the move of the last position reached,
// counted from one; or, while it is being taken to a move, that move.
export function movesShown(replay) {
    const at = replay.seeking !== null ? replay.seeking : replay.stage - 1;
    return at >= 0 ? replay.game.stages[at].move + 1 : 0;
}

function reportProgress(replay) {
    if (replay.game) {
        replay.onProgress?.(movesShown(replay), replay.game.moves.length);
    }
}

// How fast the game plays, in stones a second; 0 holds it where it is
// (the stones already in the air land, and any before them still to set
// off, and a game that has finished stays on the board rather than being
// handed back to the clock). The stones after those are planned again on
// the new beat.
export function setReplayRate(clock, rate) {
    const replay = clock.replay;
    if (!replay || replay.cancelled || replay.rate === rate) {
        return;
    }
    replay.rate = rate;
    unschedule(clock, {keepCommitted: true});
    if (rate === 0 && replay.resting) {
        window.clearTimeout(replay.timer);
        replay.timer = null;
        replay.resting = false;
    }
    if (!clock.finger && !clock.sweeping_board) {
        clock.transform();
    }
}

// The replay taken to the position after `move` moves (0, the empty
// board): the board is taken there in one quick magic change, and the
// game goes on from it. Not until the game is under way, nor while a
// finger is on the board.
export function seekReplay(clock, move) {
    const replay = clock.replay;
    if (!replay || replay.cancelled || !replay.game || !replay.cleared || clock.sweeping_board || clock.finger) {
        return false;
    }
    const stages = replay.game.stages;
    unschedule(clock);
    replay.seeking = stageOfMove(stages, Math.max(0, Math.min(replay.game.moves.length, move)) - 1);
    if (replay.resting) {
        window.clearTimeout(replay.timer);
        replay.timer = null;
        replay.resting = false;
    }
    reportProgress(replay);
    clock.transform();
    return true;
}

function sameBoard(a, b) {
    for (let i = 0; i < a.length; ++i) {
        if (a[i] != b[i]) {
            return false;
        }
    }
    return true;
}

// The replay stopped where it is. The stones in the air land first, and
// the last of them finishes the replay; otherwise it is finished now.
export function cancelReplay(clock) {
    const replay = clock.replay;
    if (!replay) {
        return;
    }
    replay.cancelled = true;
    window.clearTimeout(replay.timer);
    replay.timer = null;
    if (!clock.finger && !clock.sweeping_board) {
        // Otherwise the next transform() (the finger going, the sweep
        // settling) finishes it.
        clock.transform();
    }
}

// The board is the clock's again, as it stands.
function finish(clock) {
    const replay = clock.replay;
    window.clearTimeout(replay.timer);
    clock.replay = null;
    replay.onEnd?.(replay.error);
}

// Every stone on the board (and on the table, and in the hands) flung
// away from the middle of the board, into the dark: as in space, each
// flies on as it was sent, tumbling, rising and fading (flight.js). The
// grid points' elements are left bare for the game.
function flingStones(clock) {
    const held = clock.dropHeldStones();
    const diameter = clock.goban_width/20;
    const board = clock.boardRect();
    const middleX = (board.left + board.right)/2;
    const middleY = (board.top + board.bottom)/2;
    const stones = [];

    for (let i = 0; i < gridsize*gridsize; ++i) {
        if (clock.stones_shown[i] == 0) {
            continue;
        }
        const element = $('#p' + i);
        if (!element) {
            continue;
        }
        cancelElementAnimations(element);
        const left = parseFloat(element.style.left) || 0;
        const top = parseFloat(element.style.top) || 0;
        const size = parseFloat(element.style.width) || diameter;
        stones.push(clock.looseStone(element.querySelector('img').src, clock.stones_shown[i], left + size/2, top + size/2));
        element.classList.remove('has-stone');
        setStoneShadow(element, 0);
        setVisible(element.querySelector('.stone-shadow'), false);
        setVisible(element.querySelector('img'), false);
    }
    clock.stones_shown = emptyBoard();
    clock.reset_offsets();
    for (let i = 0; i < gridsize*gridsize; ++i) {
        clock.updateBoardPosition(i, false);
    }

    clock.table_stones.forEach((entry) => {
        stones.push({
            element: entry.element,
            src: entry.src,
            colour: entry.colour,
            x: entry.x,
            y: entry.y,
            r: diameter/2
        });
    });
    clock.table_stones = [];
    stones.push(...held);

    stones.forEach((stone) => {
        // Out from the middle, give or take, but gently, and mostly up
        // towards the eye, turning over as it goes; a stone at the middle
        // goes any way.
        let angle = Math.atan2(stone.y - middleY, stone.x - middleX);
        if (Math.hypot(stone.x - middleX, stone.y - middleY) < diameter) {
            angle = Math.random()*2*Math.PI;
        }
        angle += (Math.random() - 0.5)*0.5;
        const speed = clock.goban_width*(0.15 + Math.random()*0.15);
        Object.assign(stone, {
            vx: Math.cos(angle)*speed,
            vy: Math.sin(angle)*speed,
            offBoard: true,
            landed: false,
            falling: true,
            height: 0,
            climb: 1000/flingTime,
            gone: false,
            leftAt: 0
        });
        setTumbling(stone, angle, 3 + Math.random()*2);
    });
    flyOn(stones, 0, {board, screen: clock.screenRect(), diameter});
}
