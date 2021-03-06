
var admin_table_fields = null; // list of fields for the current schema
var admin_table_records = []; // list of loaded data for the current schema
var which_route = ''; // keeps track of which schema in which app we're werking on : leading slash
var adminflag = false; // superadmin?

var edit_flags = [ {name:'default', title:'Text'},
					{name:'textarea', title:'Text Area'},
					{name:'richtext', title:'Rich Text Editor'},
					{name:'upload', title:'File Upload'},
					{name:'date', title:'Date'}
				];


function showSave() {
	$('div#saveconfig').show();
}

function saveCfg() {
var i;
	for (i=0; i<admin_table_fields.length; i++)
		admin_table_fields[i].listorder = i;

	$.post('/update_config' + which_route, {list:JSON.stringify(admin_table_fields)}, function(){
		$('div#saveconfig').hide();
	});
}

function logOut() {
	if (! which_route.length) {
		location.href='/sessions/new';
	} else $.post('/session/end', function(){
		location.href='/';
	});
}

function delData() {
	var delarray = [];
	$allrs = $('div.admin_table_record');
	$('input.deleteme:checked').each(function(){
		var the_id = $(this).attr('id');
		the_id=the_id.substr(7);
		delarray.push(the_id);
	});

	$.post('/remove_from' + which_route, {id_array:JSON.stringify(delarray)}, function(){ 
		for (i=0; i<$allrs.length; i++) {
			var $nextrec = $($allrs[i]);
			if ($nextrec.find('input.deleteme').is(':checked')) {
				admin_table_records[i]['_id'] = null;
				$nextrec.addClass('already_deleted');
			}
		}
		$('input.deleteme:checked').remove();
		$('button#less').hide();
	});
}


function addInstance(o, wtf) {
	$.post('/add_to' + which_route, {obj:JSON.stringify(o)}, function(){ wtf(); return false; });
}
	
function updateInstance(id, o, wtf) {
	$.post('/update' + which_route, {id:id, obj:JSON.stringify(o)}, function(){ wtf(); return false; });
}
	

/*
 * when the list of fields being displayed is created, or added to
 * $f points to the dom obj for the fieldname
 * wtf takes a field object and 'closes' it
 */
function setupNewField($f, wtf) {

	$f.hover(function(){
				if ($('div.ui-resizable-resizing').length + $('div.ui-draggable-dragging').length == 0)
					$(this).find('.button-close').stop().animate({opacity:'1'}, 1234);
			}	// close button on hover
			,function(){ $(this).find('.button-close').stop().animate({opacity:'0'}, 123); })

	$f.find('.button-close').click(function(){											// remove column on close button
				var id = this.id.substr(6);
				var field = _.detect(admin_table_fields, function(f) { return f.name == id; });
				$(this).parent().remove();
				wtf(field);

				showSave();
				showPlusButt();
			});
}



//
// ITEM STUFF
// 

/*
 * this section of code is for all the item-based operations
 */

// is this redundant?
function deleThem () {
/*
	var ids2del = [];
	_.each($('jqo_list'), function(item){
		if (isChecked($item)) {
			$(item).addClass('shaded');
			removeCheck($(item));
			ids2del.push(getTheId($(item));	
		}
	}
	ajax.post('/'+model+'/delete', jqo_list);
*/
}


/*
 * file upload callbacks
 */
function uploadGood($who) {
	$who.css({color:'#284', backgroundColor:'#fff'});
}

function uploadProgress($who) {
	$who.css('backgroundColor', '#ffa');
}

function uploadBad($who) {
	$who.css('backgroundColor', '#fba');
}

function showAllInstanceFields () {
	_.each(admin_table_fields, function(field) {
		if (field.name != 'id' && field.name != '_id') {
			field.edited = true;
		}
	});
	showSave();
	drawInstancePage();
}

function setupNewInstanceField($f) {
	setupNewField($f, function(field){
		field.edited = false;
		$('input#input_' + field.name).parent().remove();	
	});
	$f.find(':first').bind('contextmenu', function(){
		showContextMenu($(this).parent().attr('id'));
		return false;
	});
}

function findInstanceFieldHeight(field) {
	if (field.editflags == 'textarea') {
		if (field.editheight) return field.editheight;
		return 124;
	} else if (field.editflags == 'upload') {
		return 54;
	} else if (field.editflags == 'richtext') {
		if (field.editheight) return field.editheight;
		return 334;
	}
	return 44; // default
}


/*
 * draws the box with the list of labels
 */
