const request = require('request');

function callNLPEngine(data, cb){

    var options = {
        url: "http://localhost:7898/classify/text",
        method: "POST",
        json: true,
        body: { "what": data }
    }

    request(options, function(err, resp){
        if(!err){
            return cb(resp.body);
        }
        else{
            return cb({err: true});
        }
    });
}

module.exports = {
callNLPEngine
}