const bjc = require('natural-brain');
const data = require('./mlData.json');
const natural = require('natural');
const path = require("path");
const request = require('request');
var _ = require('lodash');
const lightApi = require('../api/light-api');
const config = require("config");
var moleculeAPI = require('../api/molecule-api');
var services = require('../../services/buildResponse');
var utils = require('../../utils')

var imageProcessing = require('../../imageProcessing');
//moleculeAPI.init();

var tokenizer = new natural.WordTokenizer();

var base_folder = path.join(path.dirname(require.resolve("natural")), "brill_pos_tagger");
var rulesFilename = base_folder + "/data/English/tr_from_posjs.txt";
var lexiconFilename = base_folder + "/data/English/lexicon_from_posjs.json";
var defaultCategory = 'N';
var accountId = config.get("adapter.account");
var Authorization = config.get("adapter.Authorization");
var lexicon = new natural.Lexicon(lexiconFilename, defaultCategory);
var rules = new natural.RuleSet(rulesFilename);
var tagger = new natural.BrillPOSTagger(lexicon, rules);

let eventClassifier = new bjc();
let eventConditionClassifier = new bjc();
//let classifier = new bjc();
let colorClassifier = new bjc();
let conditionalClassifier = new bjc();
let statusClassifier = new bjc();
let questionClassifier = new bjc();

const colorArr = [
    { color: 'red', code: '#ff6666' },
    { color: 'green', code: '#66ff66' },
    { color: 'blue', code: '#6666ff' },
    { color: 'white', code: '#bbbbbb' },
    { color: 'pink', code: '#885EAD' },
];

let trainData = () => {

    const eventDataLength = data.event.length;
    for (let i = 0; i < eventDataLength; i++) {
        eventClassifier.addDocument(data.event[i].q, data.event[i].a);
    }
    eventClassifier.train();

    const questionDataLength = data.question.length;
    for (let i = 0; i < questionDataLength; i++) {
        questionClassifier.addDocument(data.question[i].q, data.question[i].a);
    }
    questionClassifier.train();

    const conditionalDataLength = data.conditional.length;
    for (let i = 0; i < conditionalDataLength; i++) {
        conditionalClassifier.addDocument(data.conditional[i].q, data.conditional[i].a);
    }
    conditionalClassifier.train();


    const targetDataLength = data.eventCondition.length;
    for (let i = 0; i < targetDataLength; i++) {
        eventConditionClassifier.addDocument(data.eventCondition[i].q, data.eventCondition[i].a);
    }
    eventConditionClassifier.train();


    const colorDataLength = data.color.length;
    for (let i = 0; i < colorDataLength; i++) {
        colorClassifier.addDocument(data.color[i].q, data.color[i].a);
    }
    colorClassifier.train();
}


let classifyText = function (req, res) {
    var statement = req.body.what;
    var isWebApp = req.body.webApp;

    doAction(statement, false, null, function (outTxt, hasPayload) {
        if(!hasPayload) res.send(outTxt);
        else{
            res.status(222).sendFile(outTxt[0].absPath + outTxt[0].name);
        }
    });

    // isConditional(statement, function (text) {
    //     if (statement === false) {
    //         res.send('condition false');
    //         return;
    //     }
       
    // });
}