function drawFieldBox() {
	$('div.instancelabels').remove();
	var $fb = $('<div class="instancelabels"></div>');
	var sorted = _.sortBy(admin_table_fields, function(f) { return f.editorder; });
	_.each(sorted, function(field) {
		if (field.edited && field.name != 'id' && field.name != '_id') {
			$fb.append($('<div class="instancelabelholder" id="instance_' + field.name + '"><div class="instancelabel">' + field.name + '</div></div>'));
		}
	});

	var tmpw = 123, id4w = _.detect(admin_table_fields, function(f){ return f.name == '_id'; }).editwidth;
	if (id4w) tmpw = id4w.editwidth;
	if (tmpw < 123)
		tmpw = 123;
	$fb.width(tmpw);
	$('div#detailtab').append($fb);

	if (adminflag) {
		$('div.instancelabelholder').each(function(){
			var fieldname = $(this).attr('id');
			fieldname = fieldname.substr(fieldname.indexOf('_')+1);
			$(this).append('<div id="close-' + fieldname + '" class="button-close"></div>');
			setupNewInstanceField($(this));
		});


		setupPlusButt( $('div.instancelabels').append('<div class="plusbutt"></div>') ,showAllInstanceFields );

/*
 * the whole field box (the entire list of labels, not each label) is resizable
			minHeight:$(this).height(),
			maxHeight:$(this).height(),
 */
		$fb.resizable({
			handles:'e',
			minWidth:123,
			maxWidth:444,
			stop:function(e, ui) {
				_.detect(admin_table_fields, function(f){ return f.name == '_id'; }).editwidth = $(e.target).width();
				$(e.target).css({left:'',top:''}); // reset these styles, cos they mess with dragging ...
				showSave();
			}
		});

/*
 *		make each label draggable vertically :
 *		with a helper that extends right across the page
 *		and with the new order saved in field.editorder
 *		and the corresponding input moved accordingly.
 */
		$('div.instancelabelholder').draggable({
			axis:'y',
			helper:'clone',
			stack:'.instancelabelholder',
			start:function(e,ui) {
				$('.button-close').stop().animate({opacity:'0'}, 123);
				ui.helper.animate({ borderColor: "#EEE8D5" }, 'fast').css({backgroundColor:'#FDF6E3', zIndex:'123'});
			},
			stop:function(e,ui) {
				var newlist = [];
				var h = 0;
				var doneflag = false, changedflag = true;
				var movedf = _.detect(sorted, function(f){ return f.name == e.target.id.substr(e.target.id.indexOf('_')+1); });

				for (i=0; i<sorted.length; i++) {
					if (ui.position.top <= $(e.target).position().top) {
						if (!doneflag && ui.position.top <= h) {
							newlist.push(movedf);
							doneflag = true;
							if (sorted[i] == movedf)
								changedflag = false;
						}
						if (sorted[i] != movedf) {
							newlist.push(sorted[i]);
						}
						h += findInstanceFieldHeight(sorted[i]);
					} else {
						if (sorted[i] != movedf) {
							newlist.push(sorted[i]);
						}
						h += findInstanceFieldHeight(sorted[i]);
						if (!doneflag && ui.position.top <= h) {
							newlist.push(movedf);
							doneflag = true;
							if (sorted[i] == movedf)
								changedflag = false;
						}
					}
				}
				if (!doneflag)
					newlist.push(movedf);
				for (i=0; i<newlist.length; i++) {
					_.detect(admin_table_fields, function(f){ return f.name == newlist[i].name; }).editorder = i;
				}
				if (changedflag) {
					drawInstancePage();
				} else $('.ui-draggable-dragging').remove();
			}
		}).dblclick(function(){																// relabel on double-click
/*
			convert text to edit box
			if field changes {
				write new label name to field in list
				convert edit box back to textbox
			}
			otherwise, when lose focus {
				convert edit box back to textbox
			}
		}
 */
		});

	}

}


/*
 * returns true if the instance edit form is valid,
 * otherwise highlights the first invalid field
 */
function validateField($instanceInput) {

	var fn = $instanceInput.attr('id');
	if (!fn) return true; // no validation on things that don't have "instin_.." ids

	fn = fn.substr(7); // skip "instin_"
	var field = _.detect(admin_table_fields, function(f) { return f.name == fn; });

	if (false) {
		$(this).addClass('invalid_field');
		return false;
	}

	return true;
}

/*
 * returns true if the instance edit form field is valid,
 * otherwise highlights the field as invalid
 */
function validateForm() {
	$('div.instanceinput').each(function(){
		if (! validateField($(this)))
			return false;
	});
	return true;
}


/*
 * creates the list of files to display in chooser
 * files is a list of {name,date,size} objects
 * $where is the DOM object to append the list to
 * selected is a callback which takes the filename
 */
function addFiles(files, $where, selected) {
	for (i=0; i<files.length; i++) {
		$where.append($("<div class='file_list_file'> \
					<div class='filelist_name'>" + files[i].filelist_name + "</div> \
					<div class='filelist_size'>" + files[i].filelist_size + "</div> \
					<div class='filelist_date'>" + files[i].filelist_date.substr(0,files[i].filelist_date.indexOf('T')) + "</div> \
					</div>"));
	}

	$b.find('div.file_list_file').click(function(){
		selected($(this).find('div.filelist_name').text());
	}).hover(function(){
		$(this).animate({ backgroundColor: "#FDF6E3" }, 'fast');
	}, function(){
		$(this).animate({ backgroundColor: "#FFF" }, 'fast');
	});
}

