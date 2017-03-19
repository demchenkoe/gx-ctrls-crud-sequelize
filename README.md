

#### Install library


	npm install gx-ctrls-crud-sequelize


#### Exmaple 

Define model
		
		var Sequelize = require("sequelize");
		var sequelize = new Sequelize('postgres://postgres@localhost:5442/test');		
		
		var modelUser = sequelize.define('user', {
			displayName: {type: Sequelize.DataTypes.STRING, comment: "I'm a comment!"},
			email: Sequelize.DataTypes.TEXT,
			photo: Sequelize.DataTypes.STRING,
			role: Sequelize.DataTypes.ENUM('ADMIN', 'USER')
		}, {
			paranoid: true,
			underscoredAll: true,
			indexes: [
				{unique: true, fields: ['email']}
			],			
			scopes: {
				showDeleted: {
					paranoid: false
				}
			}
		});
		
Define helpers for output results		

				
		function outputResult(result) {
			console.log('result.data', result.data);
    }
    
    function outputError(result) {
			console.log('result.error', JSON.stringify(result.error));
    }

      
Define controller for sequelize model      
      
      var SequelizeCRUDController = require("gx-ctrls-crud-sequelize").SequelizeCRUDController;
      
Define rule for role ADMIN. This rule apply scope to model at execute action and hide field "deletedAt" from results.       
    
      let ctrlOptions = {
        rules: [
          {roles: ['ADMIN'], restrictedFields: ["deletedAt"], scope: 'showDeleted'}
        ]
      };
    
      var ctrl = new SequelizeCRUDController(modelUser, ctrlOptions);

How to use controller:      
      
      var context = {user: {role: 'ADMIN'}};
      
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
