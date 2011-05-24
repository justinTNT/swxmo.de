var	os = require('os');
var	mongoose = require('mongoose');
var	ft = require('../fieldtools');
var	adminschema = require('./adminschema');
var	express = require('express');

var admdb = mongoose.createConnection('mongodb://localhost/swxmodeadmin');
var admins = admdb.model('swxAdm');
var Fields = admdb.model('SWXadmFields');


function authenticate(name, pass, appname, cb) {
console.log('trying to authenticate '  + name + ' with ' + pass + ' on ' + appname);
	admins.find({'appname':appname, 'login':name }, function(err, docs) {
		if (err) throw err;
		if (docs.length == 0) {
console.log('no records found');
			return cb();
		}
		if (docs[0].passwd == pass) {
			docs[0].passwd = '';
			return cb(docs[0]);
		}
		cb();
	});
}


function requiresLogin(req, res, next) {
	if (! req.session) {
		 next();
	} else if (req.session.user) next();
	else res.redirect('/sessions/new');
};



module.exports = function(e){

	var env = { app : express.createServer(
				express.bodyParser(),
				express.cookieParser(),
				express.session({ secret:os.hostname() + '_' + e.appname })
			),  dir : __dirname
			,  appname : 'admin'
			,  targetapp : e.appname
			,  staticurl : e.staticurl
		};


	env.basetemps = [ {selector:'#boilerplate-container', filename:'admin.htm'} ];

	var appdb = mongoose.createConnection('mongodb://localhost/' + env.targetapp);

	env.app.get("/list", requiresLogin, function(req, res, next){
		Fields.distinct('table', {appname:env.targetapp}, function(err, docs) {
			if (err) throw err;
			var tmpobj = {};
			tmpobj['table'] = 'table.href';
			var which_fields = ['table', tmpobj];
			var all_objs = {eachtable: ft.translateFields(docs, which_fields)};
			var temps = [{selector:'#maintab', filename:'listall.htm'}
						];
			env.respond(req, res, env.basetemps, temps, all_objs);
		});
	});


	env.app.get("/:table", requiresLogin, function(req, res, next){
		var sch = require('../../apps/' + env.targetapp + '/schema/' + req.params.table + '.js');
		if (req.params.table.indexOf('.') > 0)
			next();
		else {
			Fields.find({ appname : env.targetapp
						, table : req.params.table
						, listed : true}
					, ft.findFields(sch.tree))
				.sort('listorder', 1).run(function(err, docs) {
					if (err) throw err;
					env.respond(req, res, null, null, docs);
				});
		}
	});


	env.app.get('/sessions/new', function(req,res) {
console.log('sessions/new');
		var temps = [{selector:'#maintab', filename:'login.htm'}
				];
		env.respond(req, res, env.basetemps, temps, null);
	});

	env.app.post('/sessions', function(req,res) {
console.log('/sessions : body is ');
console.log(req.body);
		authenticate(req.body.login, req.body.password, env.targetapp, function(user){
			if (user) {
				req.session.user = user;
				res.redirect('/list');
			} else {
				res.redirect('/sessions/new');
			}
		});
	});


	return env;
};

