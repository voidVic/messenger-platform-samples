module.exports = {
    ml: require('./machine-learning/classify-input'),
    predict: require('./prediction-engine/calculation-model'),
    createData: require('./prediction-engine/make-random-event-data'),
    getDevices: function(req, res){
        var data = require('./api/device-data.json');
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    }
}