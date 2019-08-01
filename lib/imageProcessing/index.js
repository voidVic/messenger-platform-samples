// var pythonShell = require('python-shell')

// var detectCameraFaces = function(cb){
//     pyshell = new pythonShell('faceRecognizeFromModel.py', { scriptPath: 'C:/AnkitGIT/messengerBot/messenger-platform-samples/lib/imageProcessing/faceRecognitionModel/' });

//     pyshell.on('message', function(message){
//         console.log(message);
//         cb(message);
//     });
// }

// module.exports = {
//     detectCameraFaces
// }
// detectCameraFaces(function(m){console.log(m)});


var pythonShell = require('python-shell')
var PYSHELL_SINGLETON_OBJ = null;
var callerCB = false;
var trackerCB = false;
var scanPeopleCB = false;
var detectCB = {
    peopleCB: false, videoCB: false
}

var detectCameraFaces = function(cb){
   callerCB = cb;
   PYSHELL_SINGLETON_OBJ.send('whoIsAtDoor');
}

var trackThisPerson = function(name, time, cb){
    trackerCB = cb;
    PYSHELL_SINGLETON_OBJ.send('track::'+name.toLowerCase()+'::30.0');
}

var scanPeople = function(cb){
    scanPeopleCB = cb;
   PYSHELL_SINGLETON_OBJ.send('scanPeople');
}

var startDetect = function(peopleCB, videoCB) {
    detectCB = {peopleCB, videoCB}
    PYSHELL_SINGLETON_OBJ.send('detect');
}

//detectCameraFaces(function(m){  });

var analyseResp = function(m) {
    console.log(m);
    if(m.indexOf('xx--output--xx') > -1 ){
        console.log('gotcha');
        if(callerCB){
            callerCB(m);
            callerCB = false;
        }
        if(trackerCB){
            trackerCB(m);
            trackerCB = false;
        }
        if(scanPeopleCB){
            scanPeopleCB(m);
            scanPeopleCB = false;
        }
       // PYSHELL_SINGLETON_OBJ.send('start\n');
    }else{
        if(m.indexOf('xx--image-arr-out--xx') > -1 && detectCB.peopleCB) {
            detectCB.peopleCB(m);
            detectCB.peopleCB = false;
        }
        if(m.indexOf('xx--threat-vid-out--xx') > -1) {
            detectCB.videoCB(m);
            detectCB.videoCB = false;
        }
    }
}

let options = {
    pythonPath: 'python3',
    scriptPath: process.env.ROOT_PATH
}

if(PYSHELL_SINGLETON_OBJ == null){
    PYSHELL_SINGLETON_OBJ = new pythonShell('mainFaceDetection.py', options);
}


PYSHELL_SINGLETON_OBJ.on('message', function(message){
    //console.log(message);
    analyseResp(message);
    //cb();
});


module.exports = {
    detectCameraFaces,
    trackThisPerson,
    scanPeople,
    startDetect
}