var doAction = function (text, isCheckCommand, sender_psid, cb) {
    let classification = {};
    if(text == undefined || !text) return cb("");
    classification.text = text
    classification.isCheckCommand = isCheckCommand;
    classification.tokenText = tokenizer.tokenize(classification.text);
    classification.taggedTokens = tagger.tag(classification.tokenText);
    classification.grammerObj = getGrammers(classification.taggedTokens);

    //here it will check what kind of command it is
    // categorizeCommandType(classification, function (commandType) {
    //     var evClassifier = isCheckCommand ? eventConditionClassifier : eventClassifier;

    //     classification.event = evClassifier.classify(classification.text);
    //     getClassificationOnevent(classification, function (classifiedTxt) {
    //         cb(classifiedTxt);
    //     });
    // });

    var evClassifier = isCheckCommand ? eventConditionClassifier : eventClassifier;
    
    classification.event = evClassifier.classify(classification.text);

    switch(classification.event){
        case 'intro':
            var icebreakers = config.get("intro");
            let str = icebreakers[_.random(icebreakers.length - 1)] + " " +  getEmotion() + " " +  getEmotion();
            return cb(str);
        case 'question':
            //it's a number status question check device
            var device = questionClassifier.classify(classification.text);
            cb(services.listDevices(device));
            break;
        case 'status':
            // it's the status
            var device = whichLight(classification.text);
            if(device){
                var deviceData = require('../api/device-data.json');
                deviceData.lastCommand.isDevice = true;
                deviceData.lastCommand.device.id = device.id;
                moleculeAPI.updateDataToFile(deviceData);
                var icebreakers = config.get("buildUp");
                let str = icebreakers[_.random(icebreakers.length - 1)] + " " +  getEmotion() + " , " + device.name + " is " + device.switch;
               return cb(str);
            }else{
                return cb("I don't know what to do, please be specific.");
            }
            break;
        case 'camera':
            imageProcessing.detectCameraFaces(function(imgDataArr){
                imgDataArr = imgDataArr.split("'").join('"');
                try{
                    imgDataArr = JSON.parse(imgDataArr)
                    imgDataArr.splice(0,1);
                }catch(ex){
                    if(imgDataArr.indexOf('OpenCL runtime') < 0)
                        return cb('1: Something went Wrong! cant fetch your Camera');
                    return;
                }
                if(Array.isArray(imgDataArr)){
                    var defaultPsid = sender_psid;
                    if (sender_psid) cb('Sending You your Camera Data Shortly');
                    for(let i = 0 ; i < imgDataArr.length ; i++ ){
                        if(sender_psid == null){ sender_psid = '611839142273622'; //default one

                        }
                        //Call send attachment API and send images to user psid
                        utils.sendImage(sender_psid, imgDataArr[i]);
                    }
                    if(!defaultPsid){
                        cb(makeFaceDetectSpeech(imgDataArr));
                    }
                }else return cb('2: Something went Wrong! cant fetch your Camera');
            });
            break;
        
        case 'track-begin':
            let noun = classification.grammerObj.N;
            let name = 'ankit'//default
            if(noun && noun.length > 0){
                name = noun[0]
            }
            imageProcessing.trackThisPerson(name, 20, function(videoData){
                
                let startPos = videoData.indexOf('{');
                let endPos = videoData.indexOf('}');
                videoData = videoData.slice(startPos, endPos+1);
                videoData = videoData.split("'").join('"');
                try{
                    videoData = JSON.parse(videoData)
                }catch(ex){
                    if(videoData.indexOf('OpenCL runtime') < 0)
                        return cb('1: Something went Wrong! cant fetch your Camera');
                    return;
                }
                let videoName = videoData.name;
                let userFound = videoData.userFound;
                userFound = (userFound == 'True' || userFound == 'true' || userFound == true) ? true : false;
                console.log(videoName);
                utils.sendVideo('611839142273622', videoName, userFound);
            });
            cb(`Starting to Track ${name} will send you the video shortly`);
            break;
        case 'scanPeople':
            imageProcessing.scanPeople(function(imgDataArr){
                imgDataArr = imgDataArr.split("'").join('"');
                try{
                    imgDataArr = JSON.parse(imgDataArr)
                    imgDataArr.splice(0,1);
                }catch(ex){
                    if(imgDataArr.indexOf('OpenCL runtime') < 0)
                        return cb('1: Something went Wrong! cant fetch your Camera');
                    return;
                }
                var uniquePeople = [];
                if(Array.isArray(imgDataArr)){
                    var defaultPsid = sender_psid;
                    if (sender_psid) cb('Starting Scan, will send the results shortly');
                    for(let i = 0 ; i < imgDataArr.length ; i++ ){
                        if(imgDataArr[i].who != "Unknown");
                        if(uniquePeople.indexOf(imgDataArr[i].who) > -1){ continue } else { uniquePeople.push(imgDataArr[i].who)}
                        if(sender_psid == null){ sender_psid = '611839142273622'; //default one

                        }
                        //Call send attachment API and send images to user psid
                        utils.sendImage(sender_psid, imgDataArr[i]);
                    }
                    if(!defaultPsid){
                        cb(makeFaceDetectSpeech(imgDataArr));
                    }
                }else return cb('2: Something went Wrong! cant fetch your Camera');
            })
            break;
        case 'detect':
            imageProcessing.startDetect(function(imgDataArr){
                imgDataArr = imgDataArr.split("'").join('"');
                try{
                    imgDataArr = JSON.parse(imgDataArr)
                    imgDataArr.splice(0,1);
                }catch(ex){
                    if(imgDataArr.indexOf('OpenCL runtime') < 0)
                        return cb('1: Something went Wrong! cant fetch your Camera');
                    return;
                }
                var uniquePeople = [];
                if(Array.isArray(imgDataArr)){
                    var defaultPsid = sender_psid;
                    if (sender_psid) cb('Starting Scan, will send the results shortly');
                    for(let i = 0 ; i < imgDataArr.length ; i++ ){
                        if(imgDataArr[i].who != "Unknown");
                        if(uniquePeople.indexOf(imgDataArr[i].who) > -1){ continue } else { uniquePeople.push(imgDataArr[i].who)}
                        if(sender_psid == null){ sender_psid = '611839142273622'; //default one

                        }
                        //Call send attachment API and send images to user psid
                        utils.sendImage(sender_psid, imgDataArr[i]);
                    }
                    if(!defaultPsid){
                        cb("Sending you data for people with suspicious activities");
                    }
                }else return cb('2: Something went Wrong! cant fetch your Camera');
            },
            function(videoData){
                
                let startPos = videoData.indexOf('{');
                let endPos = videoData.indexOf('}');
                videoData = videoData.slice(startPos, endPos+1);
                videoData = videoData.split("'").join('"');
                try{
                    videoData = JSON.parse(videoData)
                }catch(ex){
                    if(videoData.indexOf('OpenCL runtime') < 0)
                        return cb('1: Something went Wrong! cant fetch your Camera');
                    return;
                }
                let videoName = videoData.name;
                let userFound = videoData.userFound;
                userFound = (userFound == 'True' || userFound == 'true' || userFound == true) ? true : false;
                console.log(videoName);
                utils.sendVideo('611839142273622', videoName, userFound);
            })
        default: 
            getClassificationOnevent(classification, function (classifiedTxt) {
               return cb(classifiedTxt);
            });
            break;
    }


}

