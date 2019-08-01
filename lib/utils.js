const sendResponse = require('./sender/sendResponse');

function handleMessage(sender_psid, received_message) {
  let response;

  // Checks if the message contains text
  if (received_message) {
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    response = {
      "text": received_message
    }
  }
  // else if (received_message.attachments) {
  //   // Get the URL of the message attachment
  //   let attachment_url = received_message.attachments[0].payload.url;
  //   response = {
  //     "attachment": {
  //       "type": "template",
  //       "payload": {
  //         "template_type": "generic",
  //         "elements": [{
  //           "title": "Is this the right picture?",
  //           "subtitle": "Tap a button to answer.",
  //           "image_url": attachment_url,
  //           "buttons": [
  //             {
  //               "type": "postback",
  //               "title": "Yes!",
  //               "payload": "yes",
  //             },
  //             {
  //               "type": "postback",
  //               "title": "No!",
  //               "payload": "no",
  //             }
  //           ],
  //         }]
  //       }
  //     }
  //   }
  // } 
  // Send the response message
  callSendAPI(sender_psid, response);
}

function sendImage(sender_psid, imageData) {
  var attachment_url = '/detectedImages/' + imageData.name;
  var title = imageData.who? imageData.who: 'Some Person';
  var subtitle = imageData.conf>30? 'I think this is '+ imageData.who : 'I\'m not sure who this person is';

  var resp = { "attachment": { "type": "image", "payload": { "is_reusable": true } } }
  image = {
    "img": attachment_url,
    "type": "image/jpg",
    "title": title,
    "subtitle": subtitle
  }
    callSendAPI(sender_psid, resp, image);
    handleMessage(sender_psid, subtitle);
}

function sendVideo(sender_psid, vidName, userPresent) {
  var attachment_url = "/outputVid/"+vidName;
  var title = 'Video Data';
  var subtitle = userPresent? 'ok, I got it, Here is the Video' : 'I cannot find that person, need to buy some glasses :(';

  var resp = { "attachment": { "type": "video", "payload": { "is_reusable": true } } }
  video = {
    "img": attachment_url,
    "type": "video",
    "title": title,
    "subtitle": subtitle
  }
    callSendAPI(sender_psid, resp, video);
    handleMessage(sender_psid, subtitle);
}

function callSendAPI(sender_psid, response, image) {
  // Send the HTTP request to the Messenger Platform
  sendResponse.sendJSON(sender_psid, response, image);
}

module.exports = {
  handleMessage,
  callSendAPI,
  sendImage,
  sendVideo
}