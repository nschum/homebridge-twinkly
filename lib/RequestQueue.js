const request = require("request");

const retryLimit = 5;

class RequestQueue{
    constructor(log, verbose, baseUrl, timeout) {
        this.log = log;
        this.verbose = verbose;
        this.baseUrl = baseUrl;
        this.timeout = timeout;
        this.queue = [];
        this.token = null;
        this.isAuthenticating = false;
        this.retryCount = 0;
    }

    logVerbose(msg) {
        if (this.verbose) {
            this.log(msg);
        }
    }

    authenticate() {
        this.isAuthenticating = true;
        this.token = null;
        this.log("Authentication…");
        let challenge = {
            challenge: "00000000000000000000000000000000000000000000"
        };
        this.postJson("login", challenge, false)
            .then(json => {
                this.token = json.authentication_token;
                let response = {
                    "challenge-response": json["challenge-response"]
                };
                return this.postJson("verify", response, false);
            })
            .then(() => {
                this.log("Authentication successful");
                this.isAuthenticating = false;
                this.nextRequest();
            })
            .catch(error => {
                this.log("Authentication failure");
                this.isAuthenticating = false;
                this.cancelAll(error);
            });
    }

    cancelAll(error) {
        for (let request of this.queue) {
            let {request: req, resolve, reject} = request;
            reject(error);
        }
        this.queue = [];
    }

    nextRequest() {
        let length = this.queue.length;
        if (length === 0 || this.isAuthenticating) {
            this.logVerbose("Request queue is empty");
            return;
        }

        this.logVerbose(`Triggering next request (${length} in queue)`);
        this.performRequest(this.queue[0]);
    }

    performRequest(element) {
        let {request: req, resolve, reject} = element;

        req.baseUrl = this.baseUrl;
        req.timeout = this.timeout;
        req.resolveWithFullResponse = true;
        if (this.token) {
            req.headers["X-Auth-Token"] = this.token;
        } else if (req.authenticated && !this.isAuthenticating) {
            this.authenticate();
            return;
        }

        let message = `${req.method} ${req.baseUrl}/${req.url}`;
        this.log(message);
        if (req.body) {
            this.logVerbose(req.body);
        }

        request(req, (error, response, body) => {
            this.retryCount = 0;
            if (error) {
                this.log(`${message} -> ${error}`);
                reject(error);
            } else if (response.statusCode === 401) {
                this.log("Auth token expired");
                this.retryCount++;
                if (this.retryCount < retryLimit) {
                    this.authenticate();
                } else {
                    reject();
                }
            } else {
                if (response.statusCode !== 200) {
                    this.log(`Status code ${response.statusCode}`);
                    this.log(body);
                }
                try {
                    let json = JSON.parse(body);
                    this.logVerbose(json);
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            }
        });
    }

    addRequest(addToQueue, request, isAnonymous) {
        return new Promise((resolve, reject) => {
            let element = {
                request: request,
                resolve: resolve,
                reject: reject
            };
            if (!addToQueue) {
                this.performRequest(element);
            } else {
                this.queue.push(element);
                let length = this.queue.length;
                if (length === 1) {
                    this.nextRequest();
                }
                else {
                    this.logVerbose(`Request added to queue (${length} in queue)`);
                }
            }
        })
            .finally(() => {
                if (addToQueue) {
                    this.queue.shift();
                    this.nextRequest();
                }
            })
    }

    get(url, authenticated = true) {
        return this.addRequest(true, {
            method: "GET",
            url: url,
            headers: {},
            authenticated,
        });
    }

    post(url, body, mime, length, addToQueue) {
        return this.addRequest(addToQueue, {
            method: "POST",
            url: url,
            headers: {
                "Content-Type": mime,
                "Content-Length": length, // Twinkly fails to parse JSON without Content-Length header
            },
            body: body,
            authenticated: true,
        });
    }

    postJson(url, postData, addToQueue = true) {
        let json = JSON.stringify(postData);
        return this.post(url, json, "application/json", json.length, addToQueue);
    }

    postOctet(url, octet) {
        return this.post(url, octet, "application/octet-stream", octet.byteLength, true);
    }
}

exports.RequestQueue = RequestQueue;
