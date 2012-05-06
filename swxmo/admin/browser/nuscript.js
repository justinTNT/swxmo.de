add newclip to nowaste.org
add tailings story to rangerleaks.net


hardcode listpage to work with admin table too : if current user is admin
(need to hide and force appname)

hide _id from both display and +list

make resizable, draggable and field close + edit functions only visible to admin user


function deletem () {
	var ids2del = [];
	_.each($('jqo_list'), function(item){
		if (isChecked($item)) {
			$(item).addClass('shaded');
			removeCheck($(item));
			ids2del.push(getTheId($(item));	
		}
	}
	ajax.post('/'+model+'/delete', jqo_list);
}


drawFieldBox() {
	draw a div with width from $i['_id'].editwidth,
	.resizable(save new width to $['_id'].editwidth)

	for each field in the model
		if field is edited
			drawTheField (width 100% to fill resizable parent div, height from fieldtype ...)
			drawAcloseButtontheField - you know how it behaves
			make it draggable vertically : with a helper that extends right across the page
				and with the new order saved in field.editorder
			when text is doubleClicked {
				convert text to edit box
				force focus
				if field changes {
					write new label name to field in list
					convert edit box back to textbox
				}
				otherwise, when lose focus {
					convert edit box back to textbox
				}
			}
}


function drawValueBox($i) {
	for each field in the model, sorted by field.editorder
		if field is edited {
			if (_.isDefined($i)) {
				copy value from item $i;
				draw field as text per field.editwidth
				onMouseOver {
				       	convert this field to an input
				} onMouseOut {
					if (only this field is an input)
						convertthisFieldToText();
				}
			} else {
				draw field as input per field.editwidth
			}
			set handler on input changed {
				hide InstaceDelete button;
				if (_.isDefined($i))
					if (only this field is an input)
						convertAllFieldstoinputs();
				if (validate(field)) {
					if (form is valid) {
						display InstanceSave button
						when InstanceSave is clicked {
							if (_.isDefined($i)) {
								ajax.post('/'+model+'/update', form);
								updateListedValues(form);
							} else {
								ajax.post('/'+model+'/update', form);
								loadData(0)
							}
							scrollDownInstancePage();
							fadeInListPage(); // on top
						}
					}
				} else {
					drawnField.addClass('invalid');
					hide InstaceSave button;
				}

			}
			make each inputbox resizable
		}
}


function drawInstancePage($i) {
	fadeoutListPage();
	drawFieldBox();
	drawValueBox($i);
	drawCancelButton
	when CancelButton is clicked {
		scrollDownInstancePage();
		fadeInListPage(); // on top
	}
	if (_.isDefined($i)) {
		drawDeleteButton();
		when deleteButton is clicked {
			ajax.post('/'+model+'/delete', [ $i ]);
			scrollDownInstancePage();
			fadeInListPage(); // on top
		}
	}

	scrollUpInstancePage();
}


function editThis($item) {
	drawInstancePage($item);
}


function addThis() {
	drawInstancePage();
}




function callBefore(route, from, to) {

	alert('ADMIN DEBUG : got route ' + route);
	if (!to) {
		alert('not even gonna try to deal with it just yet');
	}
	return false;	// otherwise, swxmo will do the welding for us.
}

function callAfter(route) {
}

mysammyinstance = swxmoUpdate(callBefore, callAfter);