var deviceStatusQuestion = function(text){
    var isQue = questionClassifier.classify(text);
    return isQue;
}


//will callback commandType {VBG: Boolean, IE: Boolean, normal: Boolean, statement: String, cond: String}
var categorizeCommandType = function (text, cb) {
    var cbObj = {};
    var VBG = text.grammerObj.VBG;
    if (VBG.length > 0) {
        //check VBG here and look for incoming and outgoing events
    } else {
        //perform Manual Check on IF-ELSE conditions
        var conditionalKeywords = config.get("keywords.conditional.cond").concat(config.get("keywords.conditional.statement"));
        var isCoditional = false;
        for (let i = 0; i < conditionalKeywords.length; i++) {
            if (text.text.indexOf(conditionalKeywords[i]) > -1) {
                isConditional = true;
                var condStateObj = extractCondState(text.text);
                cbObj.IE = true;
                if (condStateObj.condition) cbObj.cond = condStateObj.condition;
                if (condStateObj.statement) cbObj.statement = condStateObj.statement;
            }
        }
    }

}


// expects text, returns {condition: "string" || false, statement: "string" || false};
var extractCondState = function (text) {
    var statement = { condition: false, statement: false };
    //find cond pos
    var cond = config.get("keywords.conditional.cond"), condPos = -1, condWord = '';
    for (let i = 0; i < cond.length; i++) {
        condPos = text.indexOf(cond[i]);
        if (condPos > -1) {
            condWord = cond[i];
            break;
        }
    }

    //find statement pos
    var statement = config.get("keywords.conditional.statement"), statePos = -1, stateWord = '';
    for (let i = 0; i < statement.length; i++) {
        statePos = text.indexOf(cond[i]);
        if (statePos > -1) {
            stateWord = statement[i];
            break;
        }
    }

    //if - then type statement
    if ((condPos > -1) && (condPos < statePos)) {
        //first cond then state
        statement.condition = text.substring(0, statePos);
        statement.statement = text.substring(statePos, text.length);
        return statement;
    }

    //statement if condition
    if ((statePos < 0 && condPos > 1) || (statePos < condPos)) {
        //first state then cond
        statement.statement = text.substring(0, statePos);
        statement.condition = text.substring(condPos, text.length);
        return statement;
    }
    return statement;

    //do if type
    // if(statePos < condPos){
    // }
}

