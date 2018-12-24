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

exports.Frame = Frame;
