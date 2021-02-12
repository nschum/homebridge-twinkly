# homebridge-twinkly

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[Homebridge](http://github.com/nfarina/homebridge) module for [Twinkly](https://www.twinkly.com) decorative smart lights

## Features

Use Siri or HomeKit automation to:
- Turn Twinkly on or off
- Change brightness

A simple command line tool is also included.

## Setup

1. First set up [Homebridge](http://github.com/nfarina/homebridge).
2. Configure Twinkly using the iOS or Android app and make sure it's connected to the same network.
3. Install `homebridge-twinkly` using [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) or manually using `sudo npm install -g homebridge-twinkly`.

### Configuration options

| Value                          | Default       | Description                                                 |
|--------------------------------|---------------|-------------------------------------------------------------|
| allowBrightnessControl         | true          | Adds a brightness control instead of a simple on/off switch |
| removeUnreachableDeviceMinutes | 0             | When to remove unreachable devices (0 meaning never)        |

The options can be configured using the UI or manually in a config.json.

### Example config.json

```json
{
  "bridge": {
    "name": "…"
  },
  "platforms": [{
    "platform": "Twinkly",
    "allowBrightnessControl": true,
    "removeUnreachableDeviceMinutes": 0
  }]
}
```

## Setup as accessory (deprecated)

Prior to version 0.4.0 all lights had to be added individually. This is still possible, but is deprecated.

You'll need to find the IP address of each light using the Twinkly app. It might be useful to have your router always assign it the same IP address.

### Configuration options

| Value                  | Default       | Description                                                 |
|------------------------|---------------|-------------------------------------------------------------|
| accessory              | (required)    | Identifies module and must be `"Twinkly"`                   |
| name                   | (required)    | The name for light as it will appear in HomeKit             |
| ip                     | (required)    | The IP address of the lights.                               |
| allowBrightnessControl | true          | Adds a brightness control instead of a simple on/off switch |

The options can be configured using the UI or manually in a config.json.
Multiple lights are can be added as individual accessories.

### Example config.json

```json
{
  "bridge": {
    "name": "…"
  },
  "accessories": [{
    "accessory": "Twinkly",
    "name": "Christmas Lights",
    "ip": "192.168.4.1",
    "allowBrightnessControl": true
  }]
}
```

## Command line

Turn on:
```
twinkly --mode movie
```

Turn off:
```
twinkly --mode off
```

Set brightness to 50%:
```
twinkly --brightness 50
```

Blink:
```
twinkly -c 128,0,0 -c 0,255,0 -c 64,0,6 --effect blink --delay 500
```

## Acknowledgements

Thanks to Pavol Babinčák for [documenting](https://xled.readthedocs.io/en/latest/) the private API.
