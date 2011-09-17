var	os = require('os')
 ,	mongoose = require('mongoose')
 ,	ft = require('../fieldtools')
 ,	express = require('express')
 ,	_ = require('underscore')
 , fs = require('fs')
 , sys = require('sys')
;

require('./schema/admin');
var admdb = mongoose.createConnection('mongodb://localhost/swxmodeadmin');
var admins = admdb.model('swxAdm');
var Fields = admdb.model('SWXadmFields');



/*
 * this convoluted conclusion to the very simple file load
 * is cos we might want to rename it if it already exists ...
 */
function finishFileLoad(from, to, count, res) {
	fs.stat(to, function(err, stats){
		var i;
		if (!err) {
			if (count) {
				while (to.charAt(to.length-1) != '_')
					to=to.substr(0, to.length - 1);
				to=to.substr(0, to.length - 1);
			}
			to = to + '_' + count.toString();
			count++;
			finishFileLoad(from, to, count, res);
		} else {
			fs.rename(from, to);
			while ((i = to.indexOf('/')) >= 0)
				to = to.substr(i+1);
			res.writeHead(200, {'content-type': 'text/plain', 'final-filename': to});
			res.end(); 
		}
	});
}


function authenticate(name, pass, appname, cb) {
console.log('trying to authenticate '  + name + ' with ' + pass + ' on ' + appname);
	admins.find({'appname':appname, 'login':name }, function(err, docs) {
		if (err) throw err;
		if (docs.length == 0) {
console.log('no admin records found');
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
	} else if (req.session.user) {
		next();
	} else res.redirect('/sessions/new');
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


	/*
 	 * this route middleware makes sure the admin functionality on the admin table is only available to the admin user
 	 */
	function onlyAdminCanAdminAdmin(req, res, next) {
		if (req.params.table == 'admin') {
			req.params.theTable = admins;
			if (req.session.user.login == 'admin')
				next();
			else {
				next(new Error('Unauthorised access of admin tables'));
			}
		} else {
			sch = require('../../apps/' + env.targetapp + '/schema/' + req.params.table + '.js');
			req.params.theTable = appdb.model(sch.name);
			next();
		}
	}


	env.app.get("/list", requiresLogin, function(req, res, next){
		Fields.distinct('table', {appname:env.targetapp}, function(err, docs) {
			if (err) throw err;
			if (req.session.user.login == 'admin')
				docs.push({table:'admin'});
			var tmpobj = {};
			tmpobj['table'] = 'table.href';
			var which_fields = ['table', tmpobj];
			var all_objs = {tabitem: ft.translateFields(docs, which_fields)};
			var temps = [{selector:'#maintab', filename:'listall.htm'},
						 {selector:'#theschemes', filename:'eachtab.htm'}
						];
			env.respond(req, res, env.basetemps, temps, all_objs);
		});
	});


	env.app.get("/:table", requiresLogin, function(req, res, next){
		var app;
		if (req.params.table.indexOf('.') > 0)
			next(); // not really a table name, prolly favicon.ico ...
		else {
			if (req.session.user.login == 'admin' && req.params.table == 'admin')
				app = 'admin';
			else app = env.targetapp;
			Fields.find({ appname : app, table : req.params.table})
				.sort('listorder', 1).run(function(err, docs) {
					if (err) throw err;
					_.each(docs, function(d) { delete d.appname; delete d.table; });
					env.respond(req, res, null, null, docs);
				});
		}
	});

	env.app.get("/:table/list/:skip", requiresLogin, onlyAdminCanAdminAdmin, function(req, res, next){
			req.params.theTable.find({}).limit(20).skip(req.params.skip).run(function(err, docs) {
					if (err) throw err;
					env.respond(req, res, null, null, docs);
				});
	});

	env.app.get("/:table/list/:skip/:field/:order", requiresLogin, onlyAdminCanAdminAdmin, function(req, res, next){
			req.params.theTable.find({}).limit(20).skip(req.params.skip)
				.sort(req.params.field, req.params.order == 'asc' ? 1 : -1)
				.run(function(err, docs) {
					if (err) throw err;
					env.respond(req, res, null, null, docs);
				});
	});

	env.app.post("/add_to/:table", requiresLogin, onlyAdminCanAdminAdmin, function(req, res, next){
		var o = JSON.parse(req.body.obj);
		if (req.params.table == 'admin')
			o.appname = env.targetapp;
		new req.params.theTable(o).save(function(err){
			if (err) {
				// if it is a validation error, send something sensible back to the client...
				throw err;
			}
			res.send('OK');	
		});
	});

	env.app.post("/update/:table", requiresLogin, onlyAdminCanAdminAdmin, function(req, res, next){
		var id = req.body.id;
		var o = JSON.parse(req.body.obj);
		req.params.theTable.update({_id:id}, o, function(err){
			if (err) {
				// if it is a validation error, send something sensible back to the client...
				throw err;
			}
			res.send('OK');	
		});
	});

	env.app.post("/remove_from/:table", requiresLogin, onlyAdminCanAdminAdmin, function(req, res, next){
		var ids = JSON.parse(req.body.id_array);
/*
		for (i=ids.length-1; i>=0; i--)
			req.params.theTable.remove({_id:ids[i]}, function(err, docs){
				if (err) throw err;
			});
*/
console.log(ids.length);
for (i=ids.length-1; i>=0; i--)
	console.log(ids[i]);

		req.params.theTable.remove({_id:{$in:ids}}, function(err, docs){
				if (err) {
					console.log('error');
					throw err;
				} else {
					console.log('ok ' + docs.length);
				}
			});

		res.send('OK');	
	});


	env.app.post('/update_config/:table', requiresLogin, function(req,res) {
		if (req.session.user.login == 'admin') {
			var thislist = JSON.parse(req.body.list);
			_.each(thislist, function(item) {
				var id=item._id;
				delete item._id;
				Fields.update({_id:id}, item, function(err,docs){
					if (err) throw err;
				});
			});
			res.send('OK');	
		} else {
			console.log('authorisation error for user :');
			console.log(req.session.user);
		}
	});


	env.app.get('/sessions/new', function(req,res) {
		var temps = [{selector:'#maintab', filename:'login.htm'}
				];
		env.respond(req, res, env.basetemps, temps, null);
	});

	env.app.post('/sessions', function(req,res) {
		authenticate(req.body.login, req.body.password, env.targetapp, function(user){
			if (user) {
				req.session.user = user;
				res.redirect('/list');
			} else {
				res.redirect('/sessions/new');
			}
		});
	});

	env.app.post('/session/end', function(req,res) {
		req.session.user = null;
		res.redirect('/sessions/new');
	});

	env.app.post('/upload/:where', requiresLogin, function(req,res) {
		var topath = process.cwd() + '/apps/static/public/' + env.targetapp + '/' + req.param('subdir') + '/';
		var frompath = '/tmp/' + req.params.where + '_';
		var filename = req.headers['x-file-name'];

		var filestream = new fs.WriteStream(frompath + filename);
		req.addListener('data', function(buff) { 
			filestream.write(buff);
		}); 
		req.addListener('end', function() { 
			filestream.end();
			finishFileLoad(frompath + filename, topath + filename, 0, res);
	   }); 
	});

	return env;
};

