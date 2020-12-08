const {RequestQueue} = require("./RequestQueue");
const {Movie} = require("./Movie");

class Twinkly {
    constructor(log, config) {
        const ip = config["ip"];
        if (!ip) {
            log("No IP specified");
        }

        this.log = log;
        const timeout = config["timeout"] || 500;
        this.requestService = new RequestQueue(log, `http://${ip}/xled/v1`, timeout);

        this.model = null;
        this.serialNumber = null;
        this.ledCount = null;
        this.ledProfile = null;
        this.initPromise = null;
    }

    ensureDeviceInfo() {
        return this.model != null ? Promise.resolve() : this.queryDeviceInfo();
    }

    queryDeviceInfo() {
        return this.requestService.get("gestalt")
            .then(json => {
                this.model = json.product_code;
                this.serialNumber = json.hw_id;
                this.ledCount = json.number_of_led;
                this.ledProfile = json.led_profile;
            });
    }

    isOn() {
        return this.requestService.get("led/mode")
            .then(json => json.mode !== "off");
    }

    setOn(on) {
        return this.setMode(on ? "movie" : "off");
    }

    ensureOn(on = true) {
        return this.ensureMode(on ? "movie" : "off");
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

    setMode(mode) {
        return this.requestService.postJson("led/mode", {mode: mode});
    }

    ensureMode(mode) {
        return this.ensureDeviceInfo()
            // Don't enable if already on, because this causes the animation to re-start.
            // Homebridge will try to turn it "on" on every brightness change.
            .then(() => this.requestService.get("led/mode"))
            .then(json => json.mode !== mode ? this.setMode(mode) : json);
    }

    reset() {
        return this.requestService.get("reset");
    }
}

exports.Twinkly = Twinkly;
