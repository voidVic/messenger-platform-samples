var async = require("async");
var request = require('request');
var fs = require('fs');
var config = require("config");
var lightsApi = require("./light-api");
var file = __dirname + '/device-data.json';
var accountId = config.get("adapter.account");
var Authorization = config.get("adapter.Authorization");

var devices = {
    "lights": [],
    "locks": [],
    "summary": {
        "lights": {"total": 0},
        "locks": {"total": 0}
    },
    "lastCommand": {
        "isLocation": false,
        "isDevice": false,
        "isGroupCommand": false,
        "device": {
            "id": ""
        },
        "rules": {"out": [], "in": [] }
    }
};


function extractDevices(data){
    data = JSON.parse(data);
    var deviceArr = data._embedded.devices;
    for(let i = 0 ; i < deviceArr.length ; i++){
        let name = deviceArr[i].name;
        let id = deviceArr[i].id;
        let make = deviceArr[i].make;
        var deviceObj = {name, id, make};
        switch(deviceArr[i].adapter){
            case 'Philips Hue':
            case 'LIFX Light':
                devices.lights.push(deviceObj);
                devices.summary.lights.total++;
                devices.summary.lights[make] = devices.summary.lights[make] ? devices.summary.lights[make] + 1 : 1;
                break;
        }
    }
    console.log(devices);
    writeDataToFile(JSON.stringify(devices), file);

    fetchDeviceStatus(devices);
}
function getConnectedDevices(){
    console.log("######################\n\nWaiting for Molecule to give list of devices\n\n--------------------------------");
    var options = {
        url: 'https://hub.int.iot.comcast.net/client/account/'+ accountId +'/devices',
        headers: {
            Authorization,
            "X-MOLECULE-GROUP": "enable-philips"
        },
        time: true
    }

    request.get(options, function(err, resp, body){
        if (err) {
            return console.log("error");
        }
        extractDevices(body)
        
        console.log("\n\nGot All Devices, YOu can begin with the App\n\n#####################");
    });
}
exports.init = getConnectedDevices;

function fetchDeviceStatus(devices){
    //for now just call Philips and Lifx for the device status
    async.parallel(function(taskCB){
        lightsApi.getAll(function(data){ taskCB(data); });
    }, function(data){
        for(var i = 0; i < data.length; i++){
            //do update data
        }
    });
}

var updateDataToFile = function(data){
    writeDataToFile(JSON.stringify(data), file);
}
exports.updateDataToFile = updateDataToFile;


var writeDataToFile = function(data, file){
    var exist = fs.existsSync(file);
     if(exist){
        try{
            //var stringData = JSON.stringify(data);
        }catch(ex){
            console.error("exception occured in Stringifying data to write to file. Error Below \n\nException: ", ex);
        }
        try{
            fs.writeFile(file, data);
        }catch(ex){
            console.error("exception occured while writing data to file. Error Below \n\nException: ", ex);
        }
        console.log("Data written and created Successfully");
    }else{
        console.log("Data cannot be written, File not found");
    }
}