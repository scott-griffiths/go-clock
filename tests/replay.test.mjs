// The board a replay asks for, move by move: the next position of the
// game, or the one after once a hand is carrying the stone that makes
// it; never a stone out of turn, and after a capture the captured stones
// off before the next stone.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gameStages, replayWanted, stageOfMove, movesShown, seekReplay} from '../www/replay.js';
import {playGame} from '../www/sgf.js';
import {emptyBoard, pointIndex, pointX, pointY, white, black} from '../www/board.js';

const at = (x, y) => pointIndex(x, y);

// A clock with the game under way, the board showing its position
// `reached` (or empty, before the first), its hands carrying nothing
// unless told.
function clockWith(stages, reached) {
    return {
        stones_shown: reached < 0 ? emptyBoard() : [...stages[reached].board],
        hands: [{moving: false, to: [0, 0]}, {moving: false, to: [0, 0]}],
        get_index: (coords) => at(coords[0], coords[1]),
        replay: {game: {stages}, stage: reached + 1, cleared: true, started: true, cancelled: false, seeking: null}
    };
}

function carrying(clock, hand, index, colour) {
    clock.hands[hand] = {moving: true, to: [pointX(index), pointY(index)], colour};
}

// Black takes a white stone in a ko: white at (4,4) is surrounded but
// for (5,4), which black then plays.
const koMoves = playGame([
    {colour: black, point: at(3, 4)}, {colour: white, point: at(4, 4)},
    {colour: black, point: at(4, 3)}, {colour: white, point: at(5, 3)},
    {colour: black, point: at(4, 5)}, {colour: white, point: at(5, 5)},
    {colour: black, point: at(6, 6)}, {colour: white, point: at(6, 4)},
    {colour: black, point: at(5, 4)}, // takes (4,4)
    {colour: white, point: at(10, 10)}
]);
const stages = gameStages(koMoves);

test('a capture is a position with the stone down and then one with the captured stones off', () => {
    assert.equal(stages.length, koMoves.length + 1);
    assert.equal(stages[8].board[at(4, 4)], white);
    assert.equal(stages[8].stoneMore, true);
    assert.equal(stages[9].board[at(4, 4)], 0);
    assert.equal(stages[9].stoneMore, false);
});

test('with the hands empty only the next move is wanted', () => {
    const clock = clockWith(stages, -1);
    assert.deepEqual(replayWanted(clock), stages[0].board);
    clock.stones_shown = [...stages[0].board];
    assert.deepEqual(replayWanted(clock), stages[1].board);
    assert.equal(clock.replay.stage, 1);
});

test('with a hand carrying the next stone, the one after is wanted', () => {
    const clock = clockWith(stages, 3);
    carrying(clock, 0, koMoves[4].point, black);
    assert.deepEqual(replayWanted(clock), stages[5].board);
    // And no further, whatever the other hand does: the next one is still in the air.
    assert.equal(clock.replay.stage, 4);
});

test('a hand carrying some other stone gives the game nothing beyond the next move', () => {
    const clock = clockWith(stages, 3);
    carrying(clock, 0, at(15, 15), black);
    assert.deepEqual(replayWanted(clock), stages[4].board);
});

test('the stone after a capture is not wanted until the captured stones are off', () => {
    // The capturing stone is in the air: only its own position is wanted.
    const clock = clockWith(stages, 7);
    carrying(clock, 0, koMoves[8].point, black);
    assert.deepEqual(replayWanted(clock), stages[8].board);
    // Down: the captured stone off is wanted, and nothing beyond.
    clock.hands[0].moving = false;
    clock.stones_shown = [...stages[8].board];
    assert.deepEqual(replayWanted(clock), stages[9].board);
    assert.equal(clock.replay.stage, 9);
    // Off: the next move.
    clock.stones_shown = [...stages[9].board];
    assert.deepEqual(replayWanted(clock), stages[10].board);
});

test('a finished game wants its last position', () => {
    const clock = clockWith(stages, stages.length - 1);
    assert.deepEqual(replayWanted(clock), stages[stages.length - 1].board);
    assert.equal(clock.replay.stage, stages.length);
});

test('each stage knows its move, and a move\'s last stage is the one with its captures off', () => {
    assert.equal(stages[8].move, 8);
    assert.equal(stages[9].move, 8);
    assert.equal(stages[10].move, 9);
    assert.equal(stageOfMove(stages, -1), -1);
    assert.equal(stageOfMove(stages, 0), 0);
    assert.equal(stageOfMove(stages, 8), 9);
    assert.equal(stageOfMove(stages, 9), 10);
});

test('paused, the position reached is wanted and held; the moves shown are reported as the board reaches them', () => {
    const shown = [];
    const clock = clockWith(stages, 3);
    clock.replay.onProgress = (moves, total) => shown.push([moves, total]);
    clock.replay.game.moves = koMoves;
    clock.replay.paused = true;
    assert.deepEqual(replayWanted(clock), stages[3].board);
    assert.equal(movesShown(clock.replay), 4);
    // A stone that was in the air lands: the board has moved on, and holds there.
    clock.stones_shown = [...stages[4].board];
    assert.deepEqual(replayWanted(clock), stages[4].board);
    assert.deepEqual(shown, [[5, 10]]);
    clock.replay.paused = false;
    assert.deepEqual(replayWanted(clock), stages[5].board);
});

test('taken to a move, that position is wanted until the board shows it, and the game goes on from it', () => {
    const clock = clockWith(stages, 3);
    clock.replay.game.moves = koMoves;
    clock.busy = () => false;
    clock.transform = () => {};
    assert.equal(seekReplay(clock, 9), true);
    assert.equal(movesShown(clock.replay), 9);
    // Wanted, and still wanted with the board part way there.
    assert.deepEqual(replayWanted(clock), stages[9].board);
    clock.stones_shown = [...stages[6].board];
    assert.deepEqual(replayWanted(clock), stages[9].board);
    assert.equal(clock.replay.stage, 4);
    // There: the next move is wanted.
    clock.stones_shown = [...stages[9].board];
    assert.deepEqual(replayWanted(clock), stages[10].board);
    assert.equal(clock.replay.stage, 10);
    assert.equal(clock.replay.seeking, null);
    // Back to the start: the empty board, and paused, held there.
    seekReplay(clock, 0);
    clock.replay.paused = true;
    assert.deepEqual(replayWanted(clock), emptyBoard());
    clock.stones_shown = emptyBoard();
    assert.deepEqual(replayWanted(clock), emptyBoard());
    assert.equal(clock.replay.stage, 0);
    clock.replay.paused = false;
    assert.deepEqual(replayWanted(clock), stages[0].board);
    // Not with a finger on the board.
    clock.finger = {};
    assert.equal(seekReplay(clock, 5), false);
});
