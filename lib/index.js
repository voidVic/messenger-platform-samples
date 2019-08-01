module.exports = {
    controller: {
        postWebhook: require('./controller/post-webhook').webhook,
        getWebhook: require('./controller/get-webhook').webhook,
    },
    services: {
        listdevices: require('./services/buildResponse').listDevices
    },
    nlp: {
        classify: require('./nlp-engine/machine-learning/classify-input')
    }
}