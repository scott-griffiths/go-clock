// A game record, read from an SGF file, as the replay (replay.js) wants
// it: who played, when, and the moves in order, each with the stones it
// captured. Only the main line is read: a variation is skipped. Nothing
// here knows about a page.

import {gridsize, empty, white, black, pointIndex, pointX, pointY} from './board.js';

// The properties of the root node and the moves of the main line, from
// the text of an SGF file. Each move is {colour, point}, the point an
// index on the board, or null for a pass. Throws on a file that is not a
// game on this board: another size, or stones set up before the first
// move (a handicap game).
export function parseSgf(text) {
    const {root, moves} = mainLine(text);
    const size = root.SZ ? Number(root.SZ[0]) : gridsize;
    if (size !== gridsize) {
        throw new Error(`a ${size}×${size} board`);
    }
    if (root.AB || root.AW || (root.HA && Number(root.HA[0]) > 1)) {
        throw new Error('stones set up before the first move');
    }
    return {info: root, moves};
}

// The nodes of the main line: at each fork, the first branch. The root
// node's properties are kept whole (each a list of values); of the rest
// only the B and W moves are wanted.
function mainLine(text) {
    let at = 0;
    let depth = 0;
    let taken = []; // Whether the branch at each depth is the first there
    let root = null;
    let moves = [];
    let skipping = 0;
    const next = () => {
        while (at < text.length && /\s/.test(text[at])) {
            ++at;
        }
        return text[at];
    };
    while (at < text.length) {
        const c = next();
        if (c === undefined) {
            break;
        }
        if (c === '(') {
            ++at;
            if (skipping > 0 || taken[depth]) {
                // A later branch at this fork, or inside one: not the main line.
                ++skipping;
            } else {
                taken[depth] = true;
            }
            ++depth;
            taken[depth] = false;
        } else if (c === ')') {
            ++at;
            --depth;
            if (skipping > 0) {
                --skipping;
            }
        } else if (c === ';') {
            ++at;
            const node = readNode();
            if (skipping > 0) {
                continue;
            }
            if (root === null) {
                root = node;
            }
            for (const colour of ['B', 'W']) {
                if (node[colour]) {
                    moves.push({colour: colour === 'B' ? black : white, point: pointOf(node[colour][0])});
                }
            }
        } else {
            throw new Error(`unexpected '${c}' at ${at}`);
        }
    }
    if (root === null) {
        throw new Error('no game in the file');
    }
    return {root, moves};

    // The properties of a node, from just after its ';' to the next ';',
    // '(' or ')'.
    function readNode() {
        const node = {};
        for (;;) {
            const c = next();
            if (c === undefined || c === ';' || c === '(' || c === ')') {
                return node;
            }
            let name = '';
            while (/[A-Za-z]/.test(text[at])) {
                name += text[at++];
            }
            if (name === '') {
                throw new Error(`unexpected '${c}' at ${at}`);
            }
            const values = [];
            while (next() === '[') {
                ++at;
                let value = '';
                while (at < text.length && text[at] !== ']') {
                    if (text[at] === '\\') {
                        ++at;
                    }
                    value += text[at++];
                }
                ++at;
                values.push(value);
            }
            node[name.replace(/[a-z]/g, '')] = values;
        }
    }
}

// A move's point from its SGF coordinates ('aa' the top left corner), or
// null for a pass, which is an empty value or, in older files, 'tt'.
function pointOf(value) {
    if (value === '' || value === 'tt') {
        return null;
    }
    const x = value.charCodeAt(0) - 97;
    const y = value.charCodeAt(1) - 97;
    if (x < 0 || x >= gridsize || y < 0 || y >= gridsize) {
        throw new Error(`a move off the board: ${value}`);
    }
    return pointIndex(x, y);
}

