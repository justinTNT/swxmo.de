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

