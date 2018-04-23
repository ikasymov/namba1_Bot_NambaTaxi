const util = require('util')const fs = require('fs')const request = require('request')const queryString = require('query-string');var { promisify } = require('util');var sizeOf = promisify(require('image-size'));var schedule = require('node-schedule');module.exports = () => {  const Method = function (object) {    this.request = object  };    Method.prototype.orderAccess = async function(){    const self = this;    await self.request.init();    const arg = self.request.user.status.arg;    const status = await self.request.taxiMethods.getStatus(arg.order_id);    if(!status.success){      await self.request.setStatus('wait_geo', {user_id: self.request.user.id});      await self.request.sendMessage('Ваш заказ был отменён.')      return self.request.sendMessage('Чтобы заказать такси вы можете: \n1. Набрать адрес вручную в поле ввода.\n 2. Отправить метку на карте. \n 3. Выбрать в меню из предыдущих заказов.')    }else{      const newStatus = status.data.status;      console.log(newStatus)      if(newStatus === 'New order'){        return self.request.sendMessage('Ваш заказ был принят');      }      if(newStatus === 'Received'){        var message = util.format('Такси выехало, %s, гос.номер %s, номер водителя %s, Имя водителя %s', status.data.driver.make,         status.data.driver.license_plate, status.data.driver.phone_number, status.data.driver.name);        return self.request.sendMessage(message);      }      if(newStatus === 'The taxi arrived'){        return self.request.sendMessage('Машина подъехала');      }      if(newStatus === 'Completed'){        return self.request.sendMessage('Ваша поездка составила ' + status.data.trip_cost + ' сома');      }      if(newStatus === 'Rejected'){        await self.request.setStatus('wait_geo', {user_id: self.request.user.id});        return self.request.sendMessage('Чтобы заказать такси вы можете: \n1. Набрать адрес вручную в поле ввода.\n 2. Отправить метку на карте. \n 3. Выбрать в меню из предыдущих заказов.');      }    }  };    Method.prototype.wait_geo = async function(){    const self = this;      await self.request.init();    const db = self.request.db;    if(self.request.messageType !== 'text' && self.request.messageType !== 'location'){      return self.request.sendMessage('Пожалуйста, повторите запрос в текстовом формате.')    }    if(self.request.messageType === 'location'){      const geo = await self.request.taxiMethods.getGeo(self.request.data.message.latitude, self.request.data.message.longitude);      if(geo){        self.request.content = geo;      }    }    const order = await db.Order.create({address: self.request.content, user_id: self.request.user.id});    return self.request.sendMessage('Оставить комментарий?',  {buttons: [[{title: 'Да', action: JSON.stringify({func: 'addComment', arg: {comment: true, order_id: order.get('id')}})},      {title: 'Нет', action: JSON.stringify({func: 'addComment', arg: {comment: false, order_id: order.get('id')}})}]]});  };    Method.prototype.schedule = async function(order_id, status){    const self = this;    await self.request.init();    const db = self.request.db;    const orderObject = await db.Order.findOne({where:{      id: order_id    }});    var j = schedule.scheduleJob('*/1 * * * *', async function(){      console.log('cron called')      const orderData = await self.request.taxiMethods.getStatus(orderObject.get('order_id'));      if(!orderData.success){        await self.request.sendMessage('Ваш заказ был отменен');        j.cancel()      }      const newStatus = orderData.data.status;      if(status !== newStatus){        const userStatus = self.request.user.status;        if(userStatus.func === 'wait_geo'){          j.cancel();          return;        }        if(newStatus === 'New order'){          await orderObject.update({status: newStatus});          await self.request.sendMessage('Все еще ищем машину')        }        if(newStatus === 'Received'){          await orderObject.update({status: newStatus});          const message = util.format('Такси выехало, %s, гос.номер %s, номер водителя %s, Имя водителя %s', orderData.data.driver.make,           orderData.data.driver.license_plate, orderData.data.driver.phone_number, orderData.data.driver.name);          await self.request.sendMessage(message)        }        if(newStatus === 'The taxi arrived'){          await orderObject.update({status: newStatus});          await self.request.sendMessage('Машина подъехала');        }        if(newStatus === 'Completed'){          await orderObject.update({status: newStatus});          await self.request.sendMessage('Ваша поездка составила ' + orderData.data.trip_cost + ' сома');          await self.request.setStatus('wait_geo', {user_id: self.request.user.id});          const orderAll = await db.Order.findAll({            attributes: [              [db.Sequelize.fn('DISTINCT', db.Sequelize.col('address')) ,'address'],            ]          });          var keyboard = false;          if(orderAll.length > 0){            keyboard = orderAll.map((object)=>{              return [{title: object.get('address'), action: object.get('address')}]            });          }          await self.request.sendMessage('Чтобы заказать такси вы можете:\n 1. Набрать адрес вручную в поле ввода.\n 2. Отправить метку на карте. \n 3. Выбрать в меню из предыдущих заказов.', keyboard ? {keyboard: keyboard}: {});          j.cancel();          return;        }        if(newStatus === 'Rejected'){          let order = await db.Order.findOne({where:{            id: orderObject.get('id')          }});          if(order.get('status') == 'Rejected'){            j.cancel()            return;          }          await self.request.sendMessage('К сожалению, по близости маши нет, хотите ли вы продолжить поиск? (команды «Отменить» для отмены, «Продолжить» для продолжение поиска)', {buttons: [[{title: 'Отменить заказ', action: JSON.stringify({func: 'cancel', arg:{order_id: orderObject.get('id')}})}, {title: 'Продолжить', action: JSON.stringify({func: 'resume', arg: {order_id: orderObject.get('id')}})}]]});          j.cancel();        }      }      status = newStatus;    });    return self.request.sendMessage('Идет поиск такси, пожалуйста подождите…', {buttons: [[{title: 'Отменить заказ', action: JSON.stringify({func: 'cancel', arg:{order_id: orderObject.get('id')}})}]]});  };    Method.prototype.sendComment = async function(){    const self = this;    await self.request.init();    const db = self.request.db;    const arg = self.request.user.status.arg;    if(self.request.messageType !== 'text'){      return self.request.sendMessage('Пожалуйста, повторите запрос в текстовом формате.')    }    const order = await db.Order.findOne({where:{      id: arg.order_id    }});    await order.update({comment: self.request.content});    const orderData = await self.request.taxiMethods.createOrder(self.request.user.phone, order.get('address'), order.get('comment'));    await order.update({order_id: orderData.data.order_id});    await self.request.setStatus('orderAccess', {order_id: order.get('order_id')});    return self.schedule(order.get('id'), orderData.data.status)  };    return {Method}};function getDates(startDate, stopDate) {  var dateArray = new Array();  var currentDate = startDate;  while (currentDate <= stopDate) {    dateArray.push(new Date(currentDate));    currentDate = currentDate.addDays(1);  }  return dateArray;}