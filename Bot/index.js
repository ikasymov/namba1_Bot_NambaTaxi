const methods = require('./methods');
const botMethods = require('./botMethods');
const callbacks = require('./calbackFunctions');
const request = require('request');

module.exports = {
  run: async function(app, req){
    const db = app.get('db');
    
    if(req.body.result.action){
      // const chatIdList = req.body.result.action.chatId.split('');
      // chatIdList.pop();
      // req.chatId = chatIdList.join('');
      req.chatId = req.body.result.action.chatId;
      req.messageId = req.body.result.action.messageId
      req.user = await db.User.findOne({
        where:{
          nambaoneBotId: req.body.result.action.sender.id
        }
      });
      const callbackData = JSON.parse(req.body.result.action.content);
      return await callbacks[callbackData.func](app, req, callbackData.arg)
    }
    const chatId = req.body.result.message.chat.id;
    req.chatId = chatId;
    const user = await checkUser(req, app);
    if(user){
      req.user = user;
      req.content = req.body.result.message.content;
      if(req.content === '/help'){
        return botMethods.sendMessage(req.chatId, '/main Выйти в главное меню')
      }
      if(req.content === '/main'){
        await botMethods.setStatus(db, req.user.get('nambaoneBotId'), 'sendMenu', {button_id: 1});
        return await methods.sendMenu(app, req, {button_id: 1})
      }
      if(user.get('nambaoneStatus')){
        const status = JSON.parse(user.get('nambaoneStatus'));
        return methods[status.func](app, req, status.arg);
      }
    }
  },
};

async function getUser(req, app){
  let db = app.get('db');
  let bot_id = req.body.result.message.from.id;
  try{
    const user = await db.User.findOne({
      where: {
        nambaoneBotId: bot_id
      },
    });
    if(!user){
      await botMethods.sendMessage(req.body.result.message.chat.id, 'Здравствуйте! Вас приветствует сервис Namba Taxi');
      let data = {
        url: 'https://us-central1-nambaoneprod.cloudfunctions.net/getContact?userId=' + req.body.result.message.from.id,
        method: 'GET',
        headers: {
          'Bot-Auth-Token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJib3RJZCI6Ii1MNnY2ek9zdVpHUDM1SDVtMnRHIiwiaWF0IjoxNTIwMzM2NjgwfQ.vzasvqPtfGnsvLGIXeIUz5WT4afN9sBkojFHKaoRLW4'
        }
      };
      const userData = await new Promise((resolve, reject)=>{
        request(data, (err, res, body)=>{
          if(err){
            reject(err)
          }
          resolve(JSON.parse(body))
        });
      });
      const newUser = await db.User.create({name: userData.data.name, nambaoneBotId: req.body.result.message.from.id, nambaOneChatId: req.body.result.message.chat.id, phone: userData.data.phone})
      await botMethods.sendMessage(req.chatId, 'Номер ' + newUser.get('phone') + ' выбран.  Для создания нового заказа приложите вашу геолокацию или наберите адрес вручную в поле ввода текста');
      await botMethods.setStatus(db, newUser.get('nambaoneBotId'), 'wait_geo', {user_id: newUser.get('id')});
      return newUser
    }
    return user
  }catch(e){
    throw e
  }
}

async function checkUser(req, app){
  const db = app.get('db');
  return await getUser(req, app);
}





