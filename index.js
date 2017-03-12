/**
 * Autor Eugene Demchenko <demchenkoev@gmail.com>
 * Created on 11.03.17.
 * License BSD
 */
'use strict';

let ctrls = require('gx-ctrls');

ctrls.validate.validators.number = function (value, options, key, attributes) {
  if (typeof value === 'undefined') {
    return;
  }
  if (!ctrls.validate.isNumber(value)) {
    return 'must be a number';
  }
  if (options.hasOwnProperty('min') && value < options.min) {
    return `must be >= ${options.min}`;
  }
  if (options.hasOwnProperty('max') && value < options.max) {
    return `must be <= ${options.max}`;
  }
};

ctrls.validate.validators.sequelize = function (value, options, key, attributes) {
  return options.message(value, options, key, attributes);
};

function getConstraintsForModel(Model, action) {
  let attrs = Model.tableAttributes;
  //let defaults = Model._defaultValues;
  let fields = Object.keys(attrs);
  let result = {};
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

class SequelizeListAction extends ctrls.Action {

  get paramsConstraints() {
    return {
      where: {},
      include: {},
      order: {},
      offset: {
        number: {min: 0}
      },
      limit: {
        number: { min: 0,  max: 1000 }
      }
    }
  }

  process() {
    let Model = this.options.ctrl.Model;
    let findOptions = {
      where: this.params.where || {},
      order: this.params.order || Model.primaryKeyField,
      offset: this.params.offset || 0,
      limit: this.params.limit || 50,
      raw: !this.options.disableRawOption
    };
    return Model.findAndCountAll(findOptions);
  }
}

class SequelizeGetAction extends ctrls.Action {

  get paramsConstraints() {
    let Model = this.options.ctrl.Model;
    let constraints = {};
    constraints[Model.primaryKeyField] = {presence: true};
    return constraints;
  }

  process() {
    let Model = this.options.ctrl.Model;
    let findOptions = {
      where: {},
      raw: !this.options.disableRawOption
    };
    findOptions.where[Model.primaryKeyField] = this.params[Model.primaryKeyField];
    return Model.findOne(findOptions);
  }
}

class SequelizeCreateAction extends ctrls.Action {

  get paramsConstraints() {
    let Model = this.options.ctrl.Model;
    let constraints = getConstraintsForModel(Model, 'create');
    return constraints;
  }

  process() {
    let Model = this.options.ctrl.Model;
    return Model.create(this.params, {raw: !this.options.disableRawOption})
      .then((row) => {
        //sequelize fix raw option
        if (!this.options.disableRawOption) {
          row = row.get({plain: true});
        }
        return row;
      });
  }
}

class SequelizeUpdateAction extends ctrls.Action {

  get paramsConstraints() {
    let Model = this.options.ctrl.Model;
    let constraints = getConstraintsForModel(Model, 'update');
    constraints[Model.primaryKeyField].presence = true;
    return constraints;
  }

  process() {
    let Model = this.options.ctrl.Model;
    let updateOptions = {
      where: {},
    };
    updateOptions.where[Model.primaryKeyField] = this.params[Model.primaryKeyField];
    let values = Object.assign({}, this.params);
    delete values[Model.primaryKeyField];
    return Model.findOne(updateOptions).then((row) => {
      if(row === null) {
        return ctrls.defaultOptions.errorFormater('OBJECT_NOT_FOUND', `${Model.name} not found.`, {where: updateOptions.where})
      }
      return row.update(values).then(() => {
        return row.reload().then(() => {
          if(!this.options.disableRawOption) {
            return row.toJSON();
          }
          return row;
        });
      });
    });
  }
}

class SequelizeDeleteAction extends ctrls.Action {

  get paramsConstraints() {
    let Model = this.options.ctrl.Model;
    let constraints = {};
    constraints[Model.primaryKeyField] = {presence: true};
    return constraints;
  }

  process() {
    let Model = this.options.ctrl.Model;
    let destroyOptions = {
      where: {}
    };
    destroyOptions.where[Model.primaryKeyField] = this.params[Model.primaryKeyField];
    return Model.destroy(destroyOptions);
  }
}

class SequelizeCRUDController extends ctrls.Contoller {

  constructor(Model, context, options) {
    super(context, options);
    this.Model = Model;
    this.addAction('list', SequelizeListAction);
    this.addAction('get', SequelizeGetAction);
    this.addAction('create', SequelizeCreateAction);
    this.addAction('update', SequelizeUpdateAction);
    this.addAction('delete', SequelizeDeleteAction);
  }
}

module.exports.ctrls = ctrls;
module.exports.getConstraintsForModel = getConstraintsForModel;
module.exports.SequelizeListAction = SequelizeListAction;
module.exports.SequelizeGetAction = SequelizeGetAction;
module.exports.SequelizeCreateAction = SequelizeCreateAction;
module.exports.SequelizeUpdateAction = SequelizeUpdateAction;
module.exports.SequelizeDeleteAction = SequelizeDeleteAction;
module.exports.SequelizeCRUDController = SequelizeCRUDController;
