var	os = require('os')
 ,	express = require('express')
;

module.exports = function(e) {

var xprts = {};

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


	xprts.setRoutes = function() {
		require('./admin_routes.js')(env, e);
	};

	xprts.env = env;

	return xprts;
};

