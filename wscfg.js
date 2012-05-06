var options = {};


// if you're running in production, set the IP address, cos you might have, or upgrade to, multiple IP#s.
// Assuming that your development environment has not, you can leave this undefined there.
//
//options.ip = 'prolly not required in dev';


// this 'secret' password is put in the stream of proxy names.
options.clandestine="You'll>never<guess,";


// apps served from this server:
// map domain names to app names.

options.apps = [	{ dname:'la.rrak.in', appname:'static' }
				  , { dname:'larrak.in', appname:'larrakia' }
	];


// webserver entry point.
// default values, pull in Command Line Arguments
// start webserver, then start proxy (one of server/ client)

options.server_port=80;	// default http
options.proxy_port=6780; 
options.proxy_name='larak.in';
options.proxies = [ 'la.rrak.in', 'larrak.in' ];


exports.options = options;

