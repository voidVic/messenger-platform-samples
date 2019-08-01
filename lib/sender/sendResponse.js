const request = require('request');
const fs = require('fs');
const config = require('config');
const PAGE_ACCESS_TOKEN = config.get("appKeys.pageAccessToken");

sendJSON = function(sender_psid, response, imageData){

    // Construct the message body
    let request_body = {
        "recipient": {
          "id": sender_psid
        },
        "message": response
      }

      var options = {
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
      }

      
      if(imageData){
        var imageStream = fs.createReadStream(process.env.ROOT_PATH + imageData.img);
        request_body.fileData = imageStream;
        request_body.type = imageData.type;
        request_body.title = imageData.title;
        request_body.subtitle = imageData.subtitle;
        delete options.json;
        request_body.message = JSON.stringify(response);
        request_body.recipient = JSON.stringify(request_body.recipient);
        options.formData = request_body;
      }

    

    // Send the HTTP request to the Messenger Platform
    request(options, (err, res, body) => {
        if (!err) {
          //console.log('message sent!')
        } else {
          console.error("Unable to send message:" + err);
        }
      }); 
}

module.exports = {
    sendJSON
}