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
var sequelize = new Sequelize('postgres://postgres@localhost:5442/test');
var context = {user: {role: 'ADMIN'}};

var modelUser = sequelize.define('user', {
  displayName: {type: Sequelize.DataTypes.STRING, comment: "I'm a comment!"},
  email: Sequelize.DataTypes.TEXT,
  photo: Sequelize.DataTypes.STRING,
  role: Sequelize.DataTypes.ENUM('ADMIN', 'USER'),
}, {
  paranoid: true,
  underscoredAll: true,
  indexes: [
    {unique: true, fields: ['email']}
  ],
  defaultScope: {},
  scopes: {
    showDeleted: {
      paranoid: false
    }
  }
});

var modelGroup = sequelize.define('group', {
  displayName: {type: Sequelize.DataTypes.STRING, comment: "I'm a comment!"},
}, {
  paranoid: true,
  underscoredAll: true
});

modelUser.belongsToMany(modelGroup, {through: 'user_group'});
modelGroup.belongsToMany(modelUser, {through: 'user_group'});

sequelize.sync({ force: false }).then(() => {

  function outputResult(result) {
    console.log('result.data', result.data);
  }

  function outputError(result) {
    console.log('result.error', JSON.stringify(result.error));
  }

  let ctrlOptions = {
    rules: [
      {roles: ['ADMIN'], restrictedFields: ["deletedAt"], scope: 'showDeleted'}
    ]
  };

  var ctrl = new SequelizeCRUDController(modelUser, ctrlOptions);
  var params = {
    displayName: 'John Doe'
  };

  ctrl
    .execute(context, 'create', params)
    .then(outputResult, outputError);

  ctrl
    .execute(context, 'list')
    .then(outputResult, outputError);


  ctrl
    .execute(context, 'get', {id: 1})
    .then(outputResult, outputError);
   
  ctrl
    .execute(context, 'update', {id: 1, role: "ADMIN"})
    .then(outputResult, outputError);


  ctrl
    .execute(context, 'delete', {id: 1})
    .then(outputResult, outputError);

});