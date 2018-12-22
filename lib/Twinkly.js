const {RequestQueue} = require("./RequestQueue");

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

    setMode(mode) {
        return this.requestService.postJson("led/mode", {mode: mode});
    }

    reset() {
        return this.requestService.get("reset");
    }
}

exports.Twinkly = Twinkly;
