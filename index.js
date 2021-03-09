const {Twinkly} = require("./lib/Twinkly");
const {Discoverer} = require("./lib/Discoverer");

const PLUGIN_NAME = "homebridge-twinkly";
const ACCESSORY_NAME = "Twinkly";
const PLATFORM_NAME = "Twinkly";
const MS_PER_MINUTE = 60_000;

let hap, Service, Characteristic;

// "accessories": [{
//     "accessory": "Twinkly",
//     "name": "Christmas Tree",
//     "ip": "192.168.4.1",
//     "allowBrightnessControl": true
// }]

class TwinklyHomebridge extends Twinkly {
    constructor(log, config) {
        super(log, config["ip"], config["timeout"] || 500, config["verbose"]);

        this.logVerbose("Configuration:");
        this.logVerbose(config);

        let name = config["name"];
        if (!name) {
            log("No name specified");
            name = "Twinkly";
        }
        this.name = name;
        this.isBrightnessControlEnabled = config["allowBrightnessControl"];
        if (this.isBrightnessControlEnabled === undefined) { this.isBrightnessControlEnabled = true; }
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
        registerCharacteristic(lightService, characteristic, it => this.logVerbose(it), getter, setter);
    }
}

function registerCharacteristic(lightService, characteristic, log, getter, setter) {
    // TODO: Migrate to promise-based API when requiring minimum version 1.3.0 of homebridge
    // https://developers.homebridge.io/#/api/characteristics
    lightService.getCharacteristic(characteristic)
        .on(hap.CharacteristicEventTypes.GET, callback => {
            log(`Homebridge requests characteristic "${characteristic.name}"`);
            wrap(getter(), callback);
        })
        .on(hap.CharacteristicEventTypes.SET, (value, callback) => {
            log(`Homebridge updates characteristic "${characteristic.name}"`);
            wrap(setter(value), callback, true);
        });
}

function wrap(promise, callback, isSet = false) {
    promise
        .then(arg => callback(null, isSet ? null : arg))
        .catch(error => callback(error));
}

// "platforms": [{
//     "platform": "Twinkly",
//     "allowBrightnessControl": true,
//     "removeUnreachableDeviceMinutes": false
// }]

class TwinklyPlatform {
    constructor(log, config, api) {
        this.log = it => log.info(it);

        this.isBrightnessControlEnabled = config["allowBrightnessControl"];
        if (this.isBrightnessControlEnabled === undefined) { this.isBrightnessControlEnabled = true; }

        this.verbose = config.verbose;
        this.timeout = config.timeout || 1000;
        this.scanInterval = config.scanInterval || 60_000;
        this.offlineRemoveTime = (config["removeUnreachableDeviceMinutes"] || 0) * MS_PER_MINUTE;
        this.api = api;
        this.accessories = new Map();
        this.devices = new Map();
        this.startTime = new Date();

        api.on("didFinishLaunching", () => {
            setInterval(() => this.scan(), this.scanInterval);
            this.scan();
        });

        this.logVerbose("Configuration:");
        this.logVerbose(config);
    }

    logVerbose(msg) {
        if (this.verbose) {
            this.log(msg);
        }
    }

    scan() {
        let oldDevices = new Map(this.devices);

        let discoverer = new Discoverer(this.log, this.verbose, this.timeout, device => this.checkDiscoveredDevice(device));
        discoverer.start().then(devices => {
            if (this.offlineRemoveTime && devices.length < oldDevices.size) {
                for (let device of devices) {
                    oldDevices.delete(device.uuid);
                }
                this.log("Unreachable devices:");
                for (let [uuid, device] of oldDevices) {
                    let lastSeen = device.lastSeen?.toLocaleString() || "never";
                    this.log(`- ${device} (last seen: ${lastSeen})`);

                    let accessory = this.accessories.get(uuid);
                    let timeElapsed = new Date() - (device.lastSeen || this.startTime);
                    if (accessory && timeElapsed > this.offlineRemoveTime) {
                        this.log(`Removing unreachable device ${device}`);
                        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
                        this.accessories.delete(uuid);
                        this.devices.delete(uuid);
                    }
                }
            }
        });
    }

    checkDiscoveredDevice(device) {
        let uuid = device.uuid;

        let existingDevice = this.devices.get(uuid);
        if (existingDevice) {
            this.log(`Found known device: ${existingDevice}`);
            existingDevice.lastSeen = new Date();
            return;
        }

        this.log(`Found unknown device: ${device}`);

        let accessory = this.accessories.get(uuid);
        if (!accessory) {
            accessory = new this.api.platformAccessory(device.name, uuid);
            accessory.addService(Service.Lightbulb, accessory.displayName);

            this.configureAccessory(accessory);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }

        accessory.context.lastKnownAddress = device.address;
        device.lastSeen = new Date();

        this.devices.set(uuid, device);
    }

    configureAccessory(accessory) {
        let uuid = accessory.UUID;

        if (this.accessories.get(uuid)) {
            this.log("Already configured");
            return;
        }

        this.log(`Initializing platform accessory: ${uuid} (${accessory.displayName})`);
        if (!this.devices.get(uuid)) {
            let lastKnownAddress = accessory.context.lastKnownAddress;
            if (lastKnownAddress) {
                this.log(`Last known address: ${lastKnownAddress}`);
                let device = new Twinkly(this.log, lastKnownAddress, this.timeout, this.verbose);
                device.uuid = uuid;
                this.devices.set(uuid, device);
            }
        }
        this.registerAccessoryCharacteristics(accessory);
    }

    registerAccessoryCharacteristics(accessory) {
        let uuid = accessory.UUID;

        accessory.on("identify",
            (_, callback) => wrap(this.callWithDevice(uuid, device => device.identify()), callback));

        let lightService = accessory.getService(Service.Lightbulb);
        if (!lightService) {
            service = accessory.addService(Service.Lightbulb);
        }

        this.registerCharacteristic(uuid, lightService, Characteristic.On,
            device => device.isOn(),
            (device, value) => value ? device.ensureOn() : device.setOn(false));

        if (this.isBrightnessControlEnabled) {
            this.registerCharacteristic(uuid, lightService, Characteristic.Brightness,
                device => device.getBrightness(),
                (device, value) => device.setBrightness(value));
        }

        this.accessories.set(uuid, accessory);
    }

    registerCharacteristic(uuid, lightService, characteristic, getter, setter) {
        registerCharacteristic(lightService, characteristic, it => this.logVerbose(it),
            () => this.callWithDevice(uuid, getter),
            value => this.callWithDevice(uuid, device => setter(device, value)));
    }

    callWithDevice(uuid, func) {
        let device = this.devices.get(uuid);
        if (!device) {
            this.log(`Error: Device for ${uuid} not found`);
        }
        return device != null ? func(device) : Promise.reject("device not found");
    }
}

module.exports = homebridge => {
    hap = homebridge.hap;
    Service = hap.Service;
    Characteristic = hap.Characteristic;

    homebridge.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, TwinklyHomebridge);
    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, TwinklyPlatform);
};
