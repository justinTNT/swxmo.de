/* 
 * this ugly script compiles the plugins.js file for the specified app. 
 * We do this programmatically (rather than just cat-ing the libs) because we also
 * create a JSON string from all the skeletal templates (non-base plates)
 * to these, we also add the browser bootstrap, the core libraries (jq + sammy)
 * and the common code from swxmode.js
 *
 * this ugly script creates a plugins.js file in the browser directory of the app.
 * For production, cat plugins and script, then minify to create a single compiled .js
 */

var	mongoose = require('mongoose');

var appdb, admdb = mongoose.createConnection('mongodb://localhost/swxmodeadmin');
var	adminschema = require('./admin/schema/admin');
var	Admins = admdb.model('swxAdm');
var	AdminFields = admdb.model('SWXadmFields');

var	fs = require('fs');
var	ofd;

var	appname, appdir;



function writeStr2File(str) {
	fs.writeSync(ofd, str, null);
}


/*
 * clears admin config for this table / for this app
 */
function wipeAdFields(app, tab, cb) {
	AdminFields.remove({'appname':app, 'table':tab}, function(err, docs) {
		if (err) {
			console.log('error wiping ' + app + '\'s ' + tab + 'table.');
			throw err;
		}
		cb();
	});
}


/*
 * adds a field on this table for this app in the admin database,
 * (after making sure that it doesn't already exist!)
 * and sets default values for this field's admin configuration
 */
function addAdField(app, tab, key, cnt, cb) {
	AdminFields.find({'appname':app, 'table':tab, 'name':key}, function(err, docs) {
		if (err) {
			console.log('error checking in on key ' + key + ' in ' + app + '\'s ' + tab + 'table.');
			throw err;
		}
		if (! docs.length) {
			thisfield = new AdminFields();
			thisfield.name = key;
			thisfield.appname = app;
			thisfield.table = tab;
			thisfield.listorder = thisfield.editorder = cnt++;
			thisfield.save(function(err){
				if (err) {
	console.log('ERROR adding ' + key + ' in ' + tab + ' for ' + app);
	console.log(err);
					throw err;
				}
				cb();
			});
		}
	});
}

function addFields(app, tab, fields, cnt, cb) {
	if (fields.length) {
		cnt++;
		nf = fields.shift();
		addAdField(app, tab, nf, cnt, function(){ addFields(app, tab, fields, cnt, cb); });
	} else cb();
}


/*
 * iterates throught the list of schema files,
 * already derived from the schema directory
 */
function load_schema (dirname, filename, cb) {
	modelname = require(dirname + '/' + filename);
	thech = modelname;

	thech=thech.schema.tree;
	filename = filename.substr(0, filename.indexOf('.'));

	// if wipe ? later on we might only want to add fields ...
	wipeAdFields(appname, filename, function() {
		var fields = [];
		for (key in thech)
			fields.push(key);
		addFields(appname, filename, fields, 0, cb);
	});
}


/*
 * reads contents of named file from specified directory,
 * and returns the contents (as a string) to the callback
 */
function read_file(dname, fname, cback) {
	fs.readFile(dname + '/' + fname, function (err, data) {	// read in the file contents
		if (err) {
			console.log(err);	// debug
			console.log(dname + '/' + fname);	// debug
			throw err;
		}
		cback(fname, String(data));
	});
}

/*
 * for a list of files already derived from the named directory,
 * iterate through the list, calling cb with the contents of each file,
 * then calling fcb once they're all processed
 */
function eachfile(dirname, files, cb, fcb) {
	fn = files.shift();
	if (fn) {
		read_file(dirname, fn, function(cbfname, text) {
			cb(cbfname, text);
			eachfile(dirname, files, cb, fcb);
		});
	} else if (fcb) fcb();
}

/*
 * similar : for a list of files already derived from the named directory,
 * iterate through the list, calling cb with the name of each file,
 * then calling fcb once they're all processed
 */
function touch_file(dirname, files, cb, fcb) {
	fn = files.shift();
	if (fn) {
		cb(fn);
		touch_file(dirname, files, cb, fcb);
	} else if (fcb) fcb();
}

/*
 * get the list of files found in the named directory,
 * and pass on for processing.
 * cb is passed the contents of each file,
 * fcb is called when we're all done
 */
