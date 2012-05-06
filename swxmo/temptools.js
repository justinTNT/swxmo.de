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
 * for a list of files already derived from the named directory, iterate through the list
 * calling cb with the contents of each file that satisfies the match function,
 * then calling fcb once they're all processed
 */
function eachFile(dirname, files, match, cb, fcb) {
    var fn = files.shift();
	if (fn) {
		if (match(fn)) {				// if its .htm or .html or .tpl
			fs.readFile(dirname + '/' + fn, function (err, data) {	//read in the file contents
				if (err) {
					throw err;
				}
				cb(String(data), fn);
				eachFile(dirname, files, match, cb, fcb);
			});
		} else eachFile(dirname, files, match, cb, fcb);
	} else if (fcb) {
		fcb();
	}
}


function eachPlugDir (plugins, match, op, fcb) {
    var dirname
	, plugin = plugins.shift();

	if (typeof plugin != 'undefined') {

		dirname = __dirname + '/../common/' + plugin + '/browser';
		fs.readdir(dirname, function(err, files){			// get list of files in templates dir
			if (err) { throw err; }
			eachFile(dirname, files, match, op, function(){
				eachPlugDir(plugins, match, op, fcb);
			});
		});

	} else if (fcb) fcb();
}


/*
 * for any suffix (css, js) this will :
 * 1. read the app/browser/app.suffix file
 * 2. read any files from app/browser/suffix/ that match *.suffix
 * 3. read any files from the browser directories of the app's plugins that match suffix
 */
function genericDynamicLoadAppFiles(e, suffix, appendattr, fcb) {
	var re = new RegExp(".*\\." + suffix + "$");
	fs.readFile(e.dir + '/browser/' + e.appname + '.' + suffix, function (err, data) {
		if (err) { throw err; }
		e[appendattr] += String(data);
		fs.readdir(e.dir + '/browser/' + suffix + '/', function(err, files){			// get list of files in templates dir
			if (err) { throw err; }
			eachFile(e.dir + '/browser/' + suffix + '/', files
					, function(fn) { return (re.test(fn)); }
					, function(txt) { e[appendattr] += txt; }
					, function(){
						if (e.plugins) {
							eachPlugDir(e.plugins.slice(0)
									, function(fn) { return (re.test(fn)); }
									, function(txt) { e[appendattr] += txt; }
									, fcb);
						} else if (fcb) fcb();
					});
		});
	});
}

/*
 * populatipi - populate the app env's templatipi template array
 * 		from the contents of all /.*\.html?/ files in the specified directory
 * ----------
 *  e: the environment object for the app we're currently populating
 *  dirname : the directory to load all templates from
 */
function populatipi (e, dirname, whichplate, done) {
	fs.readdir(dirname, function(err, files){			// get list of files in templates dir
		if (err) {
			throw err;
		}
		eachFile(dirname, files,
				function(fn){ return (/.*\.html?$/.test(fn) || /.*\.tpl$/.test(fn)); },		// if its .htm or .html or .tpl
				function(txt, fn){			// pull off each dir entry
                    e[whichplate][fn] = String(txt)			// and keep em in the templatipi store
						.replace(/\{\{APP\}\}/g, e.appname)
						.replace(/\{\{STATIC\}\}/g, "http://" + e.staticurl + "/");
				}, done);
	});
}


/*
 * configureTemplates - load templates and hook into the weld
 */
function configureTemplates(e) {
var bpfn = 'boilerplate.tpl';

	e.templatipi = {};						// start with an empty templatipi object
    e.skeletipi = {};

	fs.readFile(__dirname + '/' + bpfn, function (err, data) {	//read in the file contents
		if (err) { throw err; }

		e.templatipi[bpfn] = String(data).replace(/\{\{APP\}\}/g, e.appname)
					.replace(/\{\{STATIC\}\}/g, "http://" + e.staticurl + "/");

        populatipi(e, e.dir + '/templates/baseplates', 'templatipi',    // load all base- templates into memory
			function(){ populatipi(e, e.dir + '/templates/skeleta', 'skeletipi',		// load all skeleta into memory
				function(){
				var txt;
					for (i in e.skeletipi) {
						txt = (e.templatipi[i] = e.skeletipi[i]);
						txt = txt.replace(/[\t\n\r]/g, ' ');
						e.skeletipi[i] = txt.replace(/'/g, "\\'");
					}
					txt = JSON.stringify(e.skeletipi);
					txt = txt.replace(/\\\\\'/g, "\\'");
					e.scriptplatestring = "var swxmodeskeleta = JSON.parse(\'" + txt + "\');\n\n";
					genericDynamicLoadAppFiles(e, "js", "scriptplatestring",
						function(){
							e.cssstring = "";
							genericDynamicLoadAppFiles(e, "css", "cssstring");
						});

				});
			});
	});


	e.respond = function(){							// respond calls the basic welder with this env.
			var args = [this.templatipi];
			for (i=0; i<arguments.length; i++)
				args.push(arguments[i]);
			swxmo.respond.apply(this, args);
		};
}


exports.configureTemplates = configureTemplates;
