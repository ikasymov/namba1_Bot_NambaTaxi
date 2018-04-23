var express = require('express');
var router = express.Router();
module.exports = function (app) {
  const nambaoneBot = app.get('nambaoneBot')
  
  router.get('/', function (req, res) {
    res.json({
      success: true
    });
  });
  
  
  router.post('/nambaone', function (req, res, next) {
    nambaoneBot.run(app, req).then(function (result) {
      return res.json({
        success: true,
        message: 'ok'
      })
    }).catch(function (e) {
      console.log('run error')
      console.log(e);
      return res.json({
        success: true,
        message: 'ok'
      })
    });
  });
  
  app.use('/', router);
};


//test