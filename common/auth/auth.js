var Guest;

/*
 * returns : user object,
 * 		or   user name (if user not found)
 * 		or   empty string (if password doesn't match)
 */
function authenticate(name, pass, cb) {
	Guest.find({handle:name}, function(err, docs) {
		if (err) throw err;
		if (docs.length == 0) {
			cb(name);
		} else if (docs[0].pass == pass) {
			docs[0].passwd = '';
			cb(docs[0]);
		} else {
			cb('');
		}
	});
}

/*
 * returns : user name (if user already in db)
 * 		or   email (if email already in db)
 * 		or   empty string (if password doesn't match)
 */
function validateNewRego(name, email, cb) {
	Guest.find({handle:name}, function(err, docs) {
		if (err) throw err;
		if (docs.length == 0) {
			Guest.find({email:email}, function(err, docs) {
				if (err) throw err;
				if (docs.length == 0) cb();
				else cb(email);
			});
		} else {
			cb(name);
		}
	});
}



function requiresLogin(req, res, next) {
	if (! req.session) {
		next();
		res.redirect('/login');
	} else if (req.session.user) {
		next();
	} else res.redirect('/login');
};




module.exports = function(env) {

	var crypto = require('crypto');
	var guest = require('./schema/guest').name;
	Guest = env.db.model(guest);

	var mailer = require('nodemailer');
	mailer.SMTP = {
		host: 'mail.justat.in',
		port: 587,
		ssl: false,
		use_authentication: true,
		user: 'accounts@justat.in',
		pass: '4cc0unt5'
	};

	var EmailVerification = function(secret) {
		this.cipher = crypto.createCipher('aes-256-cbc', secret);
		this.decipher = crypto.createDecipher('aes-256-cbc', secret);
	};
	EmailVerification.prototype.encrypt = function(text) {
		var crypted = this.cipher.update(text,'utf8','hex');
		crypted += this.cipher.final('hex');
		return crypted;

	};
	EmailVerification.prototype.decrypt = function(text) {
		var dec = this.decipher.update(text,'hex','utf8');
		dec += this.decipher.final('utf8');
		return dec;
	};




	/*
	 * returns : user object,
	 * 		or   user name (if user not found)
	 * 		or   empty string (if password doesn't match)
	 */
	function authenticate(name, pass, cb) {
		Guest.find({handle:name}, function(err, docs) {
			if (err) throw err;
			if (docs.length == 0) {
				cb(name);
			} else if (docs[0].pass == pass) {
				docs[0].passwd = '';
				cb(docs[0]);
			} else {
				cb('');
			}
		});
	}

	/*
	 * returns : user name (if user already in db)
	 * 		or   email (if email already in db)
	 * 		or   empty string (if password doesn't match)
	 */
	function validateNewRego(name, email, cb) {
		Guest.find({handle:name}, function(err, docs) {
			if (err) throw err;
			if (docs.length == 0) {
				Guest.find({email:email}, function(err, docs) {
					if (err) throw err;
					if (docs.length == 0) cb();
					else cb(email);
				});
			} else {
				cb(name);
			}
		});
	}



	function requiresLogin(req, res, next) {
		if (! req.session) {
			next();
			res.redirect('/login');
		} else if (req.session.user) {
			next();
		} else res.redirect('/login');
	};



	Guest.find({expireOnNoVerify:{$ne:null}}, function(err, docs) {
		docs.forEach(function(err, i){
			var g=docs[i];
			var expireDate = new Date();
			var delay = expireDate.getTime()
			var expire = g.expireOnNoVerify.getTime();
			if (expire < delay) delay=0;
			else delay = expire - delay;
			setTimeout(function(){
				Guest.find({handle:g.handle}, function(err, docs) {
					if (docs.length) {
						if (docs[0].expireOnNoVerify) {
							Guest.remove({_id:docs[0]._id}, function(err, docs){
									if (err) {
										throw err;
									}
								});
						}
					}
				});
			}, delay);
		});
	});


	env.app.post('/login', function(req,res) {
		authenticate(req.body.login, req.body.password, function(u){
			if (typeof u == 'object') {
				req.session.user = u;
				delete u.pass;
				env.respond(req, res, null, null, u);
			} else {
				res.send(u, 404);
			}
		});
	});

	env.app.get('/silent_login', function(req,res) {
		if (req.session.user) {
			env.respond(req, res, null, null, req.session.user);
		} else {
			res.send('not yet logged in', 404);
		}
	});

	env.app.post('/register', function(req,res) {
		validateNewRego(req.body.login, req.body.email, function(u){
			if (u) {
				res.send(u, 404);
			} else {
				var expireDate = new Date();
				var delay = expireDate.getTime();
				expireDate.setDate(expireDate.getDate()+2);
				var g = new Guest({
							handle:req.body.login
							, email:req.body.email
							, pass:req.body.password
							, expireOnNoVerify:expireDate
						});

				var delay = expireDate.getTime() - delay;
				setTimeout(function(){
					Guest.find({handle:req.body.login}, function(err, docs) {
						if (docs.length) {
							if (docs[0].expireOnNoVerify) {
								Guest.remove({_id:docs[0]._id}, function(err, docs){
										if (err) {
											throw err;
										}
									});
							}
						}
					});
				}, delay);

				var encrypter = new EmailVerification(req.body.email);
				var encoded = encrypter.encrypt(req.body.password);
				mailer.send_mail( {
						sender: 'accounts@justat.in',
						to:req.body.email,
						subject:'Please confirm your account',
						html: "<p>Click on this link to verify your account:<br>"
							+ "<a href='" + env.url + "/confirm/" + req.body.login + "/" + encoded + "'>"
							+ env.url + "/confirm/" + req.body.login + "/" + encoded + "</a>"
					},
					function(error, success){
						if (success) {
							g.save(function(err){
								if (err) {
									// if it is a validation error, send something sensible back to the client...
									throw err;
								}

								req.session.user = g;
								delete g.pass;
								delete g.confirm;
								env.respond(req, res, null, null, g);
							});
						}
					}
				);
			}
		});
	});

	env.app.get('/confirm/:user/:encoded_pass', function(req,res) {
		Guest.find({handle:req.params.user}, function(err, docs) {
			if (docs.length) {
				var decrypter = new EmailVerification(docs[0].email);
				var decoded = decrypter.decrypt(req.params.encoded_pass);
				if (decoded != docs[0].pass) {
					res.send('Invalid confirmation code ' + decoded, 404);
				} else {
					docs[0].expireOnNoVerify=null;
					docs[0].save(function(err,docs){
						if (err) throw err;
					});
					req.session.user = docs[0];
					delete req.session.user.pass;
					showlist(req, res);
				}
			}
			else res.send('Invalid confirmation code', 404);
		});
	});

};