/*
 * make file upload werk, with hidden input@file
 */
function makeUploadValueBox($newin, field)
{
	//
	// activate the browse button
	//
	$newin.find('input').click(function(){
		$whichin = $(this);
		$.ajax({
			url:'/browse' + which_route + '?subdir=' + field.uploadpath,
			cache:false,
			beforeSend:function(jqXHR, settings){
				settings['HTTP_X_REQUESTED_WITH'] = 'XMLHttpRequest';
			},
			success:function(ajaxdata, txtsts, jqXHR){
				var file_list = $.parseJSON(ajaxdata);
				if (file_list != null) {
					$m = $("<div class='modal_file_list'>");
					$t = $("<p class='title_file_list'>Select a file from the list, or "
 + "<input type='button' class='decoy' style='margin-top:1em;margin-bottom:1em' value='upload'/>"
 + "<input type='file' id='fileupload_" + field.name + "' name='fileupload_" + field.name + "' style='width:0px; height:0px;'/>"
 + " your own.</p>");
					$t.append("<div><div class='filelist_name'>Name</div> <div class='filelist_size'>Size</div> <div class='filelist_date'>Date</div></div>");
					$m.append($t);
					$m.append('<div id="file_list_close" class="button-close"></div>');
					$b = $("<div class='file_list_list'>");
					$m.append($b);
					$('body').append($m);

					$('div#file_list_close').click(function(){
						$m.remove();
					}).animate({opacity:'0.5'}, 1234)
					.hover(function(){ $(this).stop().animate({opacity:'1'}, 123); }
						  ,function(){ $(this).stop().animate({opacity:'0.5'}, 1234); })

					addFiles(file_list, $b, function(fn){
						$whichin.val(fn);
						$m.remove();
					});

					// sortable columns
					$t.find('div div').click(function(){
						var sortup=true;
						var new_list;
						var cname = $(this).attr('class');
						var jname = cname.substr(cname.indexOf('filelist_'));
						var i = jname.indexOf(' ');
						if (i>0) jname = jname.substr(0, i);
						if ($(this).hasClass('sortup')) {
							$(this).removeClass('sortup');
							sortup = false;
						} else $(this).addClass('sortup');
						new_list = file_list;
						new_list = _.sortBy(file_list, function(f) {
							if (!sortup) {
								if (jname == 'filelist_size') { // size is a number
									return -f[jname];
								} else {
									return _.map(f[jname].split(''), function(c){ return 0xffff - c.charCodeAt(); }); // _ reverse string sort!
								}
							} else {
								return f[jname];
							}
						});
						$b.html('');
						addFiles(new_list, $b, function(fn){
							$whichin.val(fn);
							$m.remove();
						});
					});

					// upload button
					$t.find('input.decoy').click(function(){
						$(this).next().click().change(function(){
							var fn = $(this).val();
							while ((i = fn.indexOf('\\')) >= 0)
								fn = fn.substr(i+1);
							while ((i = fn.indexOf('/')) >= 0)
								fn = fn.substr(i+1);
							$whichin.val(fn);

							var xhr2 = new XMLHttpRequest();
							var uri = '/upload' + which_route + '?subdir=' + field.uploadpath;
							xhr2.open('POST', uri, true);

							xhr2.upload.addEventListener('error', function(){ uploadBad($whichin); }, false);
							xhr2.upload.addEventListener('abort', function(){ uploadBad($whichin); }, false);
							xhr2.upload.addEventListener('progress', function(){ uploadProgress($whichin); }, false);
							xhr2.onload = function(e){
								if (xhr2.status != 200) alert('Error: ' + xhr2.status);
								$whichin.val(xhr2.getResponseHeader('final-filename')).addClass('altered');
								uploadGood($whichin);
								$m.remove();
							};

						xhr2.setRequestHeader("Cache-Control", "no-cache");
						xhr2.setRequestHeader("X-Requested-With", "XMLHttpRequest");
						xhr2.setRequestHeader("X-File-Name", fn);

							xhr2.send(this.files[0]);
							return false;
						});

						return false;
					});

				}
			},

			error:function(jqXHR, ststxt, err){
				/* alert('AJAX ERROR: ' +ststxt + ':' + err); */
			}
		});
		return false;
	});

}


function padStr(i) { return (i < 10) ? "0" + i : "" + i; }
function date2str(d) {
	if (d) {
		if (d && d.getMonth) { // good enuff test for Date?
			d = d.getFullYear() + '-' + padStr(1 + d.getMonth()) + '-' + padStr(d.getDate());
		} else if (d.length) {
			d = d.substr(0, d.indexOf('T'));
		}
	}
	return d;
}

