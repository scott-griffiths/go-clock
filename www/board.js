// The board as numbers: the 19×19 grid, the two colours, where a stone can
// be that is not a point, and the arithmetic every other module wants.
// Nothing here knows about a page or a time.

export const gridsize = 19;

export const empty = 0;
export const white = 1;
export const black = 3;

// Where a stone is when it is not on a point: in its bowl, or lying on the
// table beside the board where a finger left it.
export const go_bowl = 999;
export const go_table = 998;

// The edges of the grid, as proportions of the board image's width and
// height: where the first and last lines are drawn on it.
export const minx = 0.026;
export const maxx = 0.974;
export const miny = 0.03;
export const maxy = 0.972;

// A point's index runs along the rows: x + gridsize*y.
export function pointIndex(x, y) {
    return y*gridsize + x;
}

export function pointX(index) {
    return index % gridsize;
}

export function pointY(index) {
    return (index - index % gridsize)/gridsize;
}

// A board with nothing on it.
export function emptyBoard() {
    return new Array(gridsize*gridsize).fill(empty);
}

// The distance between two points, by index.
export function dist(i, j) {
    return Math.hypot(pointX(i) - pointX(j), pointY(i) - pointY(j));
}

// The integer points that form the line from (x0, y0) to (x1, y1):
// Bresenham's, stepping along whichever axis the line runs further on.
export function line(x0, x1, y0, y1) {
    var deltax = x1 - x0;
    var deltay = y1 - y0;
    var error = 0.0;
    var points = [];
    if (deltax == 0 && deltay == 0) {
        return [[x0, y0]];
    }
    if (Math.abs(deltax) >= Math.abs(deltay)) {
        if (x1 < x0) {
            var tmp = x1;
            x1 = x0;
            x0 = tmp;
            tmp = y1;
            y1 = y0;
            y0 = tmp;
        }
        var ydir = (y0 < y1) ? 1 : -1;
        var deltaerr = Math.abs(deltay / deltax);
        var y = y0;
        for (var x = x0; x <= x1; ++x) {
            points.push([x, y]);
            error += deltaerr;
            if (error >= 0.5) {
                y += ydir;
                error -= 1.0;
            }
        }
    }
    if (Math.abs(deltay) > Math.abs(deltax)) {
        if (y1 < y0) {
            var tmp = y1;
            y1 = y0;
            y0 = tmp;
            tmp = x1;
            x1 = x0;
            x0 = tmp;
        }
        var xdir = (x0 < x1) ? 1 : -1;
        var deltaerr = Math.abs(deltax / deltay);
        var x = x0;
        for (var y = y0; y <= y1; ++y) {
            points.push([x, y]);
            error += deltaerr;
            if (error >= 0.5) {
                x += xdir;
                error -= 1.0;
            }
        }
    }
    return points;
}

// The nearest point to the coordinates (in board units) that `taken` does
// not have, anywhere on the board: a heap shoved into a corner has more
// stones than the corner has points, and each still needs one. -1 only
// when the whole board is taken.
export function nearestFreePoint(coords, taken) {
    var best = -1;
    var bestDistance = Infinity;
    for (var index = 0; index < gridsize*gridsize; ++index) {
        if (taken.has(index)) {
            continue;
        }
        var distance = Math.hypot(coords[0] - pointX(index), coords[1] - pointY(index));
        if (distance < bestDistance) {
            best = index;
            bestDistance = distance;
        }
    }
    return best;
}
