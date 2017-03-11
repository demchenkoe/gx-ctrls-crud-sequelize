/**
 * Autor Eugene Demchenko <demchenkoev@gmail.com>
 * Created on 11.03.17.
 * License BSD
 */
'use strict';

var gxCtrls = require('gx-ctrls');

gxCtrls.validate.validators.number = function (value, options, key, attributes) {
  if (typeof value === 'undefined') {
    return;
  }
  if (!gxCtrls.validate.isNumber(value)) {
    return 'must be a number';
  }
  if (options.hasOwnProperty('min') && value < options.min) {
    return `must be >= ${options.min}`;
  }
  if (options.hasOwnProperty('max') && value < options.max) {
    return `must be <= ${options.max}`;
  }
};

gxCtrls.validate.validators.sequelize = function (value, options, key, attributes) {
  return options.message(value, options, key, attributes);
};

function getConstraintsForModel(model, action) {
  var attrs = model.tableAttributes;
  //var defaults = model._defaultValues;
  var fields = Object.keys(attrs);
  var result = {};
  fields.forEach((field) => {
    let validators = {};
    let attrOpt = attrs[field];
    /*
     if(action === 'create' && !attrOpt.allowNull && !defaults.hasOwnProperty(field)) {
     validators.presence = true;
     }
     */
    validators.sequelize = {};
    validators.sequelize.message = function (value, attributes, attributeName, options, constraints) {
      if (typeof value === 'undefined') {
        return null;
      }
      if (typeof attrOpt.type.validate === 'function') {
        try {
          attrOpt.type.validate(value);
        }
        catch (e) {
          return e.message;
        }
      }
      return null;
    };

    result[field] = validators;
  });

  return result;
}

class SequelizeListAction extends gxCtrls.Action {

  get paramsConstraints() {
    return {
      where: {},
      order: {},
      offset: {
        number: {min: 0}
      },
      limit: {
        number: { min: 0,  max: 1000 }
      }
    }
  }

  _run() {
    var model = this.options.ctrl.model;
    var findOptions = {
      where: this.params.where || {},
      order: this.params.order || model.primaryKeyField,
      offset: this.params.offset || 0,
      limit: this.params.limit || 50,
      raw: !this.options.disableRawOption
    };
    return model.findAndCountAll(findOptions);
  }
}

class SequelizeGetAction extends gxCtrls.Action {

  get paramsConstraints() {
    var model = this.options.ctrl.model;
    var constraints = {};
    constraints[model.primaryKeyField] = {presence: true};
    return constraints;
  }

  _run() {
    var model = this.options.ctrl.model;
    var findOptions = {
      where: {},
      raw: !this.options.disableRawOption
    };
    findOptions.where[model.primaryKeyField] = this.params[model.primaryKeyField];
    return model.findOne(findOptions);
  }
}

class SequelizeCreateAction extends gxCtrls.Action {

  get paramsConstraints() {
    var model = this.options.ctrl.model;
    var constraints = getConstraintsForModel(model, 'create');
    return constraints;
  }

  _run() {
    var model = this.options.ctrl.model;
    return model.create(this.params, {raw: !this.options.disableRawOption})
      .then((row) => {
        //sequelize fix raw option
        if (!this.options.disableRawOption) {
          row = row.get({plain: true});
        }
        return row;
      });
  }
}

class SequelizeUpdateAction extends gxCtrls.Action {

  get paramsConstraints() {
    var model = this.options.ctrl.model;
    var constraints = getConstraintsForModel(model, 'update');
    constraints[model.primaryKeyField].presence = true;
    return constraints;
  }

  _run() {
    var model = this.options.ctrl.model;
    var updateOptions = {
      where: {}
    };
    updateOptions.where[model.primaryKeyField] = this.params[model.primaryKeyField];
    var values = Object.assign({}, this.params);
    delete values[model.primaryKeyField];
    return model.update(values, updateOptions);
  }
}

class SequelizeDeleteAction extends gxCtrls.Action {

  get paramsConstraints() {
    var model = this.options.ctrl.model;
    var constraints = {};
    constraints[model.primaryKeyField] = {presence: true};
    return constraints;
  }

  _run() {
    var model = this.options.ctrl.model;
    var destroyOptions = {
      where: {}
    };
    destroyOptions.where[model.primaryKeyField] = this.params[model.primaryKeyField];
    return model.destroy(destroyOptions);
  }
}

class SequelizeCRUDController extends gxCtrls.Contoller {

  constructor(model, context, options) {
    super(context, options);
    this.model = model;
  }

  get actions() {
    return {
      'list': SequelizeListAction,
      'get': SequelizeGetAction,
      'create': SequelizeCreateAction,
      'update': SequelizeUpdateAction,
      'delete': SequelizeDeleteAction
    }
  }
}

module.exports.gxCtrls = gxCtrls;
module.exports.getConstraintsForModel = getConstraintsForModel;
module.exports.SequelizeListAction = SequelizeListAction;
module.exports.SequelizeGetAction = SequelizeGetAction;
module.exports.SequelizeCreateAction = SequelizeCreateAction;
module.exports.SequelizeUpdateAction = SequelizeUpdateAction;
module.exports.SequelizeDeleteAction = SequelizeDeleteAction;
module.exports.SequelizeCRUDController = SequelizeCRUDController;