let getGrammers = (tokenArr) => {
    let grammerObj = {};//{ "NN": [], "VB": [], "IN": [] }
    let arrLen = tokenArr.length;
    while (--arrLen > -1) {
        if (grammerObj[tokenArr[arrLen][1]] == undefined) {
            grammerObj[tokenArr[arrLen][1]] = [];
        }
        grammerObj[tokenArr[arrLen][1]].push(tokenArr[arrLen][0]);
    }
    return grammerObj;
}

var getClassificationOnevent = function (classification, cb) {
    const light = whichLight(classification.text, true);
    if (!light) {
        return "Oops!! no such light bulb found";
    }
    var colorObj = colorChangeCommand(classification.grammerObj);
    
    var lightApiCB = function (resp) {
        if (!classification.isCheckCommand) {
            return cb(returnStatement);
        }
        return cb(resp);
    }

    var returnStatement = ""

    if (colorObj) {
        lightApi.changeColor(light, colorObj.code, classification, lightApiCB);
        updateLightSwitch(light, 'ON');
        
        var icebreakers = config.get("success");
        let str = icebreakers[_.random(icebreakers.length - 1)] + " " +  getEmotion();
        cb(str + ", changing your " + light.name + " color to " + colorObj.color);
        var returnStatement = " changing your " + light.name + " color to " + colorObj.color;
    }else

    switch (classification.event) {
        case 'dim': {
            //let light = whichLight(classification.text);
            returnStatement = " dimming your " + light.name;
            lightApi.dim(light, classification, lightApiCB);
        } break;
        case 'high': {
            //let light = whichLight(classification.text);
            returnStatement = " increasing your " + light.name;
            lightApi.high(light, classification, lightApiCB);
        } break;
        case 'on': {
            //let light = whichLight(classification.text);
            if(light.switch == "ON"){
                var icebreakers = config.get("noWork");
                let str = icebreakers[_.random(icebreakers.length - 1)] + " ,it is already ON " + getEmotion();
                return cb(str);
            }
            var icebreakers = config.get("success");
            let str = icebreakers[_.random(icebreakers.length - 1)] + " " + getEmotion();
            returnStatement = str + ", turning on your " + light.name;
            lightApi.turnOn(light, classification, lightApiCB);
            updateLightSwitch(light, "ON");
        } break;
        case 'off': {
            //let light = whichLight(classification.text);
            if(light.switch == "OFF"){
                var icebreakers = config.get("noWork");
                let str = icebreakers[_.random(icebreakers.length - 1)] + " ,it is already OFF " + getEmotion();
                return cb(str);
            }
            
            var icebreakers = config.get("success");
            let str = icebreakers[_.random(icebreakers.length - 1)] + " " +  getEmotion();
            returnStatement = str + ", turning off your " + light.name;
            lightApi.turnOff(light, classification, lightApiCB);
            updateLightSwitch(light, "OFF");
        } break;
        default: {
            returnStatement = ("I couldn't understand what do you mean by " + classification.text);
        }
    }
};


