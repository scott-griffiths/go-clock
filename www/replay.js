// A game replayed on the clock: the board is cleared — swept, the stones
// pushed off onto the table (sweep.js), or in space flung off in all
// directions into the dark; then the hands play through a game record
// (sgf.js), each stone from the table while there are any there and then
// from the bowl, at the clock's speed, and the stones a move captures
// lifted off once it is down; then, after a moment with the finished game
// on the board, the clock takes the board back and its hands make the
// time of it as they always do.
//
// The hands work as they do for the time: the clock (go-clock.js) keeps
// the replay under way as `clock.replay`, and while there is one its
// transform() takes the board it wants from replayWanted() instead of the
// face, and plans for its hands as usual. The game is a run of positions
// (`stages`), one per move, or two for a move that captures: the stone
// down, then the captured stones off. The board is asked for the next
// position; or, once a hand is carrying the stone that makes it, the one
// beyond while that is just a stone more, so that the other hand has a
// stone to fetch meanwhile — the clock sees to it that the second stone
// lands after the first, and so the moves go down in order. A finger on
// the board disturbs the game without ending it: the position wanted is
// the same when it lifts, so the hands put it back and the game goes on.
// A change of face, or the button again, cancels the replay
// (cancelReplay), and the clock carries on from the board as it stands.

import {gridsize, emptyBoard} from './board.js';
import {parseSgf, playGame} from './sgf.js';
import {sweepBoard} from './sweep.js';
import {flyOn} from './flight.js';
import {$, setVisible, setStoneShadow, cancelElementAnimations} from './stone-dom.js';

// The games that come with the clock, in www/games.
export const gameFiles = [
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
    'alphago-fan-hui-1.sgf',
    'alphago-lee-sedol-1.sgf',
    'alphago-lee-sedol-2.sgf',
    'alphago-lee-sedol-3.sgf',
    'alphago-lee-sedol-4.sgf',
    'alphago-lee-sedol-5.sgf',
    'master-ke-jie.sgf',
    'alphago-ke-jie-2.sgf',
    'samsung-cup-2020.sgf',
    'honinbo-2023.sgf'
];

// How long the flung stones have the board to themselves before the
// first stone of the game arrives (a sweep takes its own time), and how
// long the finished game stays before the clock takes the board back, in ms.
const flingTime = 900;
const restTime = 3000;