//
// makes the value (data entry) input or widget for each field
//
function makeValueBox(field, $where, eto_i) {
var $newin;

	/* create input element */

	switch (field.editflags) {
		case 'textarea':
			$newin = $('<textarea rows="3" cols="64" name="' + field.name + '" id="input_' + field.name + '"></textarea>');
			break;

		case 'richtext':
			$newin = $('<textarea class="enrichme" name="' + field.name + '" id="input_' + field.name + '"></textarea>');
			break;

		case 'upload':
			if (! field.uploadpath)
				field.uploadpath='upload';
			$newin = $('<div class="uploadfields"><span class="uploadurl">...</span>&nbsp;/<span class="uploadpath">' + field.uploadpath + '</span>/&nbsp;'
					+ '<input type="text" name="' + field.name + '" id="input_' + field.name + '"></input>'
					+ '</div>');
			break;

		case 'date':
			$newin = $('<input type="text" name="' + field.name + '" id="input_' + field.name + '"></input>');
			break;

		default:
			$newin = $('<input type="text" name="' + field.name + '" id="input_' + field.name + '"></input>');
	}

	$where.append($newin);
	var h = findInstanceFieldHeight(field);
	$newin.add($where).height(h).width(field.editwidth);
	$('div#instance_' + field.name).height(h);

	/* setup validation handling */

	if (eto_i >= 0) {
		var $setthisone, valtoset;
		if (field.editflags == 'upload')
			$setthisone = $newin.find('input:first');
		else $setthisone = $newin;
		valtoset = admin_table_records[eto_i][field.name];

		if (field.editflags == 'date')
			valtoset = date2str(valtoset);

		$setthisone.val(valtoset);
	}

	$newin.width(field.editwidth);
	if (field.editflags != 'upload')
		$newin.find('input').width(field.editwidth);

	$newin.change(function(){
			$(this).addClass('altered');
			if (validateField($(this), eto_i)) {
				if (validateForm(eto_i)) {
					$('button#save').show();
				}
			} else {
				$('button#save').hide();
			}
		});

	/*
 	 * there's a lot of extra logic for file upload fields.
 	 * so let's break it out into a separate function
 	 */
	if (field.editflags == 'upload') 
		makeUploadValueBox($newin, field);
	else if (field.editflags == 'date') {
		$newin.datepicker({ dateFormat: 'yy-mm-dd', defaultDate: $newin.val() });
	}

	if (adminflag) { // some features only open to admin :

		/* maybe make it resizable */

		if (field.editflags == 'default' || field.editflags == 'textarea' || field.editflags == '') {
			$where.resizable({
					handles:'e',
					minWidth:44,
					maxWidth:1234,
					helper:'ghostedinput',
					stop:function(e, ui) {
						var $the_in = $(e.target).find('input').add($(e.target).find('textarea'));
						var id = $the_in.attr('id');
						id =  id.substr(id.indexOf('_')+1);
						$the_in.width(_.detect(admin_table_fields, function(f){ return f.name == id; }).editwidth = $(e.target).width());
						showSave(); // we might want to save any re-arrangement of the fields
					}
				});
		}

		if (field.editflags == 'upload') { // admin can change upload path
			$newin.find('span.uploadpath').css('color', "#9bd").click(function(){
				$("<input type='text' class='temp' value='" + $(this).text() + "'>").insertAfter($(this).hide()).focus().blur(function(){
					var $target = $(this).parent().find('span.uploadpath');
					if ($target.text() != $(this).val()) {
						var txt = $(this).val();
						while (txt.length && (txt.charAt(0) == '/'))
							txt = txt.substr(1, txt.length-1);
						while (txt.length && (txt.charAt(txt.length-1) == '/'))
							txt = txt.substr(0, txt.length-1);
						$target.text(txt);
						var id = $(this).parent().parent().attr('id');
						id =  id.substr(id.indexOf('_')+1);
						_.detect(admin_table_fields, function(f){ return f.name == id; }).uploadpath = txt;
						showSave(); // might want to save the new uploadpath
					}
					$target.show();
					$(this).remove();
				});
			});
		}
	}

	/* add widgets to elements */

	if ($newin.hasClass('enrichme')) {
		var cki = CKEDITOR.instances['input_' + field.name];
		if (cki) cki.destroy();
		$newin.ckeditor(function(){
									var spanid = this.container.$.id;
									var $instance = $('#'+spanid).parent();
									var h = $('#'+spanid).height();
									spanid = spanid.substr(spanid.indexOf('input_')+6);
									var field = _.detect(admin_table_fields, function(f) { return f.name == spanid; });
									if (field.editheight) {
										h = field.editheight;
										$('#'+spanid).height(h);
										this.resize(field.editwidth, field.editheight);
									}
									$instance.height(h);
									$('div#instance_'+spanid).height(h);
								}, {
									skin:'v2',
									filebrowserBrowseUrl : '/ck_browse',
									filebrowserUploadUrl : '/ck_upload',
								});
		cki = CKEDITOR.instances['input_' + field.name];
		if (cki) {
			cki.on('resize', function(e){
				var f_id = this.container.$.id;
				var i = f_id.indexOf('input_')+6;
				f_id = f_id.substr(i);
				var field = _.detect(admin_table_fields, function(f) { return f.name == f_id; });
				var w = $(e.editor.getResizable().$).width();
				var h = $(e.editor.getResizable().$).height();
				if (adminflag && (w != field.editwidth || h != field.editheight)) {
					field.editwidth = w;
					field.editheight = h;
					showSave();
				}
				$('div#instance_' + field.name).height(field.editheight);
				$('div#instin_' + field.name).height(field.editheight);

				e.editor.resetDirty();
				return false;
			});
		}
		$where.width('999px');
	}
}

