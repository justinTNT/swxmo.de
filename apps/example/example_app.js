
var env = { staticurl:'subdomain.hostname.tld' };

var express = require('express');

env['app'] = express.createServer();

env.app.use(express.logger());
env.app.configure(function(){
});

env.basetemps = [ {selector:'#boilerplate-container', filename:'example.htm'} ];

env.app.get('/hello', function(req, res){
	res.send('hi there');
});

require('./ex_showem.js')(env);

env.app.get(/\//, function(req, res){
	env.respond(req, res, env.basetemps);
});

exports.env = env;

