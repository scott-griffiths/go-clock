// The gallery's pictures: each a proper grid and named, none named twice,
// and each with roughly as many stones of one colour as the other.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pictures, pictureBoard, shuffledPictures} from '../www/gallery.js';
import {white, black} from '../www/board.js';

test('there are twenty-two pictures, each named once', () => {
    assert.equal(pictures.length, 22);
    assert.equal(new Set(pictures.map((picture) => picture.name)).size, 22);
});

test('each picture is 19 rows of 19 points, of empty, black and white', () => {
    pictures.forEach(({name, rows}) => {
        assert.equal(rows.length, 19, name);
        rows.forEach((row) => assert.match(row, /^[.XO]{19}$/, name));
    });
});

test('each picture balances its black stones against its white', () => {
    pictures.forEach((picture) => {
        const board = pictureBoard(picture);
        const blacks = board.filter((stone) => stone == black).length;
        const whites = board.filter((stone) => stone == white).length;
        const ratio = blacks/whites;
        assert.ok(ratio >= 0.6 && ratio <= 1.6, `${picture.name}: ${blacks} black to ${whites} white`);
    });
});

test('a shuffle has every picture once', () => {
    const order = shuffledPictures();
    assert.equal(order.length, pictures.length);
    assert.deepEqual(new Set(order), new Set(pictures));
});
