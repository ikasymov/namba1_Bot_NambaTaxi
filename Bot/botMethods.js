const request = require('request');


module.exports = {
  dropStatus: async function(db, bot_id){
    const user = await db.User.findOne({where:{
      nambaoneBotId: bot_id
    }});
    return user.update({status: null})
  },
  setStatus: async function(db, bot_id, statusName, args){
    const status = JSON.stringify({func: statusName, arg: args});
    const user = await db.User.findOne({where:{
      nambaoneBotId: bot_id
    }});
    return user.update({nambaoneStatus: status})
  },
  sendMessage: async function sendMessage(chatId, content, payload={}){
    const data = {
      url: 'https://us-central1-nambaoneprod.cloudfunctions.net/sendMessage',
      method: 'GET',
      qs: {
        contentType: 'text',
        content: content,
        chatId: chatId,
      },
      headers: {
        'Bot-Auth-Token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJib3RJZCI6Ii1MNnY2ek9zdVpHUDM1SDVtMnRHIiwiaWF0IjoxNTIwMzM2NjgwfQ.vzasvqPtfGnsvLGIXeIUz5WT4afN9sBkojFHKaoRLW4'
      }
    };
    if(payload.buttons){
      data.qs.buttons = payload.buttons;
    }
    if(payload.keyboard){
      data.qs.keyboard = payload.keyboard;
    }
    return new Promise((resolve, reject)=>{
      request(data, function (error, response, body) {
        resolve(body)
      });
    });
  }
}