
var net = require('net');
var http = require('http');
var express = require('express');
var swxmo = require('./swxmode');

var webserver_app;
var proxies = {};


function NotFound(msg){
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}
NotFound.prototype.__proto__ = Error.prototype;


function setupServer(port, applist, ip) {
var webserver_app = express.createServer();

	for (var l=applist.length-1; l>=0; l--) {
		var eachapp = require('../apps/' + applist[l].appname + '/' + applist[l].appname + '_app.js');
		var e=eachapp.env;
		if (e) {
			e.appname = applist[l].appname;
			e.findFields = swxmo.findFields;
			e.translateFields = swxmo.translateFields;
			e.respond = function(){
					var args = [this];
					for (i=0; i<arguments.length; i++)
						args.push(arguments[i]);
					swxmo.respond.apply(this, args);
				};
			eachapp.app = e.app;
		}
		applist[l].app = eachapp.app;
		webserver_app.use(express.vhost(applist[l].dname, applist[l].app));
  	}

  webserver_app.use(express.logger());
  webserver_app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

	/*
	// see above, we .use vhosts for all matching apps.
	// if we match in this catch-all, its cos the host is not one we're serving.
	// either it's one we're proxying for, or it's a mystery host ...
	*/
	webserver_app.all('*', function(req, res){
		if (proxies) {
			if (p = proxies[req.header('Host')]) {
				var proxy = http.createClient(80, p);
				proxy.addListener('error', function() {
					console.log('Proxy connection failed');
					proxies[req.header('Host')] = undefined;
				});

				var proxy_request = proxy.request(req.method, req.url, req.headers);
				proxy_request.addListener('response', function (proxy_response) {
					proxy_response.addListener('data', function(chunk) {
						res.write(chunk, 'binary');
					});
					proxy_response.addListener('end', function() {
	 console.log('passing ' + req.url + ' request for ' + req.header('Host') + ' via proxy.');
						res.end();
					});
					proxy_response.addListener('error', function(e) {
	console.log('proxy_response error');
	console.log(e);
	console.log(proxy_response);
						res.end();
					});
					res.writeHead(proxy_response.statusCode, proxy_response.headers);
				});
				req.addListener('data', function(chunk) {
					proxy_request.write(chunk, 'binary');
				});
				req.addListener('end', function() {
	 console.log('PASSING ' + req.url + ' request for ' + req.header('Host') + ' via proxy.');
					proxy_request.end();
				});
				req.addListener('error', function(e) {
	console.log('req error');
	console.log(e);
	console.log(req);
					proxy_request.end();
				});

				return;
			}
		}

/*
 * note: see that return above? that's when we found a proxy to send it to.
 *       if we got down this far, its cos we have an un-handled request.
 *       not worth dying over, but probably worth logging ...
 *
 *       Psst: this is ugly, just for debugging.
 *             so serve prettier errors deeper down ...
 */
	if (req.headers.connection != 'keep-alive') {
console.log('also seen: ' + JSON.stringify(req.headers));
	}

	});

	console.log('listening to ' + (ip?ip:'localhost') + ' on ' + port);
	webserver_app.listen(port, ip);
}


function getProxy(name, port, clandestine, proxies) {
	// connect to name:port, to let the proxy server know where we are
	var c = net.createConnection(port, name);
	c.on('connect', function(s){
		console.log('connected to proxy server at ' + name + ':' + port);
		for (i=proxies.length-1; i>=0; i--) {
			c.write(proxies[i] + ' ');
		}
		c.write(clandestine);
	});
	c.on('end', function(e){
		console.log('connection to proxy server ended.');
		c.end();
	});
	c.on('error', function(e){
		console.log('connection to proxy server failed.');
		throw e;
	});
}

function setProxy(port, ip) {
	proxies = [];
	// listen to port.
	// when someone connects, match their IP to the nominated list of hosts to serve for them
	// so that anything that comes to a vhost can be sent back to them as required
   	net.createServer(function(s){
		console.log('creating proxy server');
		remote_ip = s.remoteAddress;
		s.on('data', function(d){
			var i,l, aStr=String(d).split(' ');

			for (i=0, l=aStr.length; i<l; i++)
				if (aStr[i] == clandestine) {
					for (d in prollyproxy) {
						proxies[d] = prollyproxy[d];
						console.log('authorised redirecting : ' + d + ' to ' + proxies[d]);
					}
					s.end();
				} else if (aStr[i].length) {
					console.log('redirection requested for : ' + aStr[i] + ' to ' + remote_ip);
					prollyproxy[aStr[i]] = remote_ip;
				}
		});
		s.on('error', function(e){
			console.log('proxy read error!');
		});
	}).listen(port, ip);
}


exports.setupServer = setupServer
exports.setProxy = setProxy
exports.getProxy = getProxy

exports.server = webserver_app;

