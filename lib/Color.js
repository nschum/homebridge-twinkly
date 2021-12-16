function rgbColors(obj) {
    rgbInt = HSB2RGB({h: obj.hue, s: obj.saturation, b: obj.brightness});
    return [rgbInt.r, rgbInt.g, rgbInt.b];
};

// https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
function HSB2RGB(hsb) {
    
    var rgb = { };
    var h = Math.round(hsb.h % 360);
    var s = Math.round(hsb.s * 255 / 100);
    var v = Math.round(hsb.b * 255 / 100);
    
        if (s == 0) {
        
        rgb.r = rgb.g = rgb.b = v;
        } else {
        var t1 = v;
        var t2 = (255 - s) * v / 255;
        var t3 = (t1 - t2) * (h % 60) / 60;
        
            if (h == 360) h = 0;
                
                if (h < 60) { rgb.r = t1; rgb.b = t2; rgb.g = t2 + t3 }
                else if (h < 120) { rgb.g = t1; rgb.b = t2; rgb.r = t1 - t3 }
                else if (h < 180) { rgb.g = t1; rgb.r = t2; rgb.b = t2 + t3 }
                else if (h < 240) { rgb.b = t1; rgb.r = t2; rgb.g = t1 - t3 }
                else if (h < 300) { rgb.b = t1; rgb.g = t2; rgb.r = t2 + t3 }
                else if (h < 360) { rgb.r = t1; rgb.g = t2; rgb.b = t1 - t3 }
                else { rgb.r = 0; rgb.g = 0; rgb.b = 0 }
        }
    
    return { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) };
};

exports.rgbColors = rgbColors;