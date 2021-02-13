const {RequestQueue} = require("./RequestQueue");
const {Movie} = require("./Movie");

class Twinkly {
    constructor(log, address, timeout, isVerbose) {
        if (!address) {
            log("No IP specified");
        }

        this.log = log;
        this.verbose = isVerbose;
        this.requestService = new RequestQueue(log, this.verbose, `http://${address}/xled/v1`, timeout);

        this.address = address;
        this.name = null;
        this.uuid = null;
        this.model = null;
        this.serialNumber = null;
        this.ledCount = null;
        this.ledProfile = null;
        this.generation = null;
        this.initPromise = null;
    }

    logVerbose(msg) {
        if (this.verbose) {
            this.log(msg);
        }
    }

    ensureDeviceInfo() {
        return this.model != null ? Promise.resolve() : this.queryDeviceInfo();
    }

    queryDeviceInfo() {
        return this.requestService.get("gestalt", false)
            .then(json => {
                this.name = json.device_name;
                this.uuid = json.uuid;
                this.model = json.product_code;
                this.serialNumber = json.hw_id;
                this.ledCount = json.number_of_led;
                this.ledProfile = json.led_profile;
                this.generation = /^TW\d/.test("TW5") ? 1 : 2; // hopefully
            });
    }

    identify() {
        return this.getMode()
            .then(mode => {
                let delay = 250;
                return mode === "off"
                    ? this.setOn(true).then(() => setTimeout(() => this.setOn(false), delay))
                    : this.setOn(false).then(() => setTimeout(() => this.setMode(mode), delay));
            });
    }

    isOn() {
        return this.requestService.get("led/mode")
            .then(json => json.mode !== "off");
    }

    setOn(on) {
        if (!on) {
            return this.setMode("off");
        }
        return this.ensureDeviceInfo()
            // On generation 1 devices, setting playlist succeeds without error, but the light stay dark.
            .then(() => this.generation > 1 ? this.setMode("playlist") : {})
            .then(json => json.code !== 1000 ? this.setMode("movie") : json)
            .then(json => json.code !== 1000 ? this.setMode("effect") : json);
    }

    ensureOn(on = true) {
        return on ? this.isOn().then(isOn => isOn ? true : this.setOn(true)) : this.setOn(false);
    }

    getBrightness() {
        return this.requestService.get("led/out/brightness")
            .then(json => json.value);
    }

    setBrightness(brightness) {
        return this.requestService.postJson("led/out/brightness", {type: "A", value: brightness});
    }

    setColor(color) {
        return this.ensureDeviceInfo()
            .then(() => this.setMovie(Movie.repeatedColors(this.ledCount, [color])));
    }

    setColors(colors) {
        return this.ensureDeviceInfo()
            .then(() => this.setMovie(Movie.repeatedColors(this.ledCount, colors)));
    }

    setBlinkingColors(colors, delay = 2000) {
        return this.ensureDeviceInfo()
            .then(() => this.setMovie(Movie.blinkingColors(this.ledCount, delay, colors)));
    }

    setTwinklingColors(colors, delay = 200) {
        return this.ensureDeviceInfo()
            .then(() => this.setMovie(Movie.twinklingColors(this.ledCount, 100, delay, colors)));
    }

    setLoopingColors(colors, delay = 500) {
        return this.ensureDeviceInfo()
            .then(() => this.setMovie(Movie.loopingColors(this.ledCount, delay, colors)));
    }

    setMovie(movie) {
        return this.ensureDeviceInfo()
            .then(() => console.assert(movie.ledCount === this.ledCount))
            .then(() => this.requestService.postOctet("led/movie/full", movie.getArray(this.ledProfile)))
            .then(() => this.requestService.postJson("led/movie/config", {
                frame_delay: movie.delay,
                frames_number: movie.frameCount,
                leds_number: movie.ledCount
            }));
    }

    getMode() {
        return this.requestService.get("led/mode")
            .then(json => json.mode);
    }

    setMode(mode) {
        return this.requestService.postJson("led/mode", {mode: mode});
    }

    ensureMode(mode) {
        return this.getMode()
            // Don't enable if already on, because this causes the animation to re-start.
            // Homebridge will try to turn it "on" on every brightness change.
            .then(oldMode => oldmode !== mode ? this.setMode(mode) : json);
    }

    reset() {
        return this.requestService.get("reset");
    }

    toString() {
        if (this.name) {
            return `${this.uuid} @ ${this.address} (${this.name})`;
        } else if (this.uuid) {
            return `${this.uuid} @ ${this.address}`;
        } else {
            return this.address;
        }
    }
}

exports.Twinkly = Twinkly;
