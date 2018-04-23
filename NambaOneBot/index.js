const {Action} = require('./Action')();
const {Message} = require('./Message')();
module.exports = {
  run: async function (app, req) {
    const config = app.get('config');
    if(req.body.result.action){
      const action = new Action(app, req, config);
      await action.init();
      return action.callCallback();
    }else if(req.body.result.message){
      const message = new Message(app, req, config);
      await message.init();
      if(message.Method[message.user.status.func]){
        return message.Method[message.user.status.func]()
      }else{
        await message.sendMessage('Номер ' + message.user.phone + ' выбран.  Для создания нового заказа приложите вашу геолокацию или наберите адрес вручную в поле ввода текста');
        return message.setStatus('wait_geo', {user_id: message.user.id});
      }
    }else{
      console.log('not found');
      return;
    }
  },
  get_message: async function(app, req){
    const config = app.get('config');
    return new Message(app, req, config)
  }
  
};




