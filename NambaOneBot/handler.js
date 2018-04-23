const request = require('request');

module.exports = () => {
  const NambaOne = function (app, req, config) {
    this.apiUrl = config.API_URL;
    this.token = config.BOT_TOKEN;
    this.taxi_api = config.TAXI_API;
  };
  NambaOne.prototype.sendMessage = async function (content, payload = {}) {
    const self = this;
    const data = {
      url: self.apiUrl + '/sendMessage',
      method: 'GET',
      qs: {
        contentType: 'text',
        content: content,
        chatId: self.chatId,
      },
      headers: {
        'Bot-Auth-Token': self.token
      }
    };
    if (payload.buttons) {
      data.qs.buttons = payload.buttons;
    }
    if (payload.keyboard) {
        data.qs.keyboard = payload.keyboard;
    }
    return new Promise((resolve, reject) => {
      request(data, function (error, response, body) {
        if (error) {
          reject(error)
        }
        resolve(body)
      });
    });
  };
  
  NambaOne.prototype.editMessage = async function(content, messageId, payload = {}){
    const self = this;
    const data = {
      url: self.apiUrl + '/editMessage',
      method: 'GET',
      qs: {
        contentType: 'text',
        content: content,
        chatId: self.chatId,
        messageId: messageId
      },
      headers: {
        'Bot-Auth-Token': self.token
      }
    };
    if (payload.buttons) {
      data.qs.buttons = payload.buttons;
    }
    if (payload.keyboard) {
      data.qs.keyboard = payload.keyboard;
    }
    return new Promise((resolve, reject) => {
      request(data, function (error, response, body) {
        if (error) {
          reject(error)
        }
        resolve(body)
      });
    });
  };
  
  NambaOne.prototype.setStatus = async function (statusName, args) {
    const self = this;
    const status = JSON.stringify({func: statusName, arg: args});
    const user = await this.db.User.findOne({
      where: {
        nambaoneBotId: self.botId
      }
    });
    return user.update({nambaoneStatus: status})
  };
  
  
  const Handler = function (app, req, config) {
    NambaOne.apply(this, arguments);
    this.taxiMethods = require('./taxiMethods')(app, config);
    this.db = app.get('db');
    this.data = req.body.result;
    this.req = req;
    this.config = config;
    this.get_token = app.get('token')
  };
  Handler.prototype = Object.create(NambaOne.prototype);
  Handler.prototype.constructor = Handler;
  
  
  Handler.prototype.init = async function () {
    this.texts = require('./texts');
    await this._initUser();
    return;
  };
  
  Handler.prototype._initUser = async function () {
    const self = this;
    let user = await self.db.User.findOne({
      where: {
        nambaoneBotId: self.botId
      },
    });
    if (!user) {
      await self.sendMessage('Здравствуйте! Вас приветствует сервис Namba Taxi');
      let data = {
        url: self.apiUrl + '/getContact?userId=' + self.botId,
        method: 'GET',
        headers: {
          'Bot-Auth-Token': self.token
        }
      };
      const userInfo = await new Promise((resolve, reject) => {
        request(data, (err, res, body) => {
          if (err) {
            reject(err)
          }
          resolve(JSON.parse(body))
        });
      });
      user = await self.db.User.findOne({
        where:{
          nambaoneBotId: self.botId
        }
      });
      if(!user){
        user = await self.db.User.create({
          name: userInfo.data.name, nambaoneBotId: self.botId, nambaOneChatId: self.chatId, phone: userInfo.data.phone,
          nambaoneStatus: JSON.stringify({func: 'anotherFunc', arg:{}})
        });
      }
    }
    this.user = {
      id: user.get('id'),
      name: user.get('name'),
      bot_id: user.get('nambaoneBotId'),
      phone: user.get('phone'),
      status: JSON.parse(user.get('nambaoneStatus'), null),
      last_address: JSON.parse(user.get('last_address'))
    };
    return;
  }
  
  Handler.prototype.translate = function(word){
    return this.texts[word][this.user.lang]
  }
  
  return {Handler}
};