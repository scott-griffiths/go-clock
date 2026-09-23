// The magic speed: not two hands but as many as there are stones to move.
// Every difference between the board and the one wanted is put right in
// one go — a stone slides to a point that wants its colour, one nobody
// wants goes to the bowl, one still wanted comes from the table, or else
// the bowl — and a stone a finger left askew is set straight meanwhile.
// So two passes see to any change: the moves, and, once they have
// landed, whatever a landing left to tidy. The flights are elements of
// their own on the goban, recorded on the clock as `magic_flights` while
// they last, so a finger can take them over (dropMagicStones).

import {gridsize, white, dist} from './board.js';
import {routeIsClear} from './planner.js';
import {$, setStyles, setVisible, setStoneShadow, stoneImageSrc, stoneElement, animateElement, elementCentre,
        cancelElementAnimations, drawOnTable, maxLift, tableStoneScale} from './stone-dom.js';
import {setLandingOffset, setOffset, alignedOffset, alignmentTriggerRadius, offsetRadius} from './placement.js';

// A flight: a moment to rise, the crossing, and a moment to settle, in
// seconds; how high a lifted stone is carried; and how long a stone
// slid across the board takes, a point of it (the hand's slide over the
// same ground, more or less, and never so quick as to be a jump).
const liftTime = 0.16;
const slideTime = 0.56;
const landTime = 0.16;
const flightHeight = 5;
const slidePerPoint = 0.15;

