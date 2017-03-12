/**
 * Autor Eugene Demchenko <demchenkoev@gmail.com>
 * Created on 12.03.17.
 * License BSD
 */

'use strict';

/**
 * INSTALL MODULES BEFORE USE THIS EXAMPLE
 * npm install sequelize pg pg-hstore --save
 */

var SequelizeCRUDController = require("../index").SequelizeCRUDController;
var Sequelize = require("sequelize");
var sequelize = new Sequelize('postgres://postgres@192.168.10.101:5442/medical-office');

var modelUser = sequelize.define('temp', {
  displayName: Sequelize.DataTypes.STRING,
  email:  Sequelize.DataTypes.STRING,
  photo: Sequelize.DataTypes.STRING,
  role: Sequelize.DataTypes.ENUM('WEBAPP_ADMIN', 'CONSUMER')
}, {
  paranoid: true,
  underscoredAll: true,
  indexes: [
    { unique: true, fields: ['email'] }
  ]
});

//sequelize.sync()

var ctrl = new SequelizeCRUDController(modelUser);

 ctrl.callAction('create', { displayName: 'John Doe', photo: 'https://s-media-cache-ak0.pinimg.com/736x/f2/fb/2f/f2fb2fcc3c9b2ada37cf02af881511b1.jpg' })
 .then(
   (results) => { console.log('results', results) },
   (error) => { console.log('error', error) }
 );


ctrl.callAction('list', {  })
  .then(
    (results) => { console.log('results', results) },
    (error) => { console.log('error', error) }
  );


 ctrl.callAction('get', { id: 1 })
 .then(
   (results) => { console.log('results', results) },
   (error) => { console.log('error', error) }
 );

 ctrl.callAction('update', { id: 2, role: "WEBAPP_ADMIN" })
 .then(
   (results) => { console.log('results', results) },
   (error) => { console.log('error', error) }
 );



ctrl.callAction('get', { id: 1 })
  .then(
    (results) => { console.log('results', results) },
    (error) => { console.log('error', error) }
  );