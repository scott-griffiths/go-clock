// Blurs drawn once, ahead of time, rather than asked of the browser as a
// CSS blur (a `filter` or a `box-shadow`) whose radius changes with every
// frame a stone rises or falls: WebKit draws one of those afresh each
// time it changes, and a hundred stones in the air at once had an iPhone
// 12 mini down to under 20 frames a second. A stone at a height between
// two drawn images shows the lower of them with the upper faded in over it.
//
// Each set of images is a few rules in a style sheet of their own, keyed
// by data attributes (`data-lower`, `data-upper`) on the element whose
// ::before and ::after pseudo-elements wear them: moving from one image to
// the next is setting an attribute, and each image is decoded once, not
// again with every change.

let sheet = null;
export function addImageRules(rules) {
    if (!sheet) {
        sheet = document.createElement('style');
        sheet.id = 'soft-images';
        document.head.append(sheet);
    }
    sheet.append(rules.join('\n') + '\n');
}

// Where `value` falls among `count` drawn images (0 to count - 1): the
// lower one, and how far on towards the next, in 32nds, as fine as a
// fade needs and no finer, so that a change too small to see restyles
// nothing.
export function between(value, count) {
    const v = Math.max(0, Math.min(value, count - 1));
    let lower = Math.floor(v);
    let mix = Math.round((v - lower)*32)/32;
    if (mix === 1) {
        ++lower;
        mix = 0;
    }
    return lower >= count - 1 ? {lower: count - 1, upper: count - 1, mix: 0} : {lower, upper: lower + 1, mix};
}

function canvas(size) {
    const element = document.createElement('canvas');
    element.width = element.height = size;
    return [element, element.getContext('2d')];
}

// The widths of three box blurs one after another that between them make
// a Gaussian blur of standard deviation `sigma` px (the `blur()` of CSS),
// as half-widths.
function boxRadii(sigma) {
    const n = 3;
    const ideal = Math.sqrt(12*sigma*sigma/n + 1);
    let lower = Math.floor(ideal);
    if (lower % 2 == 0) {
        --lower;
    }
    const upper = lower + 2;
    const m = Math.round((12*sigma*sigma - n*lower*lower - 4*n*lower - 3*n)/(-4*lower - 4));
    return Array.from({length: n}, (_, i) => ((i < m ? lower : upper) - 1)/2);
}

// One box blur of half-width `r` along rows (`step` 4, a pixel) or
// columns (`step` 4*width, a row), from `src` into `dst`; beyond the edge
// is transparent.
function boxBlur(src, dst, width, height, r, step) {
    const [lines, length, lineStep] = step == 4 ? [height, width, 4*width] : [width, height, 4];
    const scale = 1/(2*r + 1);
    for (let line = 0; line < lines; ++line) {
        const base = line*lineStep;
        for (let c = 0; c < 4; ++c) {
            let sum = 0;
            for (let i = 0; i < r && i < length; ++i) {
                sum += src[base + i*step + c];
            }
            for (let i = 0; i < length; ++i) {
                if (i + r < length) {
                    sum += src[base + (i + r)*step + c];
                }
                if (i - r - 1 >= 0) {
                    sum -= src[base + (i - r - 1)*step + c];
                }
                dst[base + i*step + c] = sum*scale;
            }
        }
    }
}

// The canvas's picture blurred as CSS's `blur(sigma px)` would blur it:
// with its colours weighted by their alpha while they are spread, so that
// a white stone's edge does not darken into the transparent around it.
function blurCanvas(context, size, sigma) {
    if (sigma <= 0) {
        return;
    }
    const image = context.getImageData(0, 0, size, size);
    const data = image.data;
    let a = new Float32Array(data.length);
    let b = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3]/255;
        a[i] = data[i]*alpha;
        a[i + 1] = data[i + 1]*alpha;
        a[i + 2] = data[i + 2]*alpha;
        a[i + 3] = data[i + 3];
    }
    boxRadii(sigma).forEach((r) => {
        boxBlur(a, b, size, size, r, 4);
        boxBlur(b, a, size, size, r, 4*size);
    });
    for (let i = 0; i < data.length; i += 4) {
        const alpha = a[i + 3]/255;
        data[i] = alpha > 0 ? a[i]/alpha : 0;
        data[i + 1] = alpha > 0 ? a[i + 1]/alpha : 0;
        data[i + 2] = alpha > 0 ? a[i + 2]/alpha : 0;
        data[i + 3] = a[i + 3];
    }
    context.putImageData(image, 0, 0);
}

// A stone's shadow, as CSS drew it: a disc the stone's size filled at
// `fill` alpha, and around it (never under it: an outer box-shadow is not
// drawn beneath its box) a glow, the disc grown by `spread` and blurred
// by `blur` at `glow` alpha; the sizes in shares of the stone's width.
// Drawn `diameter` px across, with `pad` widths of room on every side for
// the glow; an image's URL.
export function shadowImage({fill, glow, blur, spread}, rgb, {diameter, pad}) {
    const size = Math.round(diameter*(1 + 2*pad));
    const [element, context] = canvas(size);
    const middle = size/2;
    const disc = (radius) => {
        context.beginPath();
        context.arc(middle, middle, Math.max(0, radius), 0, 2*Math.PI);
        context.fill();
    };
    context.fillStyle = `rgb(${rgb} / ${glow})`;
    disc(diameter*(0.5 + spread));
    // The radius CSS gives a box-shadow's blur is twice its deviation.
    blurCanvas(context, size, blur*diameter/2);
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = '#000';
    disc(diameter/2);
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = `rgb(${rgb} / ${fill})`;
    disc(diameter/2);
    return element.toDataURL('image/png');
}

// A picture blurred by each of `sigmas` (shares of its width): drawn
// `diameter` px across with `pad` widths of room on every side for the
// blur to spread into. Draws one image at a time, between other work, and
// resolves to their URLs; rejects if the picture cannot be read back from
// a canvas.
export async function blurredImages(src, sigmas, {diameter, pad}) {
    const picture = new Image();
    picture.src = src;
    await picture.decode();
    const size = Math.round(diameter*(1 + 2*pad));
    const offset = (size - diameter)/2;
    const urls = [];
    for (const sigma of sigmas) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const [element, context] = canvas(size);
        context.drawImage(picture, offset, offset, diameter, diameter);
        blurCanvas(context, size, sigma*diameter);
        urls.push(element.toDataURL('image/png'));
    }
    return urls;
}