// Everything the board wants done, set going at once. Returns whether
// anything is in flight (the last landing calls transform() again);
// stones straightened do not count, being done in a moment.
export function magicTransform(clock) {
    const shown = clock.stones_shown;
    const wanted = clock.stones;
    const leaving = [];
    const arriving = [];
    for (let i = 0; i < gridsize*gridsize; ++i) {
        if (shown[i] != wanted[i]) {
            if (shown[i] != 0) {
                leaving.push(i);
            }
            if (wanted[i] != 0) {
                arriving.push(i);
            }
        }
    }

    // Each arrival takes the nearest leaving stone of its colour, then
    // the nearest on the table, and the bowl has the rest; the leaving
    // stones nobody took go to the bowl.
    const flights = [];
    const taken = new Set();
    arriving.forEach((to) => {
        const colour = wanted[to];
        let best = null;
        leaving.forEach((from) => {
            if (!taken.has(from) && shown[from] == colour && (best === null || dist(from, to) < dist(best, to))) {
                best = from;
            }
        });
        if (best !== null) {
            taken.add(best);
            flights.push({kind: 'slide', from: best, to, colour});
            return;
        }
        const at = clock.pixelForCoords(clock.get_coords(to));
        let entry = null;
        clock.table_stones.forEach((candidate) => {
            if (candidate.colour == colour && (!entry || Math.hypot(candidate.x - at[0], candidate.y - at[1]) < Math.hypot(entry.x - at[0], entry.y - at[1]))) {
                entry = candidate;
            }
        });
        if (entry) {
            takeFromTable(clock, entry);
            flights.push({kind: 'table', entry, to, colour});
        } else {
            flights.push({kind: 'bowl', to, colour});
        }
    });
    leaving.forEach((from) => {
        if (!taken.has(from)) {
            flights.push({kind: 'away', from, colour: shown[from]});
        }
    });

    // The stones that stay, but lie askew, set straighter (not by a
    // careless hand), as the idle hand would one at a time.
    if (clock.placement != 2) {
        const trigger = alignmentTriggerRadius(clock);
        for (let i = 0; i < gridsize*gridsize; ++i) {
            if (shown[i] != 0 && shown[i] == wanted[i] && offsetRadius(clock, i) > trigger) {
                setOffset(clock, i, alignedOffset(clock, i));
                clock.updateBoardPosition(i, true);
            }
        }
    }

    if (flights.length == 0) {
        return false;
    }
    flights.forEach((flight) => {
        if (flight.kind == 'slide' || flight.kind == 'away') {
            flight.fromCoords = clock.get_coords(flight.from);
        }
    });
    // A stone going from one point to another is slid rather than lifted
    // where the hand would slide it (planner.js): a short way, over a
    // board clear of the stones that are leaving and of the points the
    // others are landing on.
    const after = [...shown];
    flights.forEach((flight) => {
        if (flight.from !== undefined) {
            after[flight.from] = 0;
        }
    });
    const landings = new Set(flights.map((flight) => flight.to).filter((to) => to !== undefined));
    flights.forEach((flight) => {
        if (flight.kind == 'slide') {
            landings.delete(flight.to);
            flight.slid = routeIsClear(after, flight.from, flight.to, landings);
            landings.add(flight.to);
        }
    });
    if (flights.some((flight) => flight.kind == 'slide' || flight.kind == 'table')) {
        clock.sound?.slide(slideTime);
    }
    let landed = false;
    // Staggered in the order a single hand would come to them — nearest
    // the hand's own last point first, then on from each to whichever is
    // nearest next, the same trip planMove works out one move at a time
    // — so a whole group lifted at once does not rise as one
    // indistinguishable block, and starts off where the hand actually is
    // rather than jumping to the top-left corner regardless. A stone is
    // met where it is picked up (`from`, for a slide or one going away)
    // or, coming from the table or the bowl, where it is put down (`to`).
    const flightPoint = (flight) => flight.from !== undefined ? flight.from : flight.to;
    const remaining = flights.map((_, i) => i);
    const baseOrder = new Array(flights.length);
    let at = clock.hand.position;
    for (let rank = 0; remaining.length > 0; ++rank) {
        let nearest = 0;
        remaining.forEach((idx, ri) => {
            if (dist(at, flightPoint(flights[idx])) < dist(at, flightPoint(flights[remaining[nearest]]))) {
                nearest = ri;
            }
        });
        const chosen = remaining.splice(nearest, 1)[0];
        baseOrder[chosen] = rank;
        at = flights[chosen].to !== undefined ? flights[chosen].to : flightPoint(flights[chosen]);
    }
    // A replay jumping straight to a position (magic_once) can mean
    // hundreds of flights at once, so there the stagger is a tenth as
    // long again, or the jump would take forever.
    //
    // But a stone leaving a point only lets go of it — and reads off its
    // own colour — once its own flight starts (just above); a stone
    // landing there must not start before that, or it draws its new
    // colour on the point first and the leaving stone picks that up
    // instead of its own. So a flight can never be scheduled after one
    // landing on the point it leaves from: pulled forward to match if it
    // would be, and anything leaving from where that pulled the flight
    // in turn arrives, and so on down the chain.
    const order = baseOrder;
    const departureFrom = new Map();
    flights.forEach((flight, i) => {
        if (flight.from !== undefined) {
            departureFrom.set(flight.from, i);
        }
    });
    for (let pass = 0; pass < flights.length; ++pass) {
        let changed = false;
        flights.forEach((flight, i) => {
            if (flight.to === undefined) {
                return;
            }
            const departing = departureFrom.get(flight.to);
            if (departing !== undefined && order[departing] > order[i]) {
                order[i] = order[departing];
                changed = true;
            }
        });
        if (!changed) {
            break;
        }
    }
    const stagger = (liftTime + slideTime + landTime) / (clock.magic_once ? 200 : 20);
    flights.forEach((flight, i) => {
        clock.magic_flights.push(flight);
        flight.timeoutId = window.setTimeout(() => {
            flight.timeoutId = null;
            // The stone is off its point only once its own flight starts,
            // not before, so it sits there undisturbed through its wait.
            if (flight.kind == 'slide' || flight.kind == 'away') {
                flight.src = clock.getDrawnStoneSrc(flight.fromCoords);
                clock.eraseStone(flight.fromCoords);
            }
            fly(clock, flight, () => {
                clock.magic_flights.splice(clock.magic_flights.indexOf(flight), 1);
                if (flight.to !== undefined) {
                    clock.stones_shown[flight.to] = flight.colour;
                    clock.drawStone(clock.get_coords(flight.to), flight.colour, 0, flight.src);
                    if (!landed) {
                        landed = true;
                        clock.sound?.place(flight.colour == white ? 'white' : 'black');
                    }
                }
                if (clock.magic_flights.length == 0) {
                    // A moment with the board as it is, then the next look.
                    clock.idle_timer = window.setTimeout(() => clock.transform(), clock.pause);
                }
            });
        }, order[i]*stagger*1000);
    });
    return true;
}

// A stone off the table: out of the list, and anything lying up on it
// comes down, unless it lies on another too.
function takeFromTable(clock, entry) {
    clock.table_stones.splice(clock.table_stones.indexOf(entry), 1);
    const diameter = clock.goban_width/20;
    clock.table_stones.forEach((other) => {
        if (other.lift > 0 && Math.hypot(other.x - entry.x, other.y - entry.y) < diameter
            && !clock.table_stones.some((third) => third !== other && third.lift < other.lift
                && Math.hypot(other.x - third.x, other.y - third.y) < diameter)) {
            other.lift = 0;
            drawOnTable(other.element, 1);
        }
    });
}

