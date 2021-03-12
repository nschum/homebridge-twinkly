const {Twinkly} = require("./Twinkly");

const dgram = require("dgram");

/** Discovers Twinkly devices by sending a UDP broadcast */
class Discoverer {
    constructor(log, verbose, timeout, callback) {
        this.log = log;
        this.verbose = verbose;
        this.timeout = timeout;
        this.callback = callback;
    }

    start() {
        return new Promise((resolve, reject) => {
            let socket = dgram.createSocket("udp4");
            this.socket = socket;

            let expectedResponse = Buffer.from("OK");
            let results = [];

            socket.on("message", (message, info) => {
                if (message.subarray(4, 6).equals(expectedResponse)) {
                    let address = info.address;
                    let name = message.subarray(6).toString();
                    let device = new Twinkly(this.log, address, this.timeout, this.verbose);
                    device.ensureDeviceInfo()
                        .then(() => {
                            results.push(device);
                            this.callback(device);
                        });
                }
            });

            socket.on("listening", () => {
                this.log("Broadcasting to find devices...");
                socket.setBroadcast(true);
                this.sendRequest();
                this.timeout = setTimeout(() => this.stop(resolve, results), this.timeout);
            });

            socket.on("error", err => {
                this.log(`Discovery error: ${err}`);
                socket.close();
                reject();
            });

            socket.bind();
        });
    }

    cancel() {
        clearTimeout(this.timeout);
        this.stop(null, null);
    }

    sendRequest() {
        let message = Buffer.from("\x01discover");

        this.socket.send(message, 0, message.length, 5555, "255.255.255.255");
    }

    stop(resolve, results) {
        this.socket?.close();
        this.socket = null;
        if (resolve) {
            resolve(results);
        }
    }
}

exports.Discoverer = Discoverer;
