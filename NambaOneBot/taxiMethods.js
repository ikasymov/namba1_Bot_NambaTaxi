const request = require('request');

module.exports = function(app, config){
  const getStatus = async function(order_id){
    return new Promise((resolve, reject)=>{
      const data = {
        url: config.TAXI_API + '/order/status/' + order_id,
        method: 'GET'
      };
      request(data, (error, res, body)=>{
        if(error){
          return reject(error)
        }
        resolve(JSON.parse(body))
      })
    })
  };
  
  const cancelOrder = async function(order_id){
    let data = {
      url: config.TAXI_API + '/order/cancel/' + order_id,
      method: 'GET'
    };
    return new Promise((resolve, reject)=>{
      request(data, (error, res, body)=>{
        if(error){
          reject(error)
        }else{
          resolve(body)
        }
      })
    });
  };
  
  const createOrder = async function(phone, address, comment){
    console.log(comment)
    return new Promise((resolve, reject)=>{
      let data = {
        url: config.TAXI_API + '/order/request',
        method: 'POST',
        body: {
          phone: phone,
          address: address,
          fare: 1,
          comment: comment || ''
        },
        json: true
      };
      request(data, (error, response, body)=>{
        if(error){
          reject(error)
        }
        resolve(body)
      });
    })
  };
  
  const getGeo = async function(latitude, longitude){
    return new Promise((resolve, reject)=>{
      let data = {
        url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + latitude + ',' + longitude + '&key=AIzaSyDbcJBaK7ke05PH8jujhk1FmbpvoSH93hY&language=ru',
        method: 'GET'
      }
      request(data, function (error, response, body) {
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
  
  return {getStatus, cancelOrder, createOrder, getGeo}
};