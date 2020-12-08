const request = require("request");

const retryLimit = 5;

class RequestQueue {
    constructor(log, baseUrl) {
        this.log = log;
        this.baseUrl = baseUrl;
        this.queue = [];
        this.token = null;
        this.isAuthenticating = false;
        this.retryCount = 0;
    }

    authenticate() {
        this.isAuthenticating = true;
        this.token = null;
        this.log("Authentication…");
        let challenge = {
            challenge: "00000000000000000000000000000000000000000000"
        };
        this.postJson("login", challenge, true)
            .then(json => {
                this.token = json.authentication_token;
                let response = {
                    "challenge-response": json["challenge-response"]
                };
                return this.postJson("verify", response, true);
            })
            .then(() => {
                this.log("Authentication successful");
                this.isAuthenticating = false;
                this.nextRequest();
            })
            .catch(() => {
                this.log("Authentication failure");
                this.isAuthenticating = false;
            });
    }

    nextRequest() {
        if (this.queue.length === 0 || this.isAuthenticating) return;

        this.performRequest(this.queue[0]);
    }

    performRequest(element) {
        let {request: req, resolve, reject} = element;

        req.baseUrl = this.baseUrl;
        req.resolveWithFullResponse = true;
        if (this.token) {
            req.headers["X-Auth-Token"] = this.token;
        } else if (!this.isAuthenticating) {
            this.authenticate();
            return;
        }

        this.log(`${req.method} ${req.baseUrl}/${req.url}`);
        if (req.body) {
            this.log(req.body);
        }

        request(req, (error, response, body) => {
            this.retryCount = 0;
            if (error) {
                this.log(error);
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
                try {
                    let json = JSON.parse(body);
                    this.log(json);
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            }
        });
    }

    addRequest(isAuth, request) {
        return new Promise((resolve, reject) => {
            let element = {
                request: request,
                resolve: resolve,
                reject: reject
            };
            if (isAuth) {
                this.performRequest(element);
            } else {
                this.queue.push(element);
                if (this.queue.length === 1) {
                    this.nextRequest();
                }
            }
        })
            .then(json => {
                if (!isAuth) {
                    this.queue.shift();
                }
                this.nextRequest();
                return json;
            })
            .catch(error => this.log(error));
    }

    get(url, isAuth = false) {
        return this.addRequest(isAuth, {
            method: "GET",
            url: url,
            headers: {},
        });
    }

    post(url, body, mime, length, isAuth = false) {
        return this.addRequest(isAuth, {
            method: "POST",
            url: url,
            headers: {
                "Content-Type": mime,
                "Content-Length": length, // Twinkly fails to parse JSON without Content-Length header
            },
            body: body,
        });
    }

    postJson(url, postData, isAuth = false) {
        let json = JSON.stringify(postData);
        return this.post(url, json, "application/json", json.length, isAuth);
    }

    postOctet(url, octet, isAuth = false) {
        return this.post(url, octet, "application/octet-stream", octet.byteLength, isAuth);
    }
}

exports.RequestQueue = RequestQueue;