function read_dir (dirname, cb, fcb) {
	fs.readdir(dirname, function(err, files){
		if (err) {
			console.log('failed to read : ' + dirname);
			throw err;
		}
		eachfile(dirname, files, cb, fcb);
	});
}

/*
 * similar : get the list of files found in the named directory,
 * and pass on for processing.
 * cb is passed the name of each file,
 * fcb is called when we're all done
 */
function touch_dir (dirname, cb) {
	fs.readdir(dirname, function(err, files){
		if (err) {
			console.log('failed to read : ' + dirname);
			throw err;
		}
		touch_file(dirname, files, cb);
	});
}




/*
 * once we get access control / authentication / session management going,
 * we want to be sure there's an admin user setup for this app.
 */
function ensureAdminAccess(cb) {
	Admins.find({'appname':appname}, function(err, docs) {
		if (err) throw err;
		if (! docs.length) {
			var thisadm = new Admins();
			thisadm.login = thisadm.passwd = thisadm.name = 'admin';
			thisadm.appname = appname;

			thisadm.save(function(err){
				if (err) {
	console.log('ERROR creating default admin for ' + appname);
	console.log(err);
					throw err;
				} else {
					if (cb) cb();
					else {
						appdb.disconnect();
					}
				}
			});
		} else cb();
	});
}


/*
 * make sure we have default field entries in the database for each schema in this app.
 * while testing, default behaviour is to clear all entries and rebuild.
 * TTD: we might want to take command line parameters to specify to only add fields for those schema not already there
 */
function ensureAdFieldCfg(cb) {
	var dn = appdir + '/schema';
	touch_dir(dn,
		function(fn){
			load_schema(dn, fn, function(){
				if (cb) cb();
				else {
					appdb.close();
					if (admdb != appdb)
						admdb.close();
				}
			});
		});
}


appname=process.argv[2];
if (!appname) {
	console.log('usage: node build.js <appname>');
	return;
}


/*
 * this object holds all the skeleta for this app
 */

var globswxmodeskeleta = {};


/*
 * set the working directory for this app
 * note this same build is also used to give us the admin -
 * but don't rebuild admin unless you're sure of what you're doing!
 *
 * Note:
 * it's tempting, but too dangerous, to allow for appname /ALL/.
 * I'd rather have a separate shell script call build multiple times
 * than risk losing admin cfg and browser script compression
 * that might have been done since the last build (for production)
 */

appdir = __dirname;
if (appname == 'admin')
	appdir += '/admin';
else appdir += '/../apps/' + appname;

ofd = fs.openSync(appdir + '/browser/plugins.js', 'w');


/*
 * this call builds the javascript file for the browser
 * TODO: send to a file rather than console
 * (come back with a good flow control library to tidy this up)
 */

read_dir(appdir + '/templates/skeleta',
	function(fn, txt) {
		txt = txt.replace(/[\t\n]/g, ' ');
		txt = txt.replace(/'/g, "\\'");
		globswxmodeskeleta[fn] = txt;
	},
	function(){
		var libd = __dirname+'/browserlibs';
		var jqd = __dirname+'/jquery';
		fs.readdir(jqd, function(err, files){
			if (err) {
				throw err;
			}
			eachfile(jqd, files
					, function(fn, str) { writeStr2File(str); }
					, function(){

				fs.readdir(libd, function(err, files) {
					if (err) {
						throw err;
					}
					eachfile(libd, files
							, function(fn, str){ writeStr2File(str); }
							, function(){
								txt = JSON.stringify(globswxmodeskeleta);
								txt = txt.replace(/\\\\\'/g, "\\'");
								writeStr2File("var swxmodeskeleta = JSON.parse(\'" + txt + "\');");
								read_dir(appdir + '/browser/libs',
									function(fn, str){
										writeStr2File(str);
									},
									function(){
										eachfile(__dirname, ["swxmode.js", "browserbootstrap.js", ],
											function(fn, str){
												writeStr2File(str);
											}, function(){
												fs.close(ofd);
											});
									});
					});
				});

			});
		});
	});


/*
 * this section makes sure we have a super admin user in the database for this app
 * then (on callback) sets up the default admin layout for all the fields,
 */

	if (appname == 'admin') {
		appdb = admdb;
		ensureAdFieldCfg();
	} else {
		appdb = mongoose.createConnection('mongodb://localhost/' + appname);
		ensureAdminAccess(ensureAdFieldCfg);
	}
