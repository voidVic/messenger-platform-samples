var devices = require('../nlp-engine/api/device-data.json');
var _ = require('lodash');

function listDevices(device) {
    var subArray  = [];
    switch (device) {
        case 'all': {
            let total = 0;
            _.forEach(devices.summary, function(v, k){
               total += devices.summary[k].total;
            });
            return "you have a total of " + total + " devices connected";
        }
        case 'light': {
            let total = 0;
            let str = "You have a total of " + devices.summary.lights.total + " light bulbs, out of which ";
            _.forEach(devices.summary.lights, function(v, k){
                if(k != 'total'){
                    str +=", "+ v + " are " + k;
                }
             });

             return str;
        }

    }
}

module.exports.listDevices = listDevices;