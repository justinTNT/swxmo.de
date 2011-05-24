
if (typeof $ == 'undefined') {
var jsdom = require('jsdom')
  , myWindow = jsdom.jsdom().createWindow()
  $ = require('jquery').create(myWindow);
  _ = require('underscore');
}


/*
 * weld data to an item
 * ====================
 * dat : the data
 * selection : the item
 */
function weldItem (dat, selection) {
	for (keyatt in dat) {
	var tmpa = keyatt.split('.')
	 ,  key = tmpa[0]
	 ,  attrib = tmpa[1]		// recognises key.attribute
	 ,  styl = tmpa[2]		// recognises key..style or key.ignorethis.style
	 ,  $item;

		if (selection.hasClass(key) || selection.attr('id') == key)
			$item = selection;
		else {
			$item = selection.find("#" + key);
			if (! $item.length) $item = selection.find("." + key);
		}
		if ($item.length) {
			var str = dat[keyatt];
			if (styl) {
				tmpstyle = $item.attr('style') || "";
				$item.attr('style', styl + ':' + str + ';' + tmpstyle);
			} else if (attrib) $item.attr(attrib, str);
			else $item.html(str);
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
function weldTemps(templates, objects, data, sendEmOff) {
	if (templates.length < 1) {
		sendEmOff(data[0].innerHTML.substr(6));
	} else {
		var nt = templates.pop();
		var select = nt.selector;
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
					var $thisone=$s, $replacement;
					for (var i=0; i<l; i++) {
						if (i+1 < l) $replacement = $thisone.clone();
						weldItem(dat[i], $thisone);
						if (i) $s.append($thisone);
						$thisone = $replacement;
					}
				}
			} else {
				$s = data.find("#"+sel);
				if (! $s.length) $s = data.find("."+sel);
				if (! $s.length) throw "bad selector " + sel + " in template " + select;
				$s = $s.not('.item_welded_on');
				if ($s.length) weldItem(dat, $s);
			}

		}

		weldTemps(templates, objects, data, sendEmOff);
	}
}


/*
 * load templates
 * ==============
 * this function has two roles :
 *  with three arguments, it'll build a new DOM document from the template
 *  with a the fourth argument, it will add templates to the existing DOM document
 * envplates : all templates loaded for this app env
 * templates : list of templates
 * weldFunc : callback.
 * data : the DOM document we're building, or undefined to begin a new one
 * header_text : pass along the header to add to the populated template
 */
function loadTemps(envplates, templates, weldFunc, data, header_text) {
	if (! data) {
		data = $('<html>');
		str = envplates['boilerplate.tpl'];
		data[0].innerHTML = "<html>"+str.substr(str.indexOf("</head>")+7);
		header_text = str.substr(0, str.indexOf("</head>")+7);
	} else if (templates.length > 0) {
		var next_template = templates.shift();
		var $selected = data.find(next_template.selector);
		if (! $selected.length) throw "bad selector " + next_template.selector;
		$selected.each(function(){ $(this).html(envplates[next_template.filename]); });
	} else {
		return weldFunc(data, header_text);		// if there's no templates left, weld the data on
	}
	loadTemps(envplates, templates, weldFunc, data, header_text);	// won't happen if we're welding, cos that returns...
}




/*
 * build response from templates and objects
 * =========================================
 * either sends objects + template list to client or builds DOM document from templates
 *
 * envplates :	all templates loaded for this app env
 * objs :		list of objects, with elements like  { selector.attribute: 'databasevalue' }
 * base_tpls :	list of template names (hashing envplates)
 *				if it's not an ajax call, these are immediately applied to boilerplate
 * tpls :		list of (skeletal) template names (hashing envplates)
 *				if it's not an ajax call, these are embedded into the base 'plates.
 *				but, if it is ajah, we send this list of names,
 *					along with the objects that will be welded in them.
 *
 * now, sometimes we're not filling templates, we're just sending a list of objects via ajaj
 * in that case, there's only 4 arguments. otherwise, there's also:
 *
 */
function swxRespond(envplates, request, response, base_tpls, tpls, objs) {
	if (request.xhr) {
		if (tpls) response.send(JSON.stringify({ objects:objs, templates:tpls }));
		else response.send(JSON.stringify(objs));
	} else {
		loadTemps(envplates, base_tpls.slice(0), function(data, headtext) {
			if (!tpls) tpls = [];
			loadTemps(envplates, tpls.slice(0), function(data) {
				weldTemps(tpls.slice(0), objs, data, function(responsetxt) {
					response.send(headtext + responsetxt);
				});
			}, data);
		});
	}
}

if (!_.isUndefined(exports)) {
	exports.respond = swxRespond;
}

