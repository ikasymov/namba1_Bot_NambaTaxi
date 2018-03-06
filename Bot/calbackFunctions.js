const request = require('request');
const botMethods = require('./botMethods');

module.exports = {
  cancel: async function(app, req, arg){
    const db = app.get('db');
    if(req.user.last_order_id !== arg.order_id){
      return botMethods.sendMessage(req.chatId, 'Ваш текущий заказ другой')
    }
    try{
      await new Promise((resolve, reject)=>{
        request('https://api.taxi.namba1.co/order/status/' + arg.order_id, (error, res, body)=>{
          if(error){
            return reject(botMethods.sendMessage(req.chatId, 'Ошибка, попробуйте по позже'))
          }
          const dataBody = JSON.parse(body);
          if(!dataBody.success){
            reject(botMethods.sendMessage(req.chatId, 'Ваш заказ был отменен'));
          }
          const newStatus = dataBody.data.status;
          if(newStatus === 'Received' || newStatus === 'The taxi arrived', newStatus === 'Completed'){
            return reject(botMethods.sendMessage(req.chatId, 'Вы не можете отменить этот заказ'))
          }
          resolve()
        })
      });
    }catch(e){
      console.log("not remove")
      return;
    }
    let data = {
      url: 'https://api.taxi.namba1.co/order/cancel/' + arg.order_id,
      method: 'GET'
    };
    await new Promise((resolve, reject)=>{
      request(data, (error, res, body)=>{
        if(error){
          resolve(botMethods.sendMessage(req.user.nambaOneChatId, 'Ошибка попробуйте позже'))
        }else{
          resolve(body)
        }
      })
    });
    await botMethods.setStatus(db, req.user.get('nambaoneBotId'), 'wait_geo', {user_id: req.user.get('id')})
    await botMethods.sendMessage(req.chatId, 'Ваш заказ был отменен');
    await req.user.update({last_order_id: 0});
    const userStatus = JSON.parse(req.user.get('last_address'));
    let keyboard = false;
    if(userStatus.length > 0){
      keyboard = userStatus.map((object, iter)=>{
        return [{title: object, action: object}]
      })
    }
    return await botMethods.sendMessage(req.chatId, 'Для создания нового заказа приложите вашу геолокацию или наберите адрес вручную в поле ввода текста либо выберите из уже ранее выбранный мест', keyboard ? {keyboard: keyboard}: {})
  },
  resume: async function(app, req, arg){
    if(req.user.get('last_order_id') !== arg.order_id){
      return botMethods.sendMessage(req.chatId, 'Ваш текущий заказ другой')
    }
    const userAddress = JSON.parse(req.user.get('last_address'));
    req.content = userAddress.slice(-1)[0];
    req.body.result.message = {type: 'text'}
    return await require('./methods').wait_geo(app, req, {});
  }
};