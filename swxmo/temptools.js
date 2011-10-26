var fs = require('fs');
var swxmo = require('./swxmode');




function impTmp(dname, fname, cback) {
	fs.readFile(dname + '/' + fname, function (err, data) {	//read in the file contents
		if (err) {
			throw err;
		}
		cback(fname, String(data));
	});
}


/*
 * populatipi - populate the app env's templatipi template array
 * 		from the contents of all /.*\.html?/ files in the specified directory
 * ----------
 *  e: the environment object for the app we're currently populating
 *  dirname : the directory to load all templates from
 */
function populatipi (e, dirname) {
	fs.readdir(dirname, function(err, files){			// get list of files in templates dir
		if (err) {
 console.log('ERROR : reading ' + dirname);
			throw err;
		}
		while (fn = files.shift()) {					// pull off each dir entry
			if (/.*\.html?/.test(fn) || /.*\.tpl?/.test(fn)) {				// if its .htm or .html or .tpl
				path = dirname + '/' + fn;
				impTmp(dirname, fn, function(cbfn, text){
					e.templatipi[cbfn] = text;	// and keep em in the templatipi store
				});
			}
		}
	});
}


/*
 * configureTemplates - load templates and hook into the weld
 */
function configureTemplates(e) {

	e.templatipi = {};						// start with an empty templatipi object
	impTmp(__dirname, 'boilerplate.tpl', function(cbfn, data){	// read the boilerplate,
		e.templatipi[cbfn] = String(data).replace(/\{\{APP\}\}/g, e.appname)
					.replace(/\{\{STATIC\}\}/g, "http://" + e.staticurl + "/");
		populatipi(e, e.dir + '/templates/baseplates');		// load all base- templates into memory
		populatipi(e, e.dir + '/templates/skeleta');		// load all skeleta into memory
	});

	e.respond = function(){							// respond calls the basic welder with this env.
			var args = [this.templatipi];
			for (i=0; i<arguments.length; i++)
				args.push(arguments[i]);
			swxmo.respond.apply(this, args);
		};

}


exports.configureTemplates = configureTemplates;