// The next game to replay: each of the files once, in a random order,
// then shuffled again.
let deck = [];
export function nextGameFile(files = gameFiles) {
    if (deck.length === 0) {
        deck = [...files];
        for (let i = deck.length - 1; i > 0; --i) {
            const j = Math.floor(Math.random()*(i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
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
// {board, stoneMore} for each, `stoneMore` when the position is the one
// before with a stone added (as against captured stones taken off).
export function gameStages(moves) {
    const board = emptyBoard();
    const stages = [];
    moves.forEach((move) => {
        board[move.point] = move.colour;
        if (move.captures.length > 0) {
            stages.push({board: [...board], stoneMore: true});
            move.captures.forEach((point) => {
                board[point] = 0;
            });
            stages.push({board: [...board], stoneMore: false});
        } else {
            stages.push({board: [...board], stoneMore: true});
        }
    });
    return stages;
}

// The replay begun: the board cleared, and the game, once `loading`
// (a promise of loadGame's game) has it, played through. `onStart` is
// called with the game as its first stone sets out, `onRest` with it as
// the last lands, and `onEnd` when the clock has the board back, with
// the error if the game could not be had. Returns whether it began: not
// while a finger is on the board, the board is being swept, or a replay
// is already under way.
export function startReplay(clock, loading, {onStart = null, onRest = null, onEnd = null} = {}) {
    if (clock.replay || clock.sweeping_board || clock.finger || typeof document === 'undefined') {
        return false;
    }
    const replay = {
        game: null,
        stage: 0, // The first position the board has not yet reached
        cleared: false,
        started: false,
        resting: false,
        cancelled: false,
        error: null,
        timer: null,
        onStart,
        onRest,
        onEnd
    };
    clock.replay = replay;
    window.clearTimeout(clock.idle_timer);

    // The game begins once the board is clear and the record is here. In
    // space the stones are flung off; elsewhere the board is swept, and
    // the sweep calls transform() once the stones have come to rest.
    if (clock.table_void) {
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
            clock.transform();
        }
    }, (error) => {
        if (clock.replay === replay) {
            replay.error = error;
            cancelReplay(clock);
        }
    });
    return true;
}

// How many positions beyond the next the board may be asked for, each
// once the hands are carrying what makes the one before: with one hand's
// stone in the air, the other has one to go for.
const lookahead = 1;

// The board the replay wants now, for the clock's transform() to plan
// towards: the next position of the game the board has not reached; or
// one beyond it (up to `lookahead`) when the stones on their way in the
// hands make the position before it, and each is a stone more — never a
// stone the game has not yet reached, so the moves cannot go down out of
// turn, and never the stone after a capture until the captured stones
// are off. An empty board until the game is ready. Null once the replay
// is over (cancelled: the clock has the board back, and wants the time).
// The board has reached a position when it shows exactly that (the
// stones can land out of order, so it is the furthest that counts), and
// a finger's disturbance leaves the same position wanted, to be put back.
export function replayWanted(clock) {
    const replay = clock.replay;
    if (replay.cancelled) {
        finish(clock);
        return null;
    }
    if (!replay.cleared || !replay.game) {
        return emptyBoard();
    }
    if (!replay.started) {
        replay.started = true;
        replay.onStart?.(replay.game);
    }
    const stages = replay.game.stages;
    // How far the board has got: the furthest position it shows, of the
    // one wanted and the one it may be reaching for beyond it.
    for (let ahead = lookahead; ahead >= 0; --ahead) {
        const at = replay.stage + ahead;
        if (at < stages.length && sameBoard(clock.stones_shown, stages[at].board)) {
            replay.stage = at + 1;
            break;
        }
    }
    if (replay.stage >= stages.length) {
        return stages[stages.length - 1].board;
    }
    // The board as it will be once the stones in the hands land.
    const pending = [...clock.stones_shown];
    clock.hands.forEach((hand) => {
        if (hand.moving && hand.to[0] < gridsize) {
            pending[clock.get_index(hand.to)] = hand.colour;
        }
    });
    let at = replay.stage;
    while (at - replay.stage < lookahead && at + 1 < stages.length
           && stages[at].stoneMore && stages[at + 1].stoneMore
           && sameBoard(pending, stages[at].board)) {
        ++at;
    }
    return stages[at].board;
}

// The hands have nothing to do (transform() found no move): if the game
// is over, a moment to look at it, then the board is the clock's again.
// Otherwise the board is clear and the record is still to come, or the
// stones are still settling, and transform() will be called again.
export function replaySettled(clock) {
    const replay = clock.replay;
    if (!replay.game || replay.stage < replay.game.stages.length || replay.resting) {
        return;
    }
    replay.resting = true;
    replay.onRest?.(replay.game);
    replay.timer = window.setTimeout(() => {
        replay.timer = null;
        finish(clock);
        // The board is the clock's again, and nothing else will ask for it.
        if (!clock.busy() && !clock.finger && !clock.sweeping_board) {
            clock.transform();
        }
    }, restTime);
}

function sameBoard(a, b) {
    for (let i = 0; i < a.length; ++i) {
        if (a[i] != b[i]) {
            return false;
        }
    }
    return true;
}

// The replay stopped where it is. A hand still on its way lands first,
// and its landing finishes the replay; otherwise it is finished now.
export function cancelReplay(clock) {
    const replay = clock.replay;
    if (!replay) {
        return;
    }
    replay.cancelled = true;
    window.clearTimeout(replay.timer);
    replay.timer = null;
    if (!clock.busy() && !clock.finger && !clock.sweeping_board) {
        // Otherwise the next transform() (a landing, the finger going,
        // the sweep settling) finishes it.
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
        // Straight out from the middle, give or take; a stone at the
        // middle goes any way.
        let angle = Math.atan2(stone.y - middleY, stone.x - middleX);
        if (Math.hypot(stone.x - middleX, stone.y - middleY) < diameter) {
            angle = Math.random()*2*Math.PI;
        }
        angle += (Math.random() - 0.5)*0.5;
        const speed = clock.goban_width*(0.7 + Math.random()*0.7);
        Object.assign(stone, {
            vx: Math.cos(angle)*speed,
            vy: Math.sin(angle)*speed,
            offBoard: false,
            landed: false,
            falling: false,
            gone: false,
            leftAt: 0
        });
    });
    flyOn(stones, 0, {board, screen: clock.screenRect(), diameter});
}
