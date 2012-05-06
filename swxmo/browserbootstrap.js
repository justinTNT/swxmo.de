/*
 * browserbootstrap
 * ================
 * this is the file which kick starts swxmo in the client,
 * by hijacking links (thanks ben altman for url internal and hashchange)
 * and calling the common weld gear from swxmode.js
 */

function updateLinks(frag){
		frag.find('a:urlInternal').each(function() {			// all internal links,
			if (! $(this).hasClass('hardlink')) {
				var h=$(this).attr('href');					// get the href
				if (h.substring(0,7) == 'http://') {		// if it's a fully qualified URL
					h=h.substr(8);							// skip past the protocol,
					h=h.substr(h.indexOf('/'));				// up to the path
				}
				if (h.indexOf('.') < 0) {			// don't intercept local files with '.' extension
					if (h.charAt(0) != '/') h='/'+h;		// make sure there's a leading slash
					$(this).data('ajax_link', h);
					$(this).click(function(){							// when it's clicked,
						location.hash = $(this).data('ajax_link');		// rewrite the fragment
						return false;						// trust the router to make the server call
					});	
				}
			}
		});
}

/*
 * we mostly do ajaj (Asynchronous Json, Assisted by Javascript)
 * and this wrapper helps make it smooth
 */
function swxmoAJAJ (route, succ, fail, data) {
	$.ajax({
		url:route,
		cache:false,
		type:(data ? 'POST' : 'GET'),
		data:data,
		beforeSend:function(jqXHR, settings){
			settings['HTTP_X_REQUESTED_WITH'] = 'XMLHttpRequest';
		},
		success:function(ajaxdata, txtsts, jqXHR){
			if (ajaxdata == 'OK') succ();
			else succ($.parseJSON(ajaxdata));
		},
		error:function(jqXHR, ststxt, err){
/*
* DEBUGGING
				alert('AJAX ERROR for ' + route + ': ' + ststxt + ':' + err);
*/
			fail(jqXHR.responseText, err);
		}
	});
}



/*
 * swxmoUpdate - this is the function called by our script in the browser to setup sammy.
 * ===========
 * callBefore - this function is called before the page is updated.
 * 				parameters : route, from, to
 *              if callBefore is null, then all incoming data is welded directly to the page
 *              otherwise, if there's no templates named (ie. it's pure ajaj) then :
 *              	from holds the objects, to is empty, and this function must do all the work.
 *              if callBefore redraws the page, eg to perform a nifty animation, it should return true;
 *              if callBefore returns false, then swxmoUpdate goes on to redraw the page (copy from->to)
 * callBack   - this function is called after the page is updated with the new data,
 *              with the route string as the only parameter.
 *              This is a good place to recalculate stuff after the page is redrawn
 */

function swxmoUpdate (callBefore, callBack){

	$(window).hashchange(function(){
		var servercall = location.hash;
		while (servercall.charAt(0) == '#')
			servercall = servercall.substr(1);
		while (servercall.charAt(0) == '/')
			servercall = servercall.substr(1);

		swxmoAJAJ(servercall,
			function(txdata){
				var $dest_cont=null, $temp_cont;

				if (_.isArray(txdata)) {			// straight data comes in an array

					callBefore(servercall, txdata);

				} else {							// template data comes in an object with objs, temps and dest

					if (txdata && servercall.length)
						$dest_cont = $(txdata.templates[0].selector);
					else $dest_cont = $('div#boilerplate-container');

					if (callBefore)							// if there's a callBefore,
						$temp_cont = $dest_cont.clone();	// load the new data into temp 'plates
					else $temp_cont = $dest_cont;			// otherwise, weld the new data in place on the page

					if (txdata) {
						loadTemps(swxmodeskeleta, txdata.templates.slice(0), function(data) {
							weldTemps(txdata.templates, txdata.objects, data, function(responsetxt) {
								if (callBefore)
									if (! callBefore(servercall, $temp_cont, $dest_cont))	// if the callback returns false,
										$dest_cont.html($temp_cont.html());				// copy the welded templates to the page
								updateLinks($dest_cont);
								if (callBack) callBack(servercall);
							});
						}, $temp_cont);
					} else {
						if (callBack) callBack(servercall);
					}

				}
			}, function(ststxt, err){
				location.href=servercall; // force refresh on ajax error
			});
	});

	$(window).hashchange();
	updateLinks($('div#boilerplate-container'));
}


