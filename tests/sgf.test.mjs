// A game record read from SGF (the main line, whatever variations and
// comments are in the file) and played out, each move with its captures;
// and the games shipped with the clock, every one a legal game.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseSgf, playGame, gameTitle, gameResult} from '../www/sgf.js';
import {pointIndex, white, black} from '../www/board.js';

const at = (x, y) => pointIndex(x, y);

test('the root properties and the moves of the main line are read', () => {
    const game = parseSgf('(;GM[1]SZ[19]PB[Black One]PW[White One]DT[1846-09-11]\n;B[qd]C[a comment with \\] in it];W[dc](;B[pq];W[oc])(;B[cp]))');
    assert.equal(game.info.PB[0], 'Black One');
    assert.deepEqual(game.moves, [
        {colour: black, point: at(16, 3)},
        {colour: white, point: at(3, 2)},
        {colour: black, point: at(15, 16)},
        {colour: white, point: at(14, 2)}
    ]);
    assert.equal(gameTitle(game.info), 'Black One – White One, 1846');
});

test('a pass is an empty move, or tt in an older file', () => {
    const game = parseSgf('(;SZ[19];B[aa];W[];B[tt])');
    assert.deepEqual(game.moves.map((move) => move.point), [at(0, 0), null, null]);
});

test('a game on another board, or with stones set up first, is not for the clock', () => {
    assert.throws(() => parseSgf('(;SZ[9];B[aa])'));
    assert.throws(() => parseSgf('(;SZ[19]HA[2]AB[dp][pd];W[dd])'));
    assert.throws(() => parseSgf('nothing'));
});

test('a stone with no liberties left is captured, and a pass places nothing', () => {
    const moves = [
        {colour: black, point: at(0, 0)},
        {colour: white, point: at(1, 0)},
        {colour: black, point: null},
        {colour: white, point: at(0, 1)}
    ];
    const played = playGame(moves);
    assert.equal(played.length, 3);
    assert.deepEqual(played[2].captures, [at(0, 0)]);
    assert.deepEqual(played[0].captures, []);
});

test('a group is captured whole, and the capturing stone may then have liberties it lacked', () => {
    // White surrounds two black stones in the corner; the last white stone
    // is played into their eye.
    const moves = [
        {colour: black, point: at(0, 0)},
        {colour: white, point: at(2, 0)},
        {colour: black, point: at(1, 0)},
        {colour: white, point: at(1, 1)},
        {colour: black, point: at(18, 18)},
        {colour: white, point: at(0, 1)}
    ];
    const played = playGame(moves);
    assert.deepEqual(played.at(-1).captures.sort((a, b) => a - b), [at(0, 0), at(1, 0)]);
});

test('a move onto a stone, or a suicide, is a record gone wrong', () => {
    assert.throws(() => playGame([{colour: black, point: at(3, 3)}, {colour: white, point: at(3, 3)}]));
    assert.throws(() => playGame([
        {colour: white, point: at(1, 0)},
        {colour: white, point: at(0, 1)},
        {colour: black, point: at(0, 0)}
    ]));
});

test('every game shipped with the clock reads and plays out legally', () => {
    const folder = path.join(path.dirname(fileURLToPath(import.meta.url)), '../www/games');
    const files = fs.readdirSync(folder).filter((name) => name.endsWith('.sgf'));
    assert.ok(files.length >= 5);
    files.forEach((name) => {
        const game = parseSgf(fs.readFileSync(path.join(folder, name), 'utf8'));
        const played = playGame(game.moves);
        assert.ok(played.length > 100, name);
        assert.ok(game.info.GN?.[0], `${name} has a name`);
        assert.match(gameTitle(game.info), /\d{4}$/, name);
    });
});

test('the result is put into words', () => {
    assert.equal(gameResult({RE: ['W+R']}), 'White wins by resignation');
    assert.equal(gameResult({RE: ['B+2']}), 'Black wins by 2');
    assert.equal(gameResult({RE: ['W+0.5']}), 'White wins by 0.5');
    assert.equal(gameResult({RE: ['B+T']}), 'Black wins on time');
    assert.equal(gameResult({RE: ['0']}), 'A drawn game');
    assert.equal(gameResult({}), '');
});
