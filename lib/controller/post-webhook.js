'use strict';
const utils = require("../utils");
const sendReq = require("../sender/sendRequest");
const nlpEngine = require("../nlp-engine");
function webhook(req, res){

    // Parse the request body from the POST
    let body = req.body;

    // Check the webhook event is from a Page subscription
    if (body.object === 'page') {

        body.entry.forEach(function (entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);


            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender ID: ' + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                if(webhook_event.message.text){
                    nlpEngine.ml.doAction(webhook_event.message.text, false, sender_psid, function(returnData){
                        if(!returnData.err)
                            utils.handleMessage(sender_psid, returnData);
                        else
                            utils.handleMessage(sender_psid, "error while your operation");
                    });
                }
                else
                var attachments = webhook_event.message.attachments;
                if(attachments && attachments[0].type === "image") {
                    var imageURL = attachments[0].payload.url;
                }             
                
            } else if (webhook_event.postback) {

                handlePostback(sender_psid, webhook_event.postback);
            }

        });
        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');

    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

}

function handlePostback(sender_psid, received_postback) {
    console.log('ok')
     let response;
    // Get the payload for the postback
    let payload = received_postback.payload;
  
    // Set the response based on the postback payload
    if (payload === 'yes') {
      response = { "text": "Thanks!" }
    } else if (payload === 'no') {
      response = { "text": "Oops, try sending another image." }
    }
    // Send the message to acknowledge the postback
    utils.callSendAPI(sender_psid, response);
  }

module.exports = {
    webhook
}