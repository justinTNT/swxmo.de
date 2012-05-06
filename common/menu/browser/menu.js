
/*
 * loads menu data from backend,
 * rearranges as superfish lists
 * and then updates the links
 */
function setupMenu(where) {
var menuid = $(where).attr('id');

	if (menuid.substr(0,5) == 'menu-')
		menuid = menuid.substr(5);
	swxmoAJAJ('/menu/' + menuid, function(o){
		var notdone = true;
		var e, i, $item, $ul;
		$ul = $('<ul class="sf-menu">');
		$ul.appendTo($(where));
		while (notdone) {
			notdone = false;
			for (i=0; i<o.length; i++) {
				e=o[i];
				if (!$ul.find('li#' + e.item).length) { // only add on items not already there ...
					if (!e.parent_item.length || $('li#' + e.parent_item).length) {
						$item = $('<li>');
						$item.attr('id', e.item);
						if (e.link.length) {
							$item.html('<a>' + e.title + '</a>');
							$item.find('a').attr('href', e.link);
						} else {
							$item.text(e.title);
						}
						if (e.parent_item.length) {
							$o = $('li#' + e.parent_item);
							if ($o.find('ul').length) $o = $o.find('ul');
							else {
								$o.append($('<ul>'));
								$o = $o.find('ul');
							}
							$o.append($item);
						} else {
							$ul.append($item);
						}
					} else {
						notdone = true; // wait for next loop, maybe parent will be there by then
					}
				}
			}
		}
		$ul.superfish();

		$ul.css('marginLeft', ($(where).width()-$ul.width())/2 + 'px');
		$ul.css('display', 'inline'); // for ie6 double indent bug
		updateLinks($ul);
		$ul.find('a').each(function(){
			var f=$(this).click;
			$(this).click(function(){
				$(this).blur();
				f();
			});
		});
	}, function(txt, err) {
		// error: ignore?
	});
}

