// The stones as things that slide: a small simulation in pixel space,
// shared by the sweep (an arm wiping the stones off the board) and
// the hand (a finger shoving them about). Both keep a StoneWorld for as
// long as they last, add the stones to it, and call advance() for each
// bit of time; the world moves the stones and says where they are, and
// the caller draws them. Nothing here touches the page.
//
// A stone is a disc on a rectangular board standing proud of a table, all
// of it seen from above. On the board it does whatever the board does to
// it (`onBoard`: friction, below). Over the edge it drops, in
// the air for `dropTime`, then lands on the table and skids to a stop.
// In space (`isVoid`) there is no table and nothing holds a stone to the
// board either: the moment one is disturbed it is away, flying on as it
// was going, end over end, skimming low over the board (the edge of the
// board is nothing to it) and only slowly gaining height, until it is too
// high to see. While it is low it still knocks into other stones, and a
// knock sends both up. Stones in each other's way push apart and bounce a
// little. A stone off the screen is gone too.
//
// Each stone is a plain object; the world reads and writes these fields
// and ignores whatever else the caller keeps on it (an element, a colour):
//   x, y, r     centre and radius, in px
//   vx, vy      velocity, in px/s
//   asleep      lying still and taking no part until struck (the sweep's
//               stones before they let go; the heap already on the table)
//   offBoard    over the edge; leftAt is the world time it went
//   landed      down on the table, after the drop
//   falling     into the void instead of onto the table; height, how high
//               it has risen, 0 to 1 (too high to see), and climb, how
//               fast that is going up, per second
//   gone        off the screen, or fallen away: finished with
// and, for a stone tumbling end over end (flying into the void), see
// setTumbling():
//   spin        rad/s, backwards if negative
//   tumble      how far it has turned over, in radians; 0 lying flat
//   heading     the angle (clockwise, y down) that puts the tumble along
//               its path
//   turned      how far the heading has taken, 0 to 1: it eases in

// The drop from the board's edge to the table, in seconds in the air.
export const dropTime = 0.12;
// How long a stone left alone takes to rise out of sight in space.
export const voidFlightTime = 4.5;
// Below this height a flying stone is still low enough to hit others.
export const lowHeight = 0.3;

export class StoneWorld {
    // board: {left, top, right, bottom}; screen: {right, bottom}; diameter
    // of a stone; onBoard(stone, dt, world), what the board does to a
    // stone lying on it; grip, how hard the table drags, relative to
    // wood; isVoid, space: no table, and no hold on the board; sidesKeepOn,
    // a stone on the board can only leave over the top or bottom edge (the
    // sweep); edgeKick,
    // px/s outward for a stone going over the edge (a shoved stone tips
    // over it rather than rolling gently off); sound, something with
    // land(strength) and knock(strength); haptic, a function taking 'tick'.
    constructor({board, screen, diameter, onBoard, grip = 1, isVoid = false, sidesKeepOn = false,
                 edgeKick = 0, sound = null, haptic = null}) {
        this.board = board;
        this.screen = screen;
        this.diameter = diameter;
        this.onBoard = onBoard;
        this.grip = grip;
        this.isVoid = isVoid;
        this.sidesKeepOn = sidesKeepOn;
        this.edgeKick = edgeKick;
        this.sound = sound;
        this.haptic = haptic;
        this.stones = [];
        this.elapsed = 0;
    }

    add(stone) {
        this.stones.push(stone);
        return stone;
    }

    get boardHeight() {
        return this.board.bottom - this.board.top;
    }

    speedOf(stone) {
        return Math.hypot(stone.vx, stone.vy);
    }

    // dt seconds of everything: the stones move, leave the board, drop and
    // land, slow, knock each other about, and go off the screen.
    advance(dt) {
        this.elapsed += dt;
        this.stones.forEach((stone) => {
            if (stone.gone || stone.asleep) {
                return;
            }
            if (!stone.offBoard && (this.beyondEdge(stone) || (this.isVoid && this.speedOf(stone) > 0))) {
                this.leave(stone);
            }
            if (stone.falling) {
                // Away into the dark: nothing slows it, nothing to land on,
                // and it rises as fast as it has been sent up.
                stone.height += stone.climb*dt;
                if (stone.height >= 1) {
                    stone.gone = true;
                }
            } else if (!stone.offBoard) {
                this.onBoard(stone, dt, this);
            } else if (this.elapsed - stone.leftAt > dropTime) {
                if (!stone.landed) {
                    this.land(stone);
                }
                // Skidding on the flat table: nothing pulls, friction slows.
                this.slow(stone, (this.speedOf(stone)*6 + this.diameter*20)*this.grip, dt);
            }
            stone.x += stone.vx*dt;
            stone.y += stone.vy*dt;
            if (stone.spin) {
                stone.tumble += stone.spin*dt;
                stone.turned = Math.min(1, stone.turned + dt/0.12);
            }
            if (!stone.offBoard) {
                if (this.sidesKeepOn) {
                    this.keepWithinSides(stone);
                }
            } else {
                this.keepOffBoard(stone);
            }
            if (this.offScreen(stone)) {
                stone.gone = true;
            }
        });
        this.collide();
        this.stones.forEach((stone) => this.keepOffBoard(stone));
    }

