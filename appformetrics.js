var redis = require("redis"),
    client = redis.createClient();

var sha1 = require('sha1');


client.on("error", function (err) {
    console.log("Error " + err);
});


var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var swig  = require('swig');


app.use(cookieParser());
app.use("/static", express.static(__dirname + '/public'));
app.use("/dynamic", express.static(__dirname + '/dynamic'));


app.get('/', function (req, res) {
    client.get("total:users", function (err, totalusers) {
    if (typeof req.cookies.sessionid === "undefined") {
	sessionid = sha1(Math.random());
	client.hset("sessions", sessionid, 1);
	res.cookie('sessionid', sessionid);
    }
	var tpl = swig.compileFile('uiformetrics.template');
	
	res.send(tpl({ pagename: 'awmome',
		  includedjs: ["/static/dat.gui.js"],
		  defvals: {"\'dat.gui\'" : 'message', 0.8: 'speed'},
		  rangevals: {"\'message\'": "", "\'speed\'": ", 0,10" }}));
    });
})


app.get('/total.stats', function (req,res) {
    console.log(req.cookies.sessionid);
    
    client.get("total:users", function (err, objUsers)  {
	client.get("total:visits", function (err, objVisits)  {
	    client.get("total:interactions", function (err, objInteractions)  {
		res.contentType('application/json');
		var stats = [ {usercount: objUsers}, {visitcount: objVisits}, {interactioncount: objInteractions} ];
		statsJSON = JSON.stringify(stats);
		console.log(statsJSON);
		res.send(statsJSON);
	    });
	});
    });
})

app.get('/intersect.stats', function (req,res) {
    console.log(req.cookies.sessionid);
    var apps = req.param("apps");
    console.log("apps  " +apps);
    var sessionKey = req.cookies.sessionid+":intersect:"+apps;

    console.log(sessionKey);

    var estr = apps.split(":");

    var astr = [sessionKey];

    for (var i = 0; i < estr.length; i++) {
	astr.push("app:userlaunch:"+ estr[i]);
    }

    console.log(astr);
    client.sinterstore(astr, function (err, val) {
	console.dir(err);
	console.dir(val);
	var stats = [ {name: apps, count: val}];
	statsJSON = JSON.stringify(stats);
	res.send(statsJSON);
    });
})



app.get('/union.stats', function (req,res) {
    console.log(req.cookies.sessionid);
    var apps = req.param("apps");
    console.log(apps);

    var sessionKey = req.cookies.sessionid+":union:"+apps;
    console.log(sessionKey);
    
    var estr = apps.split(":");
    console.log(estr.length);
    var astr = [sessionKey];
    for (var i = 0; i < estr.length; i++) {
	astr.push("app:userlaunch:"+ estr[i]);
    }
    client.sunionstore(astr, function (err, val) {
	console.dir(err);
	console.dir(val);
	var stats = [ {name: apps, count: val}];
	statsJSON = JSON.stringify(stats);
	res.send(statsJSON);
    });
})



app.get('/app.stats', function (req,res) {
    console.log(req.cookies.sessionid);
    appid = req.param("appid");
    client.scard("app:userlaunch:"+appid, function(err, obj) {
	res.contentType('application/json');
	var stats = [ {name: appid, usercount: obj}];
	statsJSON = JSON.stringify(stats);
	console.log(statsJSON);
	res.send(statsJSON);
     });
})


app.get('/app.daily.stats', function (req,res) {
    console.log(req.cookies.sessionid);
    var appid = req.param("appid");
    var day = req.param("day");


    client.scard("appday:userlaunch:"+appid+":"+day, function(err, obj) {
	var stats = [ { usercount: obj}];
	var statsJSON = JSON.stringify(stats);
	console.log(statsJSON);
	res.send(statsJSON);
    });
})




function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}


var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('App for metrics listening at http://%s:%s', host, port)

})
