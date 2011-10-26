
var mongoose = require('mongoose'); // needed for forEach

/*
 * findFields
 * ==========
 * helper function to extract field names from either
 * a) the schema; or
 * b) a list of simple strings, and optional objects matching fieldname keys to selector.property values
 */
function findFields(fields) {
var len;
var just_fields = [];

	if (fields) {
		len=fields.length;
		if (len) { // its a list
			for (var i=0; i<len; i++) {
				f = fields[i];
				if (_.isString(f)) // just a fieldname
					just_fields.push(f);
				else for (key in f) // an object mapping fieldname keys to selector.property values
					just_fields.push(key);
			}
		} else { // its the schema
			for (key in fields)
				just_fields.push(key);
		}
	}

	return just_fields;
}


/*
 * translateFields
 * ===============
 * helper function to extract field values. Two cases :
 * a) for each field in the schema; copy the field if it is defined
 * b) copy the field if it's a string, or rename it if its mapped in a { fieldname, 'selector[.attribute]' } tupple
 */
function translateFields(d, fields) {
var objs=[];

	d.forEach(function(eachd){
		var len=fields.length;
		var next_obj={};
		if (len) {
				
			for (var i=0; i<len; i++) {
				next_field = fields[i];
				if (_.isString(next_field)) {
					if (_.isString(eachd))
						next_obj[next_field] = eachd;
					else next_obj[next_field] = eachd[next_field];
				} else {
					for (key in next_field) {
						var v = next_field[key];
						if (_.isString(eachd))	// distinct queries just return strings
							next_obj[v] = eachd;
						else if (! _.isUndefined(eachd[key]))	// deref fieldname?
							next_obj[v] = eachd[key];
						else next_obj[v] = eachd.get(key);			// maybe it's virtual ...
					}
				}
			}
		} else {
			for (key in fields)
				if (! _.isUndefined(eachd[key])) {
					next_obj[key] = eachd[key];
				}
		}

		objs.push(next_obj);
	});

	return objs;
}

exports.translateFields = translateFields;
exports.findFields = findFields;