function drawValueBox() {
var $vb = $('<div class="instanceinputs"></div>');
var $eto = $('.edit_this_one');
var eto_i = -1;

	$allrs = $('div.admin_table_record');
	if ($eto.length)
		for (i=0; i < $allrs.length; i++)
			if ($eto[0] == $allrs[i]) {
				eto_i = i;
				break;
			}
	$('div.instanceinputs').remove();
	$('div#detailtab').append($vb);
	var sorted = _.sortBy(admin_table_fields, function(f) { return f.editorder; });
	_.each(sorted, function(field) {
		if (field.edited && field.name != 'id' && field.name != '_id') {
			var $commontainer = $('<div class="instanceinput" id="instin_' + field.name + '"></div>');
			$vb.append($commontainer);
			makeValueBox(field, $commontainer, eto_i);
		}
	});
	$vb.append('<button id="save">Save</button><button id="cancel">Cancel</button>"');

	$('button#cancel').click(function(){ hideInstancePage(); });
	$('button#save').click(function(){
		var newobj = {};
		for ( instance in CKEDITOR.instances ) {
			if (CKEDITOR.instances[instance].checkDirty()) {
				CKEDITOR.instances[instance].updateElement();
				$('#'+instance).addClass('altered');
			}
		}
		$('.instanceinput .altered').each(function(){
			var fieldname = $(this).attr('id');
			fieldname = fieldname.substr(fieldname.indexOf('_')+1);
			var field = _.detect(admin_table_fields, function(f) { return f.name == fieldname; });
			if (field.editflags == 'date') {
				newobj[fieldname] = new Date($(this).val());
			} else newobj[fieldname] = $(this).val();
			if (eto_i >= 0) {
				admin_table_records[eto_i][fieldname] = newobj[fieldname];
				$eto.find('div.record_field_'+fieldname).text($(this).val());
			}
		});
		$('input.hasDatepicker').each(function(){
			$(this).datepicker('destroy');
		});
		if (eto_i >= 0) {
			if (admin_table_records[eto_i]['modified_date']) {
				var nowtoday = new Date();
				admin_table_records[eto_i]['modified_date'] = nowtoday;
				$eto.find('div.record_field_modified_date').text(date2str(nowtoday));
			}
			setTimeout(function(){
				updateInstance(admin_table_records[eto_i]['_id'], newobj, function(){
					$eto.removeClass('edit_this_one').addClass('already_edited');
					hideInstancePage();
				});
			}, 23);
		} else {
			addInstance(newobj, function(){
				drawListPage();
			});
		}
	});
}

function fadeInListPage() {
	$('div#maintab').addClass('current').stop().animate({ opacity: 'show' }, 666, function() {
		showPlusButt();
	});
}

function fadeOutListPage() {
	$('div#maintab').removeClass('current').stop().animate({opacity:'hide'}, 666);
}

function scrollDownInstancePage() {
	$('div#detailtab').removeClass('current').stop().animate({ top: '1234px'}, 666, function() {
		$(this).css('display','none').html('');
	});
}

function scrollUpInstancePage() {
	$('div#detailtab').addClass('current').stop().css('display','block').animate({ top: '99px'}, 666, function(){
		showPlusButt();
	});
}

function scrollUpWindow() {
	$('html, body').animate({ scrollTop: 0 }, 666);
}

function destroyRichEditors() {
var i, cki;
	for (cki in CKEDITOR.instances) {
		i = CKEDITOR.instances[cki];
		i.destroy(false);
	}
}

function hideInstancePage() {
	if ($('div#detailtab').css('display') != 'none') {
		scrollUpWindow();
		scrollDownInstancePage();
		fadeInListPage();
	}
	destroyRichEditors();
}

function drawInstancePage() {
	destroyRichEditors();
	drawFieldBox();
	drawValueBox();
	scrollUpWindow();
	scrollUpInstancePage();
	fadeOutListPage();
}

function drawListPage() {
	admin_table_records.length = 0; // clear the list
	$('div.admin_table_records').html(''); // ... and the dom representation of it ...
	$('.stayVisible').removeClass('stayVisible').css('visibility', 'hidden'); // and remove any sorting options
	getData();
	hideInstancePage();
}


//
// LIST STUFF
// 

/*
 * this section of code is for all the list-based operations
 *
 *
 *
 */


