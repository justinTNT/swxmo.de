
/* is this just for django?
 * maybe I can lose it ...
 */

$.ajaxSetup({ 
	beforeSend: function(xhr, settings) {
		function getCookie(name) {
			var cookieValue = null;
			if (document.cookie && document.cookie != '') {
				var cookies = document.cookie.split(';');
				for (var i = 0; i < cookies.length; i++) {
					var cookie = jQuery.trim(cookies[i]);
					// Does this cookie string begin with the name we want?
					if (cookie.substring(0, name.length + 1) == (name + '=')) {
						 cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
						 break;
					}
				}
			}
			return cookieValue;
		}
		if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
			// Only send the token to relative URLs i.e. locally.
			xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
		}
	} 
});


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

	return Sammy('div#boilerplate-container', function() {

		this.get(/.*\#(.*)/, function() {
			servercall = this.params['splat'];
			$.ajax({
				url:servercall,
				cache:false,
				beforeSend:function(jqXHR, settings){
					settings['HTTP_X_REQUESTED_WITH'] = 'XMLHttpRequest';
				},
				success:function(ajaxdata, txtsts, jqXHR){
					// get tpls, objs from data
					var txdata = $.parseJSON(ajaxdata);
					var $dest_cont = $('div#boilerplate-container');
					var $temp_cont;
	
					if (_.isArray(txdata)) callBefore(servercall, txdata);
					else {

						if (callBefore)														// if there's a callBefore,
							$temp_cont = $dest_cont.clone();	// load the new data into temp 'plates
						else $temp_cont = $dest_cont;						// otherwise, weld the new data in place on the page

						loadTemps(swxmodeskeleta, txdata.templates.slice(0), function(data) {
							weldTemps(txdata.templates, txdata.objects, data, function(responsetxt) {
								if (callBefore)
									if (! callBefore(servercall, $temp_cont, $dest_cont))	// if the callback returns false,
										$dest_cont.html($temp_cont.html());				// copy the welded templates to the page
								updateLinks($dest_cont);
								if (callBack) callBack(servercall);
							});
						}, $temp_cont);

					}

				},
				error:function(jqXHR, ststxt, err){
/*
 * DEBUGGING
							alert('AJAX ERROR: ' +ststxt + ':' + err);
							$('div#container').html(jqXHR.responseText);
 */
					location.href=servercall; // force refresh on ajax error
				}
			});
		});
	}).run();

}

