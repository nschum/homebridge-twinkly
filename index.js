const {Twinkly} = require("./lib/Twinkly");

let Service, Characteristic;

// "accessories": [{
//     "accessory": "Twinkly",
//     "name": "Christmas Tree",
//     "ip": "192.168.4.1",
//     "allowBrightnessControl": true
// }]

class TwinklyHomebridge extends Twinkly {
    constructor(log, config) {
        super(log, config);

        let name = config["name"];
        if (!name) {
            log("No name specified");
            name = "Twinkly";
        }
        this.name = name;
        this.isBrightnessControlEnabled = config["allowBrightnessControl"];
        if (this.isBrightnessControlEnabled === undefined) this.isBrightnessControlEnabled = true;
    }

    getServices() {
        let informationService = new Service.AccessoryInformation();
        informationService.setCharacteristic(Characteristic.Manufacturer, "LEDWORKS");
        // Can't set Model, SerialNumber, because getServices is synchronous

        let lightService = new Service.Lightbulb(this.name);
        this.registerCharacteristic(lightService, Characteristic.On,
            () => this.isOn(),
            value => value ? this.ensureOn() : this.setOn(false));

        if (this.isBrightnessControlEnabled) {
            this.registerCharacteristic(lightService, Characteristic.Brightness,
                () => this.getBrightness(),
                value => this.setBrightness(value));
        }

        return [lightService, informationService];
    }

    registerCharacteristic(lightService, characteristic, getter, setter) {
        lightService.getCharacteristic(characteristic)
            .on("get", callback => this.wrap(getter(), callback))
            .on("set", (value, callback) => this.wrap(setter(value), callback));
    }

    wrap(promise, callback) {
        promise
            .then(arg => callback(null, arg))
            .catch(error => callback(error));
    }
}

module.exports = homebridge => {
    ({Service, Characteristic} = homebridge.hap);

    homebridge.registerAccessory("homebridge-twinkly", "Twinkly", TwinklyHomebridge);
};
