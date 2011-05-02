
var fs=require('fs')
 , jsdom = require('jsdom')
 , myWindow = jsdom.jsdom().createWindow()
 , $ = require('jquery').create(myWindow);

var mongoose = require('mongoose'); // needed for forEach



/*
 * findFields
 * ==========
 * helper function to extract field names from either
 * a) the schema; or
 * b) a list of simple strings, and optional objects matching fieldname keys to selector.property values
 */
function findFields(fields) {
var len=fields.length;
var just_fields = [];

	if (len) { // its a list
		for (var i=0; i<len; i++) {
			f = fields[i];
			if (typeof(f) == "string") // just a fieldname
				just_fields.push(f);
			else for (key in f) // an object mapping fieldname keys to selector.property values
				just_fields.push(key);
		}
	} else { // its the schema
		for (key in fields)
			just_fields.push(key);
	}

	return just_fields;
}


function translateFields(d, fields) {
var objs=[];

	d.forEach(function(eachd){
		var len=fields.length;
		var next_obj={};

		if (len) {
			for (var i=0; i<len; i++) {
				next_field = fields[i];
				if (typeof(next_field) == "string")
					next_obj[next_field] = eachd[next_field];
				else for (key in next_field)
					next_obj[next_field[key]] = eachd[key];
			}
		} else {
			for (key in fields)
				if (typeof eachd[key] != "undefined")
					next_obj[key] = eachd[key];
		}

		objs.push(next_obj);
	});

	return objs;
}


/*
 * weld data to an item
 * ====================
 * dat : the data
 * selection : the item
 */
function weldItem (env, dat, selection) {
	for (keyatt in dat) {
	var tmpa = keyatt.split('.')
	 ,  key = tmpa[0]
	 ,  attrib = tmpa[1]
	 ,  $item;
		if (selection.hasClass(key) || selection.attr('id') == key)
			$item = selection;
		else {
			$item = selection.find("#" + key);
			if (! $item.length) $item = selection.find("." + key);
		}
		if ($item.length) {
			var str = dat[keyatt].replace(/\{\{APP\}\}/g, env.appname)
								.replace(/\{\{STATIC\}\}/g, "http://" + env.staticurl + "/");
			if (attrib) {
				$item.attr(attrib, str);
			} else $item.html(str);
		}
	}
	selection.addClass('item_welded_on');
}

/*
 * weld a list of data to templates
 * ================================
 * templates - the list of templates to do the work in
 * objects : list of objects, with elements like  { selector.attribute: 'databasevalue' }
 * data - the DOM document we're building
 * sendEmOff - callback function. Give it everything but the <html> tag.
 */
function weldTemps(env, templates, objects, data, sendEmOff) {
	if (templates.length < 1) {
		sendEmOff(data[0].innerHTML.substr(6));
	} else {
		var select = templates.pop().selector;
		var $selected = data.find(select);
		if (! $selected.length) throw "bad selector " + select;

		for (var sel in objects) {
			var dat=objects[sel]
			 ,  l=dat.length
			 ,  $s;

			if (l) {
				$s = data.find("."+sel)
				if (! $s.length) throw "bad array selector " + sel + " in template " + select;
				$s = $s.not('.item_welded_on');
				if ($s.length) {
					var $thisone, $replacement;
					for (var i=0; i<l; i++) {
						if (i) $thisone = $replacement.clone();
						else $thisone = $s;
						weldItem(env, dat[i], $thisone);
						if (i) {
							tn = String($thisone.get(0).tagName);
							tn = tn.toUpperCase();
							$replacement.after($thisone);
						}
						$replacement = $thisone;
					}
				}
			} else {
				$s = data.find("#"+sel);
				if (! $s.length) $s = data.find("."+sel);
				if (! $s.length) throw "bad selector " + sel + " in template " + select;
				$s = $s.not('.item_welded_on');
				if ($s.length) weldItem(env, dat, $s);
			}

		}

		weldTemps(env, templates, objects, data, sendEmOff);
	}
}


/*
 * load templates
 * ==============
 * this function has two roles :
 *  with three arguments, it'll build a new DOM document from the template
 *  with a the fourth argument, it will add templates to the existing DOM document
 * env : certain vital handles
 * templates : list of templates
 * weldFunc : callback.
 * data : the DOM document we're building, or undefined to begin a new one
 * header_text : pass along the header to add to the populated template
 */
function loadTemps(env, templates, weldFunc, data, header_text) {
	if (! data) {
		fs.readFile(__dirname + '/boilerplate.tpl', function (err, filedata) {
			if (err) throw err;
			data = $('<html>');
			str = String(filedata).replace(/\{\{APP\}\}/g, env.appname);
			str = str.replace(/\{\{STATIC\}\}/g, "http://" + env.staticurl + "/");
			data[0].innerHTML = "<html>"+str.substr(str.indexOf("</head>")+7);
			header_text = str.substr(0, str.indexOf("</head>")+7);
			loadTemps(env, templates, weldFunc, data, header_text);
		});
	} else if (templates.length < 1) {
		weldFunc(data, header_text);
	} else {
		var next_template = templates.shift();
		fs.readFile(__dirname + '/../apps/' + env.appname + '/templates/' + next_template.filename, function (err, moredata) {
			if (err) throw err;

			var $selected = data.find(next_template.selector);
			if (! $selected.length) throw "bad selector " + next_template.selector;

			$selected.each( function(){ $(this).html(String(moredata)); } );
			loadTemps(env, templates, weldFunc, data, header_text);
		});
	}
}


/*
 * build response from templates and objects
 * =========================================
 * either sends objects + template list to client or builds DOM document from templates
 * env : certain vital handles
 * base_tpls : list of templates immediately applied to boilerplate
 * tpls : list of templates sent to xhr client
 * objs : list of objects, with elements like  { selector.attribute: 'databasevalue' }
 */
function swxRespond(env, request, response, base_tpls, tpls, objs) {
	if (request.isXHR) {
		response.send({ objects:objs, templates:tpls });
	} else {
		loadTemps(env, base_tpls.slice(0), function(data, headtext) {
			if (!tpls) tpls = [];
			loadTemps(env, tpls.slice(0), function(data) {
				weldTemps(env, tpls.slice(0), objs, data, function(responsetxt) {
					response.send(headtext + responsetxt);
				});
			}, data);
		});
	}
}

exports.respond = swxRespond;
exports.translateFields = translateFields;
exports.findFields = findFields;