var colorChangeCommand = function (grammerObj) {
    var colorObj = false;
    if (grammerObj.JJ == undefined) {
        return false;
    }
    var jjLen = grammerObj.JJ.length;
    for (let i = 0; i < jjLen; i++) {
        for (let j = 0; j < colorArr.length; j++) {
            if (grammerObj.JJ[i] == colorArr[j].color) {
                colorObj = colorArr[j];
                return colorObj;
            }
        }
    }
    return colorObj;
}

var whichLight = function (text, lookDB) {
    //get Lights from user accounts.
    var devices = require('../api/device-data.json');
    var lightNames = devices.lights;
    let max = 0;
    let who = null;
    for (let i = 0; i < lightNames.length; i++) {
        let distance = natural.DiceCoefficient(text, lightNames[i].name);
        if (distance > max && distance > 0.3) {
            max = distance;
            who = i;
        }
    }
    if( who == null && lookDB && devices.lastCommand.isDevice){
        for (let i = 0; i < lightNames.length; i++) {
            if (devices.lastCommand.device.id == lightNames[i].id) {
                return lightNames[i];
            }
        }
    }
    if(who != null)//update the device user is talking about
    {
        devices.lastCommand.isDevice = true;
        devices.lastCommand.device.id = lightNames[who].id;
        moleculeAPI.updateDataToFile(devices);
    }
    return who != null ? lightNames[who]: false;

}

var updateLightSwitch = function(light, state){
    var devices = require('../api/device-data.json');
    var lightNames = devices.lights;

    for (let i = 0; i < lightNames.length; i++) {
        if (light.id == lightNames[i].id) {
            light.switch = state;
            return;
        }
    }
}

var isRule = function (text) {
    return false;
}

var isConditional = function (text, cb) {
    var conditionalRule = conditionalClassifier.classify(text);
    conditionalRule = conditionalRule.split(',');

    var splitStatement = text.split(conditionalRule[3]);
    if (splitStatement.length == 1) {
        cb(text);
    }
    var conditionalStatement = splitStatement[0];
    var actionStatement = splitStatement[1];

    //check category/type of statement. if type-2: flip them
    if (conditionalRule[1] == '2') {
        let temp = conditionalStatement;
        conditionalStatement = actionStatement;
        actionStatement = temp;
    }

    //check if condition or rule
    if (conditionalRule[0] == 'c') {
        checkCondition(conditionalStatement, function () {
            cb(actionStatement);
        });
    }
}

var checkCondition = function (text, cb) {
    doAction(text, true, null, function (isConditionTrue) {
        if (isConditionTrue) {
            return cb(isConditionTrue);
        }
        return cb(false);
    });
}

var getEmotion = function(){
    var emotion = config.get("emotions");
    return emotion[_.random(emotion.length - 1)];
}

var makeFaceDetectSpeech = function(imgDataArr){
    var d = { 
        'name': '472.jpg',
        'conf': 93.15745552347704,
        'who': 'Ankit'
    }
    var retStr = "";
    var unknown = 0;
    var known = [];
    for( var i = 0;i<imgDataArr.length;i++){
        var n = imgDataArr[i].who;
        if(imgDataArr.length == 1){
            if((n.toLowerCase().indexOf('unkno') > -1)){
                return 'Someone unknown, who I cannot identify is at your door.'
            }
            return( n + ' is at your door');
        }
        if(n.toLowerCase().indexOf('unkno') > -1){
            unknown++;
        }
        else {
            if(unknown > 0 || i < (imgDataArr.length -1) ){
                retStr += n + ' , ';
            }
            else{
                retStr += ' and ' + n;
            }
        }
        if(unknown > 0){
            retStr += ' and ' + unknown + 'people';
        }
        retStr += ' are at your door.';
        return retStr;
    }
}

trainData();

module.exports = {
    classifyText,
    doAction
}