// A flight's element set going: up, across and down for a slide or a
// stone from the table; down out of the air for one from the bowl; up
// into the air and gone for one going to it.
function fly(clock, flight, onLand) {
    let element;
    let start;
    if (flight.kind == 'table') {
        const entry = flight.entry;
        element = entry.element;
        element.className = 'board_pos magic-stone';
        element.style.transform = '';
        flight.src = entry.src;
        start = clock.pixelStonePosition(entry.x, entry.y, 0);
        start = [start[0] + start[2]*(1 - tableStoneScale)/2, start[1] + start[3]*(1 - tableStoneScale)/2, start[2]*tableStoneScale, start[3]*tableStoneScale];
    } else {
        element = stoneElement({className: 'board_pos magic-stone'});
        const image = element.querySelector('img');
        image.src = flight.src || stoneImageSrc(flight.colour);
        flight.src = image.src;
        $('#goban').append(element);
    }
    const shadow = element.querySelector('.stone-shadow');
    setVisible(shadow, true);
    flight.element = element;
    const box = (p) => ({left: p[0], top: p[1], width: p[2], height: p[3]});

    if (flight.kind == 'bowl') {
        setLandingOffset(clock, flight.to);
        const to = clock.get_coords(flight.to);
        setStyles(element, {...box(clock.stonePosition(to[0], to[1], maxLift)), opacity: 0});
        setStoneShadow(shadow, maxLift);
        animateElement(element, slideTime, {...box(clock.stonePosition(to[0], to[1], 0)), opacity: 1, easing: 'ease-out', onComplete: () => {
            element.remove();
            onLand();
        }});
        return;
    }
    if (flight.kind == 'away') {
        const from = flight.fromCoords;
        setStyles(element, {...box(clock.stonePosition(from[0], from[1], 0)), opacity: 1});
        setStoneShadow(shadow, 0);
        animateElement(element, slideTime, {...box(clock.stonePosition(from[0], from[1], maxLift)), opacity: 0, easing: 'ease-in', onComplete: () => {
            element.remove();
            onLand();
        }});
        return;
    }
    if (flight.kind == 'slide') {
        start = clock.stonePosition(flight.fromCoords[0], flight.fromCoords[1], 0);
    }
    setLandingOffset(clock, flight.to);
    const to = clock.get_coords(flight.to);
    setStyles(element, box(start));
    setStoneShadow(shadow, 0);

    // Slid: across the board, never off it.
    if (flight.slid) {
        const across = Math.max(slidePerPoint, dist(flight.from, flight.to)*slidePerPoint);
        animateElement(element, across, {...box(clock.stonePosition(to[0], to[1], 0)), onComplete: () => {
            element.remove();
            onLand();
        }});
        return;
    }
    const up = flight.kind == 'slide'
        ? clock.stonePosition(flight.fromCoords[0], flight.fromCoords[1], flightHeight)
        : clock.pixelStonePosition(flight.entry.x, flight.entry.y, flightHeight);
    setStoneShadow(shadow, flightHeight);
    animateElement(element, liftTime, {...box(up), easing: 'ease-out', onComplete: () => {
        animateElement(element, slideTime, {...box(clock.stonePosition(to[0], to[1], flightHeight)), easing: 'ease-in-out', onComplete: () => {
            setStoneShadow(shadow, 0);
            animateElement(element, landTime, {...box(clock.stonePosition(to[0], to[1], 0)), easing: 'ease-in', onComplete: () => {
                element.remove();
                onLand();
            }});
        }});
    }});
}

// The stones in flight let go where they are, as loose stones for a
// finger or a sweep to take on (see dropHeldStones in go-clock.js).
export function dropMagicStones(clock) {
    const stones = [];
    const gobanRect = $('#goban').getBoundingClientRect();
    clock.magic_flights.forEach((flight) => {
        // Still waiting its turn to start, staggered behind others in the
        // same group: nothing on screen has moved for it yet, so there is
        // only the wait to cancel.
        if (flight.timeoutId != null) {
            window.clearTimeout(flight.timeoutId);
            return;
        }
        const element = flight.element;
        const opacity = parseFloat(getComputedStyle(element).opacity);
        const at = elementCentre(element, clock.goban_width/20, gobanRect);
        cancelElementAnimations(element);
        element.remove();
        // One fading into the bowl, or not yet out of it, has gone.
        if (opacity > 0.5) {
            stones.push(clock.looseStone(flight.src, flight.colour, at[0], at[1]));
        }
    });
    clock.magic_flights = [];
    window.clearTimeout(clock.idle_timer);
    return stones;
}
