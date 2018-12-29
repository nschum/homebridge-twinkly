class Frame {
    constructor(ledCount) {
        this.leds = new Array(ledCount);
        this.ledCount = ledCount;
    }

    static repeatedColors(ledCount, colors) {
        let frame = new Frame(ledCount);
        for (let i = 0; i < ledCount; i++) {
            frame.put(i, colors[i % colors.length]);
        }
        return frame;
    }

    addTwinkle(count, minIntensity) {
        const probabilityFlicker = 0.01;
        for (let i = 0; i < this.ledCount; i++) {
            let isFlicker = Math.random() < probabilityFlicker;
            let intensity = isFlicker ? 0.8 + gaussRandom() / 20 : 0.9 + gaussRandom() / 25;
            this.scaleBrightness(i, Math.min(1.0, Math.max(0, intensity)));
        }
    }

    scaleBrightness(index, scale) {
        scale = Math.max(scale, 0);
        let color = this.get(index);
        if (color instanceof Array && color.length === 3) {
            let [c1, c2, c3] = color;
            scale = limitBrightnessScale(c1, scale);
            scale = limitBrightnessScale(c2, scale);
            scale = limitBrightnessScale(c3, scale);
            color = [c1 * scale, c2 * scale, c3 * scale];
            this.put(index, color);
        } else {
            throw `unknown color format ${color}`;
        }
    }

    get(index) {
        return this.leds[index];
    }

    put(index, color) {
        this.leds[index] = color;
    }

    getArray(ledProfile) {
        let array = new Uint8Array(this.ledCount * 3);
        for (let i = 0; i < this.ledCount; i++) {
            let color = this.leds[i];
            if (color instanceof Array && color.length === 3) {
                let [c1, c2, c3] = color;
                array[3 * i] = c1;
                array[3 * i + 1] = c2;
                array[3 * i + 2] = c3;
            } else {
                throw `unknown color format ${color}`;
            }
        }
        return array;
    }
}

function gaussRandom() {
    // https://stackoverflow.com/a/36481059/168939
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Limit scale so that it won't cause an overflow */
function limitBrightnessScale(value, scale) {
    if (value * scale > 255.0) {
        return 255.0 / value;
    }
    return scale;
}

exports.Frame = Frame;
