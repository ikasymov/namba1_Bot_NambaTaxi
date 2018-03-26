const botMethods = require('./botMethods');
const request = require('request');
const methods = require('./calbackFunctions');
var schedule = require('node-schedule');
var util = require('util');
module.exports = {
  registration: async function(app, req, arg){
    const db = app.get("db");
    const user = await db.User.findOne({
      where:{
        id: arg.user_id
      }
    });
    const content = parseInt(req.body.result.message.content);
    if(!isNaN(content)){
      await user.update({phone: content});
      await botMethods.sendMessage(req.chatId, 'Номер ' + user.get('phone') + ' выбран.  Для создания нового заказа приложите вашу геолокацию или наберите адрес вручную в поле ввода текста');
      return await botMethods.setStatus(db, user.get('nambaoneBotId'), 'wait_geo', {user_id: user.get('id')});
    }
    return botMethods.sendMessage(req.chatId, 'Не правильно веден номер телефона')
  },
  order_access: async function(app, req, arg){
    if(req.content === '/cancel'){
      return await methods.cancel(app, req, {order_id: arg.order_id})
    }
    if(req.content === '/resume'){
      const userStatus = JSON.parse(req.user.get('last_address'));
      req.content = userStatus.slice(-1)[0];
      return await this.wait_geo(app, req, {});
    }
    const sendData = {
      url: 'https://api.taxi.namba1.co/order/status/' + arg.order_id,
      method: 'GET',
    };
    const db = app.get('db');
    return new Promise((resolve, reject)=>{
      request(sendData, (error, res, body)=>{
        if(error){
          resolve(botMethods.sendMessage(req.chatId, 'Ошибка, попробуйте позже'))
        }
        const dataBody = JSON.parse(body);
        if(!dataBody.success){
          botMethods.setStatus(db, req.user.get('nambaoneBotId'), 'wait_geo', {user_id: req.user.get('id')}).then(()=>{
            botMethods.sendMessage(req.chatId, 'Ваш заказ был отменен').then(()=>{
              resolve(botMethods.sendMessage(req.chatId, 'Для создания нового заказа приложите вашу геолокацию или наберите адрес вручную в поле ввода текста'))
            })
          });
        }else{
          const newStatus = dataBody.data.status;
          const lastAddress = JSON.parse(req.user.get('last_address'))
          if(newStatus === 'New order'){
            resolve(botMethods.sendMessage(req.chatId, 'Ваш заказ по адресу ' +  lastAddress.slice(-1)[0] + ' был принят'))
          }
          if(newStatus === 'Received'){
            var message = util.format('Такси выехало, %s, гос.номер %s, номер водителя %s, Имя водителя %s', dataBody.data.driver.make,
             dataBody.data.driver.license_plate, dataBody.data.driver.phone_number, dataBody.data.driver.name);
            resolve(botMethods.sendMessage(req.chatId, message))
          }
          if(newStatus === 'The taxi arrived'){
            resolve(botMethods.sendMessage(req.chatId, 'Машина подъехала'))
          }
          if(newStatus === 'Completed'){
            resolve(botMethods.sendMessage(req.chatId, 'Ваша поездка составила ' + dataBody.data.trip_cost + ' сома'))
          }
          if(newStatus === 'Rejected'){
            resolve(methods.cancel(app, req, {order_id: arg.order_id}))
          }
        }
      })
    });
  },
  wait_geo: async function(app,req, arg){
    const db = app.get('db');
    if(req.body.result.message.type === 'location'){
      const geo = await getGeo(req.body.result.message.latitude, req.body.result.message.longitude)
      if(geo){
        req.content = geo;
      }
    }
    const body = await new Promise((resolve, reject)=>{
      let data = {
        url: 'https://api.taxi.namba1.co/order/request',
        method: 'POST',
        body: {
          phone: req.user.get('phone'),
          address: req.content,
          fare: 1
        },
        json: true
      };
      request(data, (error, response, body)=>{
        if(error){
          resolve(botMethods.sendMessage(req.chatId, 'Ошибка, попробуйте позже'))
        }
        resolve(body)
      });
    });
    const orderId = body.data.order_id;
    await botMethods.setStatus(db, req.user.get('nambaoneBotId'), 'order_access', {user_id: req.user.get('id'), order_id: orderId});
    let status = 0;
    const chatId = req.chatId;
    var j = schedule.scheduleJob('*/1 * * * *', async function(){
      let user = await db.User.findOne({where:{
        id: req.user.get('id')
      }});
      const sendData = {
        url: 'https://api.taxi.namba1.co/order/status/' + orderId,
        method: 'GET',
      };
      request(sendData, async (error, res, body)=>{
        if(error){
          console.log(error);
          await botMethods.sendMessage(chatId, 'Ошибка вышла попробуйте позже');
          j.cancel();
          return
        }
        const dataBody = JSON.parse(body);
        if(!dataBody.success){
          await botMethods.sendMessage(chatId, 'Ваш заказ был отменен');
          j.cancel()
        }
        const newStatus = dataBody.data.status;
        if(status !== newStatus){
          const userStatus = JSON.parse(user.get('nambaoneStatus'));
          if(userStatus.func === 'wait_geo'){
            j.cancel();
            return;
          }
          if(newStatus === 'New order'){
            await botMethods.sendMessage(req.chatId, 'Все еще ищем машину')
          }
          if(newStatus === 'Received'){
            var message = util.format('Такси выехало, %s, гос.номер %s, номер водителя %s, Имя водителя %s', dataBody.data.driver.make,
             dataBody.data.driver.license_plate, dataBody.data.driver.phone_number, dataBody.data.driver.name);
            await botMethods.sendMessage(chatId, message)
          }
          if(newStatus === 'The taxi arrived'){
            await botMethods.sendMessage(chatId, 'Машина подъехала');
          }
          if(newStatus === 'Completed'){
            const userStatus = JSON.parse(req.user.get('last_address'));
  
            if(userStatus.length > 4){
              userStatus.shift()
            }
            if(!userStatus.includes(req.content)){
              userStatus.push(req.content)
            }
            await req.user.update({last_address: JSON.stringify(userStatus), last_order_id: orderId});
            await botMethods.sendMessage(chatId, 'Ваша поездка составила ' + dataBody.data.trip_cost + ' сома');
            await botMethods.setStatus(db, req.user.get('nambaoneBotId'), 'wait_geo', {user_id: req.user.get('id')});
            await botMethods.sendMessage(req.chatId, 'Для создания нового заказа приложите вашу геолокацию или наберите адрес вручную в поле ввода текста либо выберите из уже ранее выбранный мест')
            j.cancel();
          }
          if(newStatus === 'Rejected'){
            if(user.get('last_order_id') === orderId){
              await botMethods.sendMessage(chatId, 'К сожалению, по близости маши нет, хотите ли вы продолжить поиск? (команды «Отменить» для отмены, «Продолжить» для продолжение поиска)', {buttons: [[{title: 'Отменить', action: JSON.stringify({func: 'cancel', arg:{order_id: orderId}})}, {title: 'Продолжить', action: JSON.stringify({func: 'resume', arg: {order_id: orderId}})}]]});
            }
            j.cancel();
          }
        }
        status = newStatus
      });
    });
    return await botMethods.sendMessage(req.chatId, 'Идет поиск такси, пожалуйста подождите…', {buttons: [[{title: 'Отменить', action: JSON.stringify({func: 'cancel', arg:{order_id: orderId}})}]]});
  }
};


async function getGeo(latitude, longitude){
  return new Promise((resolve, reject)=>{
    let data = {
      url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + latitude + ',' + longitude + '&key=AIzaSyDbcJBaK7ke05PH8jujhk1FmbpvoSH93hY&language=ru',
      method: 'GET'
    }
    console.log(data)
    request(data, function (error, response, body) {
      console.log(error)
      if (!error && response.statusCode == 200) {
        body = JSON.parse(body);
        let new_address = body.results[0].formatted_address;
        resolve(new_address.substring(0, new_address.indexOf("Бишкек") -2))
      }
      else {
        return resolve(false)
      }
    });
  });
}