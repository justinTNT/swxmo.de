<html>  

<!-- paulirish.com/2008/conditional-stylesheets-vs-css-hacks-answer-neither/ --> 
<!--[if lt IE 7 ]> <html lang="en" class="no-js ie6"> <![endif]-->
<!--[if IE 7 ]>    <html lang="en" class="no-js ie7"> <![endif]-->
<!--[if IE 8 ]>    <html lang="en" class="no-js ie8"> <![endif]-->
<!--[if IE 9 ]>    <html lang="en" class="no-js ie9"> <![endif]-->
<!--[if (gt IE 9)|!(IE)]><!--> <html lang="en" class="no-js"> <!--<![endif]-->
<head>

  <!--	All JavaScript at the bottom, except for :
		this crazy nonsense which decides whether to rewrite the url -->
  <script type="text/javascript" language="javascript">
	p = window.location.pathname;
	h = window.location.hash;
	host = window.location.host;
	prot = window.location.protocol;
	if (h[0] == '#') h=h.substring(1);
	if (p[0] == '/') p=p.substring(1);
	if (p.length) {
		if (!h.length) h = '/'+p;
		window.location.href = prot + '//' + host + '/#' + h;
	}
  </script>

  <!-- and Modernizr, which sets css flags to enable HTML5 elements & feature detects -->
  <script src="{{STATIC}}js/modernizr-1.6.min.js"></script>


  <meta charset="utf-8">

  <!-- Always force latest IE rendering engine (even in intranet) & Chrome Frame 
       Remove this if you use the .htaccess -->
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">

  <!--  Mobile viewport optimized: j.mp/bplateviewport -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <meta name="description" content="">
  <meta name="author" content="">


  <!-- Place favicon.ico & apple-touch-icon.png in the root of your domain and delete these references -->
  <link rel="shortcut icon" href="{{STATIC}}{{APP}}/favicon.ico">
  <link rel="apple-touch-icon" href="{{STATIC}}{{APP}}/apple-touch-icon.png">


  <!-- CSS : implied media="all" -->
  <link rel="stylesheet" href="{{STATIC}}css/basestyle.css?v=2">

  <!-- Uncomment if you are specifically targeting less enabled mobile browsers
  <link rel="stylesheet" media="handheld" href="css/handheld.css?v=2">  -->
 
  <link rel="stylesheet" href="/browser/{{APP}}.css">

</head>

<body>

  <div id="boilerplate-container">
  </div> <!--! end of #container -->


  <!-- Javascript at the bottom for fast page loading -->
  <!-- --> 
  <!-- scripts concatenated and minified in two streams : stuff I wrote and libs.
		in development, include script.js separately from plugins.js (built from libs, swxmod and schema)
		in production, just include the final compiled version : compiled.js
	-->
  <script src="/browser/plugins.js"></script>
  <script src="/browser/script.js"></script>
  
  <!--[if lt IE 7 ]>
    <script src="{{STATIC}}js/dd_belatedpng.js"></script>
    <script type="text/javascript" language="javascript"> DD_belatedPNG.fix('img, .png_bg'); //fix any <img> or .png_bg background-images </script>
  <![endif]-->

</body>
</html>