    // Its centre is past the edge. With the sides keeping stones on, only
    // the near and far edges count.
    beyondEdge(stone) {
        const {board} = this;
        if (stone.y < board.top || stone.y > board.bottom) {
            return true;
        }
        return !this.sidesKeepOn && (stone.x < board.left || stone.x > board.right);
    }

    // Over the edge: off it goes, tipping outward as it falls (if kicked)
    // so it lands clear of the side. In space (where it goes the moment it
    // moves, wherever it is), it keeps its speed and goes end over end
    // along its path, leading edge first, the faster the faster it went,
    // starting low and climbing slowly, plus whatever a knock has already
    // sent it up by.
    leave(stone) {
        const {board} = this;
        stone.offBoard = true;
        stone.leftAt = this.elapsed;
        stone.falling = this.isVoid;
        if (stone.falling) {
            stone.height = stone.height || 0;
            stone.climb = (stone.climb || 0) + 1/voidFlightTime;
            const rate = Math.min(18, Math.max(4, this.speedOf(stone)/stone.r*0.35))*(0.85 + Math.random()*0.3);
            setTumbling(stone, Math.atan2(stone.vy, stone.vx), rate);
            return;
        }
        this.haptic?.('tick');
        if (this.edgeKick) {
            if (stone.x < board.left) {
                stone.vx -= this.edgeKick;
            } else if (stone.x > board.right) {
                stone.vx += this.edgeKick;
            }
            if (stone.y < board.top) {
                stone.vy -= this.edgeKick;
            } else if (stone.y > board.bottom) {
                stone.vy += this.edgeKick;
            }
        }
    }

    // Down on the table: landing takes the edge off its speed.
    land(stone) {
        stone.landed = true;
        this.sound?.land(this.speedOf(stone)/(this.boardHeight*1.8));
        stone.vx *= 0.5;
        stone.vy *= 0.5;
    }

    // Friction: `deceleration` px/s² off the stone's speed, and a stone
    // down to a crawl stops.
    slow(stone, deceleration, dt) {
        const speed = this.speedOf(stone);
        if (speed <= 0) {
            return;
        }
        let slower = Math.max(0, speed - deceleration*dt);
        if (slower < this.diameter*0.1) {
            slower = 0;
        }
        stone.vx *= slower/speed;
        stone.vy *= slower/speed;
    }

    // The board's sides keep a stone on it, with a little bounce.
    keepWithinSides(stone) {
        const {board} = this;
        if (stone.x - stone.r < board.left) {
            stone.x = board.left + stone.r;
            stone.vx = Math.abs(stone.vx)*0.4;
        } else if (stone.x + stone.r > board.right) {
            stone.x = board.right - stone.r;
            stone.vx = -Math.abs(stone.vx)*0.4;
        }
    }

    // The board stands proud of the table: a stone on the table stops at
    // its side rather than going back up.
    keepOffBoard(stone) {
        if (!stone.offBoard || !stone.landed || stone.gone) {
            return;
        }
        const {board} = this;
        let cx = Math.max(board.left, Math.min(board.right, stone.x));
        let cy = Math.max(board.top, Math.min(board.bottom, stone.y));
        let dx = stone.x - cx;
        let dy = stone.y - cy;
        let distance = Math.hypot(dx, dy);
        if (distance >= stone.r) {
            return;
        }
        if (distance === 0) {
            // Its centre is over the board: out by the nearest side.
            const sides = [
                [stone.x - board.left, -1, 0],
                [board.right - stone.x, 1, 0],
                [stone.y - board.top, 0, -1],
                [board.bottom - stone.y, 0, 1]
            ];
            sides.sort((a, b) => a[0] - b[0]);
            dx = sides[0][1];
            dy = sides[0][2];
            distance = 1;
            cx = dx ? (dx < 0 ? board.left : board.right) : stone.x;
            cy = dy ? (dy < 0 ? board.top : board.bottom) : stone.y;
        }
        const nx = dx/distance;
        const ny = dy/distance;
        stone.x = cx + nx*stone.r;
        stone.y = cy + ny*stone.r;
        const into = stone.vx*nx + stone.vy*ny;
        if (into < 0) {
            stone.vx -= into*nx*1.3;
            stone.vy -= into*ny*1.3;
        }
    }