function closeContextMenu() {
	$('div#context-menu').html('').fadeOut();
	return false;
}

function showContextMenu(field_id) {
console.log(field_id);
var $loc = $('div#'+field_id+' >div');
	$('div#context-menu').html('<div id="context-menu-close" class="button-close"></div><div id="context-menu-fields"></div>')
						.css({left:23+$loc.offset().left, top:$loc.offset().top});
	_.each(edit_flags, function(flag) {
			$f = $('<div class="context-field" id="' + field_id.substr(9) + '_context_' + flag.name + '"></div>');
			$f.html(flag.title);
			$('div#context-menu-fields').append($f);
	});
	$('div.context-field').hover(function(){ $(this).css('background-color', '#fff'); }
			,function(){ $(this).css('background', 'transparent'); }
	 ).click(function(){
		var field, f_id, flag_name, i, $eto, eto_i;

		$eto = $('.edit_this_one');
		eto_i = -1;
		f_id = $(this).attr('id');
		i = f_id.indexOf('_context_');
		flag_name = f_id.substr(i+9);
		f_id = f_id.substr(0, i);

		field = _.detect(admin_table_fields, function(f) { return f.name == f_id; });

		if (field.editflags != flag_name) {
			field.editflags = flag_name;
			showSave();

			// redraw input
			//
			// after removing what's there, we might need to abstract out guts of drawvaluebox to get the field redrawn
			// then might want to recalc the height of the corresponding label ...

			$allrs = $('div.admin_table_record');
			if ($eto.length)
				for (i=0; i < $allrs.length; i++)
					if ($eto[0] == $allrs[i]) {
						eto_i = i;
						break;
					}

			$where = $('div#instin_' + field.name);
			$where.empty();
			makeValueBox(field, $where, eto_i);
		}
		return closeContextMenu();
	});
	$('div#context-menu').fadeIn(666, function(){
									$('div#context-menu-close').animate({opacity:'1'}, 1234).click(closeContextMenu);
											});
}



function closePlusMenu() {
	$('div#plus-menu').html('').fadeOut();
	return false;
}

function showPlusMenu() {
	$('div#plus-menu').html('<div id="plus-menu-close" class="button-close"></div><div id="plus-menu-fields"></div>')
						.css({left:$('div.current div.plusbutt').offset().left, top:$('div.current div.plusbutt').offset().top});
	_.each(admin_table_fields, function(field) {
		if ($('div#maintab').hasClass('current') && !field.listed
		|| $('div#detailtab').hasClass('current') && !field.edited) {
			$f = $('<div class="plus-field" id="plus_menu_field_' + field.name + '"></div>');
			$f.html(field.name);
			$('div#plus-menu-fields').append($f);
		}
	});
	$('div.plus-field').hover(function(){ $(this).css('background-color', '#fff'); }
			,function(){ $(this).css('background', 'transparent'); }
	 ).click(function(){
		var $f, field, listedlist, unlistedlist;
		var id = this.id.substr(16); // plus_menu_field_xxx
		field = _.detect(admin_table_fields, function(f) { return f.name == id; });

		listedlist = _.select(admin_table_fields, function(f) { return f.listed; });
		field.listed = true;
		unlistedlist = _.reject(admin_table_fields, function(f) { return f.listed || f.name == 'id' || f.name == '_id'; });
		listedlist.push(field);
		admin_table_fields = listedlist.concat(unlistedlist);

		$f = addNewField(field);
		drawNewColumn(field);
		makeFieldResizable($f);
		showSave();
		showPlusButt();
		return closePlusMenu();
	});
	$('div#plus-menu').fadeIn(666, function(){
									$('div#plus-menu-close').animate({opacity:'1'}, 1234).click(closePlusMenu);
											});
}

function showPlusButt() {
	if ($('div#maintab').hasClass('current')) {
		if (_.all(admin_table_fields, function(f){ return f.listed || f.name == '_id' || f.name == 'id' })) {
			$('div.current div.plusbutt').fadeOut();
		} else $('div.current div.plusbutt').fadeIn(666, function(){ $('div.current div.plusbutt').animate({opacity:'0.5'}, 1234); });
	} else {
		if (_.all(admin_table_fields, function(f){ return f.edited || f.name == '_id' || f.name == 'id' })) {
			$('div.current div.plusbutt').fadeOut();
		} else $('div.current div.plusbutt').fadeIn(666, function(){ $('div.current div.plusbutt').animate({opacity:'0.5'}, 1234); });
	}
}

function setupPlusButt($plusbutt, wtf) {
	$plusbutt.find('div.plusbutt').css({opacity:'0.5'})
		.hover(function(){ $('div.current div.plusbutt').stop().animate({opacity:'1'}, 123); }
			  ,function(){ $('div.current div.plusbutt').stop().animate({opacity:'0.5'}, 1234); })
		.click(function(){ wtf(); return false; });
}



