
var ft = require('../../swxmo/fieldtools');

module.exports = function(env) {

	var menu = require('./schema/menu').name;
	Menu = env.db.model(menu);

	env.app.get('/menu/:menu_name', function(req,res) {
		Menu.find({name:req.params.menu_name})
			.sort('parent_item', 1)
			.sort('prev_item', 1)
			.execFind( function(err, docs) {
				if (err) {
					console.log(err);
				}
				if (docs.length) {
					var which_fields = ['item', 'parent_item', 'prev_item', 'title', 'link'];
					var all_objs = ft.translateFields(docs, which_fields);
					env.respond(req, res, null, null, all_objs);
				} else res.send('Invalid menu name', 404);
			});
	});

};