    // Stones in each other's way: push apart, and bounce a little (less
    // on the table). A stone that is struck wakes. In space a knock sends
    // both stones up, the harder the more. Returns whether any two touched.
    collide() {
        let any = false;
        const {stones} = this;
        for (let a = 0; a < stones.length; ++a) {
            const p = stones[a];
            if (!this.reachable(p)) {
                continue;
            }
            for (let b = a + 1; b < stones.length; ++b) {
                const q = stones[b];
                if (!this.reachable(q) || (p.asleep && q.asleep)) {
                    continue;
                }
                const dx = q.x - p.x;
                const dy = q.y - p.y;
                const distance = Math.hypot(dx, dy);
                const reach = p.r + q.r;
                if (distance === 0 || distance >= reach) {
                    continue;
                }
                any = true;
                const nx = dx/distance;
                const ny = dy/distance;
                const overlap = reach - distance;
                p.x -= nx*overlap/2;
                p.y -= ny*overlap/2;
                q.x += nx*overlap/2;
                q.y += ny*overlap/2;
                const closing = (q.vx - p.vx)*nx + (q.vy - p.vy)*ny;
                if (closing < 0) {
                    this.sound?.knock(-closing/(this.boardHeight*1.2));
                    const bounce = p.offBoard && q.offBoard ? 0.25 : 0.4;
                    const impulse = -(1 + bounce)*closing/2;
                    p.vx -= impulse*nx;
                    p.vy -= impulse*ny;
                    q.vx += impulse*nx;
                    q.vy += impulse*ny;
                    p.asleep = false;
                    q.asleep = false;
                    if (this.isVoid) {
                        const lift = Math.min(1.2, -closing/this.boardHeight*1.5);
                        p.climb = (p.climb || 0) + lift;
                        q.climb = (q.climb || 0) + lift;
                    }
                }
            }
        }
        return any;
    }

    // Still in play for a knock or a shove: not gone, and not flown too
    // high over the board to touch anything.
    reachable(stone) {
        return !stone.gone && !(stone.falling && stone.height >= lowHeight);
    }

    offScreen(stone) {
        const {screen} = this;
        return stone.x + stone.r < 0 || stone.x - stone.r > screen.right
            || stone.y + stone.r < 0 || stone.y - stone.r > screen.bottom;
    }

    // How far through the drop off the edge a stone is, 0 to 1 (1 on the
    // table, or on the board).
    drop(stone) {
        return stone.offBoard ? Math.min(1, (this.elapsed - stone.leftAt)/dropTime) : 1;
    }

    // How far a stone has flown into space, 0 to 1: how high it has risen.
    fall(stone) {
        return stone.falling ? Math.min(1, stone.height) : 0;
    }

    // The stones still flying into the void, taken out of the world, for
    // whoever will see them out of sight.
    takeFalling() {
        const flying = this.stones.filter((stone) => stone.falling && !stone.gone);
        this.stones = this.stones.filter((stone) => !flying.includes(stone));
        return flying;
    }

    // The stones still in play.
    live() {
        return this.stones.filter((stone) => !stone.gone);
    }

    onBoardCount() {
        return this.stones.filter((stone) => !stone.gone && !stone.offBoard).length;
    }

    // Nothing is moving, dropping or tumbling. A stone flying into the
    // void is no longer anyone's concern here (see takeFalling).
    still() {
        return this.stones.every((stone) => stone.gone || stone.falling
            || (!(stone.offBoard && !stone.landed) && this.speedOf(stone) === 0 && !isTumbling(stone)));
    }
}

// A stone going the way of `direction` (an angle, clockwise, y down) set
// tumbling end over end at `rate` rad/s, or kept tumbling that way if it
// already was. The tumble is drawn turning about the horizontal, so the
// heading turns it to put that across the path: by the nearer way round,
// tumbling backwards if need be, so the stone hardly turns on the page as
// it sets off. A stone tumbling one way about an axis looks the same as
// one tumbling the other way about the axis turned right round, so when
// the way round changes the tumble so far is read the other way too.
export function setTumbling(stone, direction, rate) {
    let heading = direction + Math.PI/2;
    let forwards = 1;
    while (heading > Math.PI/2) {
        heading -= Math.PI;
        forwards = -forwards;
    }
    while (heading <= -Math.PI/2) {
        heading += Math.PI;
        forwards = -forwards;
    }
    if (!isTumbling(stone)) {
        stone.tumble = 0;
        stone.turned = 0;
    } else if (forwards !== stone.forwards) {
        stone.tumble = -stone.tumble;
    }
    stone.heading = heading;
    stone.forwards = forwards;
    stone.spin = forwards*rate;
}

// Turning over, or not yet lying flat again.
export function isTumbling(stone) {
    return Boolean(stone.spin) || Boolean(stone.tumble);
}

// What a flat board does to a stone lying on it: friction, a share of its
// speed plus a constant, so that a shoved stone skids a little and stops.
export function flatBoard(stone, dt, world) {
    world.slow(stone, world.speedOf(stone)*6.5 + world.diameter*32, dt);
}
