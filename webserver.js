
var wserver = require('./swxmo/wserver');


// if you're running in production, set the IP address, cos you might have, or upgrade to, multiple IP#s.
// Assuming that your development environment has not, you can leave this undefined there.
//
var ip;


// this 'secret' password is put in the stream of proxy names.
var clandestine="You'll>never<guess,";


// apps served from this server:
// map domain names to app names.

var apps = [	{ dname:'sub.host.tld', appname:'static' }
			  , { dname:'hostname.tld', appname:'example' }
	];


// webserver entry point.
// default values, pull in Command Line Arguments
// start webserver, then start proxy (one of server/ client)

var server_port=80;	// default http
var proxy_port=6780; 
var proxy_name='';
var proxies = [];

for (i=2; n=process.argv[i]; i++)
        if (p=parseInt(n, 10)) {
                if (server_port == 80)
                        server_port = p;
                else proxy_port = p;
        } else {
		if (n == 'help' || n == '-h' || n == '--help') {
console.log('USAGE:');
console.log('dev: webserver [altport] [proxyname [proxyport] [ hostname1, hostname2, ... ]]');
console.log('prod: webserver [altport [proxyport]]');
console.log('altport- alternative port for serving http');
console.log('proxyname- address of a remote webserver that will proxy-serv local apps');
console.log('proxyport- portnumber used for proxy client/server comms');
console.log('hostnames- list of hostnames served by proxy');
			return false;
		}
                if (! proxy_name.length)
                        proxy_name = n;
                else proxies.push(n);
        }

if (proxy_name.length)
        wserver.getProxy(proxy_name, proxy_port, clandestine, proxies);
else wserver.setProxy(proxy_port, ip);

wserver.setupServer(server_port, apps, ip);

