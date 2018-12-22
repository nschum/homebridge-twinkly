# homebridge-twinkly

[HomeBridge](http://github.com/nfarina/homebridge) module for [Twinkly](https://www.twinkly.com) smart christmas lights

## Features

- Turn Twinkly on or off using Siri or HomeKit automation

## Setup

First set up [HomeBridge](http://github.com/nfarina/homebridge).

Configure Twinkly using the iOS or Android app and make sure it's connected to the same network and note the IP address. It might be useful to have your router always assign it the same IP address.

Install `homebridge-twinkly` using `sudo npm install -g homebridge-twinkly`.

## Example config.json

```json
{
  "bridge": {
      ...
  },
  "accessories": [{
    "accessory": "Twinkly",
    "name": "Christmas Lights",
    "ip": "192.168.4.1"
  }]
}
```
