/**
 * Autor Eugene Demchenko <demchenkoev@gmail.com>
 * Created on 11.03.17.
 * License BSD
 */
'use strict';

let ctrls = require('gx-ctrls');
let _ = require('lodash');

if(!ctrls.validate.validators.number) {
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
}

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

class SequelizeAction extends ctrls.Action {

  applyScopeRule(Model, roleOrConext) {
    let role;
    if(typeof roleOrConext === 'string') {
      role = roleOrConext;
    } else {
      role = this.pickRoleFromContext(roleOrConext || this.context);
    }
    if(!role) {
      return Model;
    }

    let rule = this.getRule(role);
    if(!rule || !rule.scope) {
      return Model;
    }
    return Model.scope(rule.scope);
  }

};

class SequelizeListAction extends SequelizeAction {

  get paramsConstraints() {
    let Model = this.context.$command.controller.Model;
    var constraints = {
      where: {},
      order: {},
      offset: {
        number: {min: 0}
      },
      limit: {
        number: {min: 0, max: 1000}
      }
    };
    if(Model.associations) {
      var includes = Object.keys(Model.associations);
      if (includes.length) {
        constraints['include'] = {inclusion: includes};
      }
    }
    if(Model.options.scopes) {
      var scopes = Object.keys(Model.options.scopes);
      if (scopes.length) {
        scopes.push(null);
        constraints['scope'] = {inclusion: scopes};
      }
    }
    return constraints;
  }

  process() {
    let Model = this.applyScopeRule(this.context.$command.controller.Model);
    let findOptions = {
      where: this.params.where || {},
      order: this.params.order || Model.primaryKeyField,
      offset: this.params.offset || 0,
      limit: this.params.limit || 50,
      raw: !this.options.disableRawOption
    };
    if(this.params.include) {
      findOptions.include = this.params.include || {};
    }
    if(this.params.scope) {
      findOptions.scope = this.params.scope || {};
    }
    return Model
      .findAndCountAll(findOptions)
      .then((result)=> {
        if(!this.options.disableRawOption) {
          result.rows = this.applyFieldsRule(result.rows);
        }
        return result;
      });
  }
}

class SequelizeGetAction extends SequelizeAction {

  get paramsConstraints() {
    let Model =this.context.$command.controller.Model;
    let constraints = {};
    constraints[Model.primaryKeyField] = {presence: true};
    if(Model.associations) {
      let includes = Object.keys(Model.associations);
      if (includes.length) {
        constraints['include'] = {inclusion: includes};
      }
    }
    if(Model.scopes) {
      let scopes = Object.keys(Model.scopes);
      if (scopes.length) {
        scopes.push(null);
        constraints['scope'] = {inclusion: scopes};
      }
    }
    return constraints;
  }

  process() {
    let Model =  this.applyScopeRule(this.context.$command.controller.Model);
    let findOptions = {
      where: {},
      raw: !this.options.disableRawOption
    };
    if(this.params.include) {
      findOptions.include = this.params.include;
    }
    if(this.params.scope) {
      findOptions.scope = this.params.scope;
    }
    findOptions.where[Model.primaryKeyField] = this.params[Model.primaryKeyField];
    return Model
      .findOne(findOptions)
      .then((result)=> {
        if(!this.options.disableRawOption) {
          result = this.applyFieldsRule(result);
        }
        return result;
      });
  }
}

class SequelizeCreateAction extends SequelizeAction {

  get paramsConstraints() {
    let Model = this.context.$command.controller.Model;
    let constraints = getConstraintsForModel(Model, 'create');
    return constraints;
  }

  process() {
    let Model = this.context.$command.controller.Model;
    return Model.create(this.params, {raw: !this.options.disableRawOption})
      .then((row) => {
        //sequelize fix raw option
        if (!this.options.disableRawOption) {
          row = this.applyFieldsRule(row.get({plain: true}));
        }
        return row;
      });
  }
}

