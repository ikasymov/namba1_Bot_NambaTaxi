const {Handler} = require('./handler')();
const {Method} = require('./methods')();

module.exports = ()=>{
  const Action = function(app, req, config){
    Handler.apply(this, arguments);
    this.botId = this.data.action.sender.id;
    this.chatId = this.data.action.chatId;
    const data = JSON.parse(this.data.action.content);
    this.func = data.func;
    this.arg = data.arg;
    this.content = this.data.action.content;
    this.Method = new Method(this);
    this.messageId = this.data.action.messageId
  };
  Action.prototype = Object.create(Handler.prototype);
  Action.prototype.constructor = Action;
  
  Action.prototype.callCallback = async function(){
    return this[this.func]()
  };
  
  Action.prototype.addComment = async function(){
    const self = this;
    const db = self.db;
    const arg = self.arg;
    if(arg.comment){
      await self.setStatus('sendComment', {order_id: arg.order_id});
      return self.editMessage('Введите комментарий', self.messageId)
    }else{
      const orderObject = await db.Order.findOne({where:{
        id: arg.order_id
      }});
      const order = await self.taxiMethods.createOrder(self.user.phone, orderObject.get('address'), '');
      await self.editMessage('Ваш заказ принять', self.messageId);
      await orderObject.update({order_id: order.data.order_id});
      await self.setStatus('orderAccess', {order_id: orderObject.get('order_id')});
      return self.Method.schedule(orderObject.get('id'), 'New order')
    }
  };
  
  Action.prototype.cancel = async function(){
    const self = this;
    const db = self.db;
    const arg = self.arg;
    const order = await db.Order.findOne({where:{
      id: arg.order_id
    }});
    
    await self.taxiMethods.cancelOrder(order.get('order_id'));
    await order.update({status: 'Rejected'});
    const orderAll = await db.Order.findAll({
      attributes: [
        [db.Sequelize.fn('DISTINCT', db.Sequelize.col('address')) ,'address'],
      ]
    });
    var keyboard = false;
    if(orderAll.length > 0){
      keyboard = orderAll.map((object)=>{
        return [{title: object.get('address'), action: object.get('address')}]
      });
    }
    await self.setStatus('wait_geo', {user_id: self.user.id});
    return self.editMessage('Ваш заказ был отменён. \n Чтобы заказать такси вы можете: \n 1. Набрать адрес вручную в поле ввода.\n 2. Отправить метку на карте. \n 3. Выбрать в меню из предыдущих заказов.', self.messageId,  keyboard ? {keyboard: keyboard}: {})
  };
  
  Action.prototype.resume = async function(){
    const self = this;
    const db = self.db;
    const arg = self.arg;
    await self.editMessage('Секунду...', self.messageId);
    const orderObject = await db.Order.findOne({
      where:{
        id: arg.order_id
      }
    });
    const order = await self.taxiMethods.createOrder(self.user.phone, orderObject.get('address'), orderObject.get('comment') || '');
    await orderObject.update({status: 'New order'});
    await self.setStatus('orderAccess', {order_id: orderObject.get('order_id')});
    return self.Method.schedule(orderObject.get('id'), orderObject.get('status'))
  };
  return {Action}
};

function getDates(startDate, stopDate) {
  var dateArray = new Array();
  var currentDate = startDate;
  while (currentDate <= stopDate) {
    dateArray.push(new Date (currentDate));
    currentDate = currentDate.addDays(1);
  }
  return dateArray;
}