function makeFieldResizable($f) {
 if (adminflag) {
	$f
	.resizable({
		handles:'e',
		minWidth:44,
		maxWidth:444,
		alsoResize:'.record_' + $f.attr('id'),
		start:function(e,ui) {
			$(e.target).css('top', $(e.target).position().top);
			$(e.target).css('left', $(e.target).position().left);
			$('.button-close').stop().animate({opacity:'0'}, 123);
		},
		stop:function(e, ui) {
			_.detect(admin_table_fields, function(f){ return f.name == e.target.id.substr(6); }).listwidth = $(e.target).width();
			$(e.target).css({left:'',top:''}); // reset these styles, cos they mess with dragging ...
			showSave();
		}
	})
	.draggable({
		axis:'x',
		helper:'clone',
		stack:'.admin_table_field',
		start:function(e,ui) {
			$('.button-close').stop().animate({opacity:'0'}, 123);
			ui.helper.animate({ borderColor: "#EEE8D5" }, 'fast').css({backgroundColor:'#FDF6E3', zIndex:'123'});
		},
		stop:function(e,ui) {
			var newlist = [];
			var w = 0;
			var doneflag = false, changedflag = true;
			var movedf = _.detect(admin_table_fields, function(f){ return f.name == e.target.id.substr(6); });
			for (i=0; i<admin_table_fields.length; i++) {
				if (ui.position.left <= $(e.target).position().left) {
					if (!doneflag && ui.position.left <= w) {
						newlist.push(movedf);
						doneflag = true;
						if (admin_table_fields[i] == movedf)
							changedflag = false;
					}
					if (admin_table_fields[i] != movedf) {
						newlist.push(admin_table_fields[i]);
					}
					w += admin_table_fields[i].listwidth;
				} else {
					if (admin_table_fields[i] != movedf) {
						newlist.push(admin_table_fields[i]);
					}
					w += admin_table_fields[i].listwidth;
					if (!doneflag && ui.position.left <= w) {
						newlist.push(movedf);
						doneflag = true;
						if (admin_table_fields[i] == movedf)
							changedflag = false;
					}
				}
			}
			if (!doneflag)
				newlist.push(movedf);
			admin_table_fields = newlist;
			if (changedflag) {
				drawFields();
				drawData(0);
				showSave();
			}
		}
	})
	;
 }
}

function makeFieldsResizable() {
	$('.admin_table_field').each(function(){ 
		makeFieldResizable($(this));
	});
}

function setupNewListField($f) {
	setupNewField($f, function(field){
		field.listed = false;
		$('div.record_field_' + field.name).remove();	
	});
}


/*
 * when the list of fields being displayed is created, or added to
 */
function sortableNewField($f) {

	$f.dblclick(function(){																// sort on double-click
			$b = $(this).find('.button-asc');
			if ($b.hasClass('stayVisible'))
				$b = $(this).find('.button-desc');
			else if ($(this).find('.button-desc').hasClass('stayVisible')) {
				$b = null;
			}
			$('.stayVisible').removeClass('stayVisible').css('visibility', 'hidden');
			if ($b) $b.addClass('stayVisible').css('visibility', 'visible');
			admin_table_records.length = 0;
			$('div.admin_table_records').html('');
			getData();
		});
}



/*
 * draw the data that corresponds to the (previously hidden) field which we just added
 */
function drawNewColumn(field) {
	$allrs = $('div.admin_table_record');
	for (i=0; i < $allrs.length; i++) {
		$f = $('<div class="admin_table_record_field record_field_' + field.name + '"></div>');
		$f.width(field.listwidth);
		if (field.editflags == 'date')
			$f.text(date2str(admin_table_records[i][field.name]));
		else $f.html(admin_table_records[i][field.name]);
		$($allrs[i]).append($f);
	}
}



/*
 * draw the data that comes in via ajaj
 */