class SequelizeUpdateAction extends SequelizeAction {

  get paramsConstraints() {
    let Model = this.context.$command.controller.Model;
    let constraints = getConstraintsForModel(Model, 'update');
    constraints[Model.primaryKeyField].presence = true;
    return constraints;
  }

  process() {
    let Model = this.applyScopeRule(this.context.$command.controller.Model);
    let updateOptions = {
      where: {},
    };
    updateOptions.where[Model.primaryKeyField] = this.params[Model.primaryKeyField];
    let values = Object.assign({}, this.params);
    delete values[Model.primaryKeyField];
    return Model.findOne(updateOptions).then((row) => {
      if (row === null) {
        return Promise.reject(
          ctrls.defaultOptions.errorFormater('OBJECT_NOT_FOUND', `${Model.name} not found.`, {where: updateOptions.where})
        );
      }
      return row.update(values).then(() => {
        return row.reload({ paranoid: false }).then(() => {
          if (!this.options.disableRawOption) {
            return this.applyFieldsRule(row.toJSON());
          }
          return row;
        });
      });
    });
  }
}

class SequelizeDeleteAction extends SequelizeAction {

  get paramsConstraints() {
    let Model = this.applyScopeRule(this.context.$command.controller.Model);
    let constraints = {};
    constraints[Model.primaryKeyField] = {presence: true};
    return constraints;
  }

  process() {
    let Model = this.context.$command.controller.Model;
    let destroyOptions = {
      where: {}
    };
    destroyOptions.where[Model.primaryKeyField] = this.params[Model.primaryKeyField];
    return Model.destroy(destroyOptions);
  }
}

class SequelizeCRUDController extends ctrls.Contoller {

  constructor(Model, controllerName, options) {
    super(controllerName, options);
    this.Model = Model;
    this.addAction('list', SequelizeListAction);
    this.addAction('get', SequelizeGetAction);
    this.addAction('create', SequelizeCreateAction);
    this.addAction('update', SequelizeUpdateAction);
    this.addAction('delete', SequelizeDeleteAction);
  }

  getModelFields(role, options) {
    var attrs = this.Model.tableAttributes;
    var fields = Object.keys(attrs);
    var result = {};
    fields.forEach((field) => {
      if(options.hideReadonlyFields && this.Model._readOnlyAttributes && this.Model._readOnlyAttributes.length) {
        if(this.Model._readOnlyAttributes.indexOf(field) !== -1) {
          return;
        }
      }
      var attrOpt = attrs[field];
      result[field] = {type: attrOpt.type.toSql()};
      if (typeof attrOpt.allowNull !== 'undefined') {
        result[field].allowNull = attrOpt.allowNull;
      }
      if (attrOpt.comment) {
        result[field].comment = attrOpt.comment;
      }
      if (attrOpt.defaultValue) {
        result[field].defaultValue = attrOpt.defaultValue.toString();
      }
      switch (attrOpt.type.toString()) {
        case 'STRING':
        case 'CHAR':
        case 'TEXT':
          if (attrOpt.type._length) {
            result[field].length = attrOpt.type._length;
          }
          break;
        case 'ENUM':
          result[field].value = attrOpt.values;
          break;
      }
    });
    return role ? this.applyFieldsRule(result, role) : result;
  }
}

module.exports.ctrls = ctrls;
module.exports.getConstraintsForModel = getConstraintsForModel;
module.exports.SequelizeAction = SequelizeAction;
module.exports.SequelizeListAction = SequelizeListAction;
module.exports.SequelizeGetAction = SequelizeGetAction;
module.exports.SequelizeCreateAction = SequelizeCreateAction;
module.exports.SequelizeUpdateAction = SequelizeUpdateAction;
module.exports.SequelizeDeleteAction = SequelizeDeleteAction;
module.exports.SequelizeCRUDController = SequelizeCRUDController;
