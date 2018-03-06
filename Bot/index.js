const methods = require('./methods');
const botMethods = require('./BotMethods');
const callbacks = require('./calbackFunctions');

module.exports = {
  run: async function(app, req){
    const db = app.get('db');
    
    if(req.body.result.action){
      // const chatIdList = req.body.result.action.chatId.split('');
      // chatIdList.pop();
      // req.chatId = chatIdList.join('');
      req.chatId = req.body.result.action.chatId;
      req.user = await db.User.findOne({
        where:{
          nambaoneBotId: req.body.result.action.sender.id
        }
      });
      const callbackData = JSON.parse(req.body.result.action.content);
      return await callbacks[callbackData.func](app, req, callbackData.arg)
    }
    const user = await checkUser(req, app);
    const chatId = req.body.result.message.chat.id;
    // return console.log(await botMethods.sendMessage(chatId, 'Hello', {buttons: [[{title: 'Hello', action: 'Test'}]]}))
    if(user){
      req.user = user;
      req.chatId = chatId;
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
      await botMethods.sendMessage(req.body.result.message.chat.id, 'Здравствуйте, это сервис Намба такси, где вы сможете заказать такси в несколько нажатий, для начала введите ваш номер телефона на который вы хотите заказать');
      const newUser = await db.User.create({name: req.body.result.message.from.name, nambaoneBotId: req.body.result.message.from.id, nambaOneChatId: req.body.result.message.chat.id})
        await botMethods.setStatus(db, newUser.get('nambaoneBotId'), 'registration', {user_id: newUser.get('id')});
      return user
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





