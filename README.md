# homebridge-twinkly

[HomeBridge](http://github.com/nfarina/homebridge) module for [Twinkly](https://www.twinkly.com) smart christmas lights

## Features

Use Siri or HomeKit automation to:
- Turn Twinkly on or off
- Change brightness

A simple command line tool is also included.

## Setup

First set up [HomeBridge](http://github.com/nfarina/homebridge).

Configure Twinkly using the iOS or Android app and make sure it's connected to the same network and note the IP address. It might be useful to have your router always assign it the same IP address.

Install `homebridge-twinkly` using `sudo npm install -g homebridge-twinkly`.

### Example config.json

```json
{
  "bridge": {
      ...
  },
  "accessories": [{
    "accessory": "Twinkly",
    "name": "Christmas Lights",
    "ip": "192.168.4.1",
    "allowBrightnessControl": true
  }]
}
```

### Configuration options

| Value                  | Default       | Description                                                 |
|------------------------|---------------|-------------------------------------------------------------|
| accessory              | (required)    | Identifies module and must be `"Twinkly"`                   |
| name                   | (required)    | The name for light as it will appear in HomeKit             |
| ip                     | (required)    | The IP address of the lights.                               |
| allowBrightnessControl | true          | Adds a brightness control instead of a simple on/off switch |


## Command line

Turn on:
```
twinkly --ip 192.168.4.1 --mode movie
```

Turn off:
```
twinkly --ip 192.168.4.1 --mode off
```

Set brightness to 50%:
```
twinkly --ip 192.168.4.1 --brightness 50
```

Blink:
```
twinkly --ip 192.168.4.1 -c 128,0,0 -c 0,255,0 -c 64,0,6 --effect blink --delay 500
```

## Acknowledgements

Thanks to Pavol Babinčák for [documenting](https://xled.readthedocs.io/en/latest/) the private API.
