const request = require('request');
const botMethods = require('./botMethods');

module.exports = {
  cancel: async function(app, req, arg){
    const db = app.get('db');
    try{
      await new Promise((resolve, reject)=>{
        request('https://api.taxi.namba1.co/order/status/' + arg.order_id, (error, res, body)=>{
          console.log(body)
          if(error){
            console.log('testerror')
            return botMethods.sendMessage(req.chatId, 'Ошибка, попробуйте по позже').then(reject)
          }
          const dataBody = JSON.parse(body);
          if(!dataBody.success){
            console.log('test11')
            return botMethods.editMessage(req.chatId, req.messageId,  'Ваш заказ был отменён.').then(reject);
          }
          const newStatus = dataBody.data.status;
          if(newStatus === 'Received' || newStatus === 'The taxi arrived', newStatus === 'Completed'){
            console.log('testovyi')
            return botMethods.editMessage(req.chatId, req.messageId, 'Вы не можете отменить этот заказ').then(reject)
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
          resolve(botMethods.editMessage(req.user.nambaOneChatId, req.messageId, 'Ошибка попробуйте позже'))
        }else{
          resolve(body)
        }
      })
    });
    await botMethods.setStatus(db, req.user.get('nambaoneBotId'), 'wait_geo', {user_id: req.user.get('id')})
    await req.user.update({last_order_id: 0});
    const userStatus = JSON.parse(req.user.get('last_address'));
    let keyboard = false;
    if(userStatus.length > 0){
      keyboard = userStatus.map((object, iter)=>{
        return [{title: object, action: object}]
      })
    }
    console.log(req.messageId, req.chatId);
    console.log(await botMethods.editMessage(req.chatId, req.messageId, 'Ваш заказ был отменён. \n Чтобы заказать такси вы можете: \n 1. Набрать адрес вручную в поле ввода.\n 2. Отправить метку на карте. \n 3. Выбрать в меню из предыдущих заказов.', keyboard ? {keyboard: keyboard}: {}))
    return;
  },
  resume: async function(app, req, arg){
    req.content = arg.order;
    req.body.result.message = {type: 'text'};
    await botMethods.editMessage(req.chatId, req.messageId, 'Секунду...');
    return await require('./methods').wait_geo(app, req, {});
  }
};