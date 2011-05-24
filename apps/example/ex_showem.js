member = require('./schema/examplemodulename');

module.exports = function(env){

member.virtual('namenelect') 
  .get( function () { 
    return this.title + ' (' + this.category + ')'; 
  }).set(function(v){ 
    ;
  }); 

	// either define here, or use env.basetemps
	var basetemps = [ {selector:'#boilerplate-container', filename:'example.htm'} ];

	var mongoose = require('mongoose');
	mongoose.connect('mongodb://localhost/exampledb');
	var ExampleSchema = mongoose.model('ExampleModelName');

		env.app.get(/\/\#?list/, function(req, res){

			ExampleSchema.find({}, env.findFields(member.tree), function(err, docs) {
				var all_objs = {eachitem: env.translateFields(docs, member.tree)};
				var temps = [{selector:'#maintab', filename:'showall.htm'}
							];

				env.respond(req, res, basetemps, temps, all_objs);
			});

		});


		env.app.get('/state/:state', function(req, res){

			// which fields can be either : either the relevant Schema.tree, to get all fields
			// or a list of fields, ending with an object whose elements translate fieldnames to selectors
			var which_fields = ['title', {exfield:'exampleclassname', ofield:'oclassname.attribute' }];
			ExampleSchema.find({state:req.params.state}, env.findFields(which_fields))
				.sort('category', -1)
				.execFind( function(err, docs) {

				// all_objs specifies which (translated) objects go where ...
				var all_objs = {fieldopt: env.translateFields(docs, which_fields)};

				// temps have two meanings :
				// first, we include templates into the selected elements,
				// then, we use these selectors to narrow in on our objects
				var temps = [{selector:'#maintab', filename:'showstate.htm'}
							,{selector:'.allitems', filename:'eachopt.htm'}
						];

				env.respond(req, res, basetemps, temps, all_objs);
			});

		});

		env.app.get('/:category', function(req, res){

			// which fields can be either : either the relevant Schema.tree, to get all fields
			// or a list of fields, ending with an object whose elements translate fieldnames to selectors
			var which_fields = ['title', 'photo', 'category', 'position', 'state',
								{ photo:'theimageurl.src'} ];
			ExampleSchema.find({category:req.params.category}, env.findFields(member.tree))
				.execFind( function(err, docs) {

				// all_objs specifies which (translated) objects go where ...
				var all_objs = {whichitem: env.translateFields(docs, which_fields)};

				// temps have two meanings :
				// first, we include templates into the selected elements,
				// then, we use these selectors to narrow in on our objects
				var temps = [{selector:'#maintab', filename:'showitem.htm'}
						];

				env.respond(req, res, basetemps, temps, all_objs);
			});

		});
};

