const {Twinkly} = require("./lib/Twinkly");

let Service, Characteristic;

// "accessories": [{
//     "accessory": "Twinkly",
//     "name": "Christmas Tree",
//     "ip": "192.168.4.1",
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
    }

    getServices() {
        let informationService = new Service.AccessoryInformation();
        informationService.setCharacteristic(Characteristic.Manufacturer, "LEDWORKS");
        // Can't set Model, SerialNumber, because getServices is synchronous

        let lightService = new Service.Lightbulb(this.name);
        lightService.getCharacteristic(Characteristic.On)
            .on("get", callback => this.wrap(this.isOn(), callback))
            .on("set", (value, callback) => this.wrap(this.setOn(value), callback));

        return [lightService, informationService];
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
