const {RequestQueue} = require("./RequestQueue");
const {Movie} = require("./Movie");

const retryLimit = 5;

class Twinkly {
    constructor(log, config) {
        const ip = config["ip"];
        if (!ip) {
            log("No IP specified");
        }

        this.log = log;
        this.requestService = new RequestQueue(log, `http://${ip}/xled/v1`);

        this.model = null;
        this.serialNumber = null;
        this.ledCount = null;
        this.ledProfile = null;
        this.ledColors = null;
        this.initPromise = this.queryDeviceInfo();
    }

    queryDeviceInfo() {
        return this.requestService.get("gestalt")
            .then(json => {
                this.model = json.product_code;
                this.serialNumber = json.hw_id;
                this.ledCount = json.number_of_led;
                this.ledProfile = json.led_profile;
                this.ledColors = 3;
            });
    }

    isOn() {
        return this.requestService.get("led/mode")
            .then(json => json.mode !== "off");
    }

    setOn(on) {
        return this.setMode(on ? "movie" : "off");
    }

    setColor(color) {
        return this.initPromise
            .then(() => this.setMovie(Movie.repeatedColors(this.ledCount, [color])));
    }

    setColors(colors) {
        return this.initPromise
            .then(() => this.setMovie(Movie.repeatedColors(this.ledCount, colors)));
    }

    setBlinkingColors(colors, delay = 2000) {
        return this.initPromise
            .then(() => this.setMovie(Movie.blinkingColors(this.ledCount, delay, colors)));
    }

    setLoopingColors(colors, delay = 500) {
        return this.initPromise
            .then(() => this.setMovie(Movie.loopingColors(this.ledCount, delay, colors)));
    }

    setMovie(movie) {
        console.assert(movie.ledCount === this.ledCount);

        return this.initPromise
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

    reset() {
        return this.requestService.get("reset");
    }
}

exports.Twinkly = Twinkly;