// The moves played out: each with the points of the stones it captured,
// in the order they are to be lifted. A pass captures nothing and places
// nothing, and is left out. Throws on a move onto a stone, or one that
// leaves its own stone without a liberty (a record gone wrong: the replay
// would show a board the game never had).
export function playGame(moves) {
    const board = new Array(gridsize*gridsize).fill(empty);
    const played = [];
    moves.forEach((move, number) => {
        if (move.point === null) {
            return;
        }
        if (board[move.point] !== empty) {
            throw new Error(`move ${number + 1} onto a stone`);
        }
        board[move.point] = move.colour;
        const other = move.colour === black ? white : black;
        const captures = [];
        neighbours(move.point).forEach((point) => {
            if (board[point] === other && !captures.includes(point)) {
                const group = groupAt(board, point);
                if (liberties(board, group) === 0) {
                    captures.push(...group);
                }
            }
        });
        captures.forEach((point) => {
            board[point] = empty;
        });
        if (liberties(board, groupAt(board, move.point)) === 0) {
            throw new Error(`move ${number + 1} with no liberty`);
        }
        played.push({colour: move.colour, point: move.point, captures});
    });
    return played;
}

function neighbours(point) {
    const x = pointX(point);
    const y = pointY(point);
    const around = [];
    if (x > 0) around.push(point - 1);
    if (x < gridsize - 1) around.push(point + 1);
    if (y > 0) around.push(point - gridsize);
    if (y < gridsize - 1) around.push(point + gridsize);
    return around;
}

// The connected stones of the colour at `point`, in the order found from it.
function groupAt(board, point) {
    const colour = board[point];
    const group = [point];
    const seen = new Set(group);
    for (let i = 0; i < group.length; ++i) {
        neighbours(group[i]).forEach((next) => {
            if (board[next] === colour && !seen.has(next)) {
                seen.add(next);
                group.push(next);
            }
        });
    }
    return group;
}

function liberties(board, group) {
    const free = new Set();
    group.forEach((point) => {
        neighbours(point).forEach((next) => {
            if (board[next] === empty) {
                free.add(next);
            }
        });
    });
    return free.size;
}

// How to speak of a game: the players and the year, from the record's
// properties ("Shusaku – Gennan Inseki, 1846"). Where the date of play is
// unknown, Brouwer's records give the date of publication as DTX instead.
export function gameTitle(info) {
    const players = [info.PB?.[0], info.PW?.[0]].filter(Boolean).join(' – ');
    const year = (info.DT?.[0] ?? info.DTX?.[0])?.match(/\d{4}/)?.[0];
    return [players, year].filter(Boolean).join(', ') || 'A game';
}

// How the game ended, in words, from its RE property, naming the winner
// where the record does ("Shusaku (Black) wins by 2", "White wins by
// resignation"); or nothing, if the record does not say.
export function gameResult(info) {
    const result = info.RE?.[0]?.trim();
    const match = result?.match(/^([BW])\+(R(?:esign)?|T(?:ime)?|F(?:orfeit)?|[\d.]+)?/i);
    if (!match) {
        return result && /^(0|draw|jigo)$/i.test(result) ? 'A drawn game' : '';
    }
    const black = match[1].toUpperCase() === 'B';
    const colour = black ? 'Black' : 'White';
    const name = info[black ? 'PB' : 'PW']?.[0]?.trim();
    const winner = name ? `${name} (${colour})` : colour;
    const by = match[2]?.toUpperCase();
    if (!by) {
        return `${winner} wins`;
    }
    if (by.startsWith('R')) {
        return `${winner} wins by resignation`;
    }
    if (by.startsWith('T')) {
        return `${winner} wins on time`;
    }
    if (by.startsWith('F')) {
        return `${winner} wins by forfeit`;
    }
    return `${winner} wins by ${Number(by)}`;
}

// All the record says about a game worth reading, for the replay's
// information: its name (or, without one, its players and year), then
// who played which colour and at what rank, the event and round, when
// and where, the komi, and how it ended. Only the lines the record has
// material for.
export function gameDetails(info) {
    const value = (key) => info[key]?.[0]?.trim() || '';
    const player = (colour, name, rank) => name ? `${colour}: ${[name, rank].filter(Boolean).join(' ')}` : '';
    const round = value('RO');
    return [
        value('GN') || gameTitle(info),
        player('Black', value('PB'), value('BR')),
        player('White', value('PW'), value('WR')),
        [value('EV'), /^\d+$/.test(round) ? `game ${round}` : round].filter(Boolean).join(', '),
        [value('DT') || value('DTX'), value('PC')].filter(Boolean).join(' · '),
        value('KM') ? `Komi ${value('KM')}` : '',
        gameResult(info)
    ].filter(Boolean);
}