function drawData(pos) {
var field;

	$('div#addmore').remove();

	$allrs = $('div.admin_table_records');
	if ($allrs.length == 0) {
		$allrs = $('<div class="admin_table_records"></div>');
		$('div.admin_table_fields').after($allrs);
	}

	for (i=pos; i < admin_table_records.length; i++) {
		$r = $('<div class="admin_table_record"></div>');
		if (admin_table_records[i]['_id'] == null)
			$r.addClass('already_deleted');
		else $r.append('<input type="checkbox" class="deleteme" id="delete_' + admin_table_records[i]['_id'] + '" /></div>');

		$allrs.append($r);

		_.each(admin_table_fields, function(field) {
			var list_content;
			if (field.listed) {
				if (field.editflags == 'date') {
					list_content = date2str(admin_table_records[i][field.name]);
				} else {
					list_content = admin_table_records[i][field.name];
					if (list_content)
						if (list_content.length > 69)
							list_content = list_content.substr(0,69);
				}
				$f = $('<div class="admin_table_record_field record_field_' + field.name + '"></div>');
				$f.width(field.listwidth).text(list_content);
				$r.append($f);
			}
		});
	}

	makeFieldsResizable();

	$('input.deleteme').hover(
			function() { if (!$(this).is(':checked')) $(this).animate({opacity:'1'}, 333); }
		  , function() { if (!$(this).is(':checked')) $(this).animate({opacity:'0'}, 123); }
	).click(function(e){
		if ($('.deleteme:checked').length) $('button#less').show();
		else $('button#less').hide();
		e.stopPropagation();
	});

	$allrs.append('<div id="addmore"></div>');

	$('div#addmore').append('<button id="less">DELETE</button>');
	if ($('.deleteme:checked').length) $('button#less').show();
	$('button#less').click(function() { delData(); return false; });

	if (i-pos == 20) { // we got another full 20 records
		$('div#addmore').append('<button id="more">More ...</button>');
		$('button#more').click(function() { getData(); });
	}

	$('div#addmore').append('<button id="add">ADD</button>');
	
	$('button#add').click(function() {
		$('div.edit_this_one').removeClass('edit_this_one');
		drawInstancePage();
	});

	$('div.admin_table_record')
		.hover(function(){
				$('div.admin_table_record').find('.hovering').removeClass('hovering');
				$(this).addClass('hovering');
			}, function(){
				$(this).removeClass('hovering');
		}).click(function(){
			$('div.edit_this_one').removeClass('edit_this_one');
			if (!$(this).hasClass('already_deleted')) {
				$(this).addClass('edit_this_one');
				drawInstancePage();
			}
			return false;
		});
}



/*
 * when the list of fields being displayed is created, or added to
 */
function getData() {

	var route = which_route + '/list/' + admin_table_records.length;
		
	$('.stayVisible').each(function(){	// there can be only one ...
		var name = this.id.substr(this.id.indexOf('-')+1);
		var order = this.id.substr(0, this.id.indexOf('-'));
		route = route + '/' + name + '/' + order;
	});

	$.ajax({
		url:route,
		cache:false,
		beforeSend:function(jqXHR, settings){
			settings['HTTP_X_REQUESTED_WITH'] = 'XMLHttpRequest';
		},
		success:function(ajaxdata, txtsts, jqXHR){
			var i = admin_table_records.length;
			admin_table_records = admin_table_records.concat($.parseJSON(ajaxdata));
			drawData(i);
		},
		error:function(jqXHR, ststxt, err){
/*
* DEBUGGING
					alert('AJAX ERROR: ' +ststxt + ':' + err);
					$('div#container').html(jqXHR.responseText);
*/
		}
	});
}

function addNewField(field) {
	$f = $('<div id="field_' + field.name + '" class="admin_table_field"></div>');
	$f.width(field.listwidth).html(field.name);
	if (($p = $('div.current div.plusbutt')).length)
		$p.before($f);
	else $('div.admin_table_fields').append($f);
	$f.append('<div id="desc-' + field.name + '" class="button-desc"></div>'
		 +'<div id="asc-' + field.name + '" class="button-asc"></div>');
	if (adminflag) {
		$f.append('<div id="close-' + field.name + '" class="button-close"></div>');
		setupNewListField($f);
	}
	sortableNewField($f);
	return $f;
}

/*
 * initiate the list of fields being displayed
 */
function drawFields() {
var field;

	$('div#maintab').html('<div class="admin_table_fields"></div>');
	_.each(admin_table_fields, function(field) {
		if (field.listed)
			addNewField(field)
	});

	if (adminflag) {
		setupPlusButt( $('div.admin_table_fields').append('<div class="plusbutt"></div>'), showPlusMenu );
		showPlusButt();
	}
}



/*
 * sammy just loads the table: all the real work happens on the page
 */
function callBefore(route, from, to) {

	which_route = route[0];

	if (to) {
		from.find('a.table').each(function(){
			if ($(this).text() == 'admin')
				adminflag = true;	// if the server sent the admin table, that means we're logged in as the superadmin
		});
		admin_table_records.length = 0;
		$('div.admin_table_records').html('');
	} else {
		admin_table_fields = from;
		drawFields();
		$('a#table-name').html(route[0].substr(1));
		$('button#loginlogout').html('Logout').show();
		getData();
	}
	
	return false;	// if it's templated, swxmo will do the welding for us.
}



/*
 * who'dathunk: turns out, this is a good place to work out whether we're logging in or out ...
 */
function callAfter(route) {
var $b = $('button#loginlogout')
	if (route[0].substr(0,8) == '')
		$b.html('Login').show();
	else if (route[0].substr(0,8) != '/session')
		$b.html('Logout').show();
	else $b.hide();
	$b.click(function() { logOut(); });

	/* other header links ... */
	$('div#saveconfig').click(function() { saveCfg(); });

	hideInstancePage();
}


mysammyinstance = swxmoUpdate(callBefore, callAfter);
$('button#loginlogout').click(function() { logOut(); });

$.getScript('http://la.rrak.in/ckeditor/ckeditor.js', function(){
	$.getScript('http://la.rrak.in/ckeditor/adapters/jquery.js', function(){
	});
});

