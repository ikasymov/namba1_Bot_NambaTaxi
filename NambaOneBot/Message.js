const {Handler} = require('./handler')();
const {Method} = require('./methods')();

module.exports = ()=>{
  const Message = function(app, req, config){
    Handler.apply(this, arguments);
    this.botId = this.data.message.from.id;
    this.chatId = this.data.message.chat.id;
    this.content = this.data.message.content;
    this.Method = new Method(this);
    this.messageType = this.data.message.type
  };
  Message.prototype = Object.create(Handler.prototype);
  Message.prototype.constructor = Message;
  return {Message};
};