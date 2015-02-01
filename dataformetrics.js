var fs = require('fs'),
    readline = require('readline');

var redis = require("redis"),
    client = redis.createClient();
var sha1 = require('sha1');

// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

client.on("error", function (err) {
    console.log("Error " + err);
});

var fnames = fs.readFileSync('fnames.txt').toString().split("\n");
var lnames = fs.readFileSync('lnames.txt').toString().split("\n");


main();

function main() {

    step = process.argv[2];


    if (step == 0) {
	client.set("total:apps", 5);
	client.quit();
    }
    
    if (step == 1) {
	if (process.argv[3] != undefined) {
	    insertUsersIntoRedis(process.argv[3]);
	}
	else {
	    insertUsersIntoRedis(1000);
	}
    }

    
    if (step == 2) {
	if (process.argv[3] != undefined) {
	    var numberOfVisits = process.argv[3];
	    createVisits( numberOfVisits);
	}
	else {
	    var numberOfVisits = 10;
	    createVisits(numberOfVisits);
	}
    }

    if (step == 3) {
	if (process.argv[3] != undefined) {
	    numberOfInteractions = process.argv[3];
	    client.set("total:interactions", numberOfInteractions);
	    client.get ("total:visits", function (err, numberOfVisits) {
		cntProcessedInteractions = 0;
		
	    	for (i =  0; i < numberOfInteractions ; i++) {
		    randomVisitNbr = getRandomInt(1, numberOfVisits);
		    client.hget("visitnbr:visitid", randomVisitNbr, function (err, visitid) {
			createInteraction (visitid);
		    });
		}
	    });
	}
    }

    if (step == 4) {
	if (process.argv[3] != undefined) {
	    numberOfUsersPerApp = process.argv[3];
	    

	    client.get ("total:users", function (err, totalusers) {

		for (i = 0; i < numberOfUsersPerApp; i++) {
		    for (j = 0 ; j < 3; j++ ) {
			rUser = 	 getRandomInt(1, totalusers);
			client.sadd("usersinapp"+j, rUser);
		    }
		}
		client.quit();
		
	    });
	}
    }





    if (step == 31) {

	createInteraction (process.argv[3]);	
    }
}





function createVisits ( numberOfVisits) {
    client.set("total:visits", numberOfVisits);
    
    client.get("total:users", function (err,  numberofusers ) {
	

	for (i =  0; i < numberOfVisits ; i++) {

	    randomstartdate = getRandomInt(0, 7);	    


	    visitid = sha1(i.toString());
	    randUser = getRandomInt(1, numberofusers);

	    client.hset("user:visit", randUser, visitid);
	    client.hset("visitnbr:visitid", i, visitid);


	    client.hset("visit:"+visitid, "user", randUser);
	    client.hset("visit:"+visitid, "starttime", randomstartdate );

	    client.zadd("visitstatus:"+visitid, randomstartdate, "ACTIVE"+":"+randomstartdate);
	    
	}
	client.quit();
    });

}


function createInteraction (visitid) {
    client.zcount("visitstatus:"+visitid, "-inf", "+inf", function (err, zcount) {
	client.zrange("visitstatus:"+visitid, zcount-1, zcount-1, "withscores", function (err, zobj) {
           client.get("total:apps", function (err, totalapps) {
               client.hget("visit:"+visitid, "user", function (err, userid) {
		   
		   if (zobj != undefined) {
		       splitStatus = zobj[0].split(":");
		       
		       currentVisitStatus = splitStatus[0];
		       currentVisitStatusTime = zobj[1];
		       
		       var nextstatesforACTIVE = ["ACTIVE", "INACTIVE"];
		       var nextstatesforINACTIVE = ["ACTIVE", "INACTIVE", "EXPIRE"];
		       
		       console.log(visitid);
		       
		       if (currentVisitStatus == "ACTIVE") {
			   chosenApp = getRandomInt(0, totalapps);
			   chosenAppDay = getRandomInt(0, 7);   // hard code app days 7 are bad

			   console.log("app:userlaunch:"+chosenApp);
			   console.log("useris ==> " + userid);
			   
			   client.sadd("app:userlaunch:"+chosenApp, userid);
			   client.sadd("appday:userlaunch:"+chosenApp+":"+chosenAppDay, userid);

			   nextVisitStatus = nextstatesforACTIVE [ getRandomInt(0, 2)];
			   nextVisitStatusChangeTime =  parseFloat(currentVisitStatusTime) + 1.0;
			   console.log("Current state = " + currentVisitStatus + "; The next state (randomly generated) is " + nextVisitStatus);	    
			   client.zadd("visitstatus:"+visitid,nextVisitStatusChangeTime , nextVisitStatus+":"+nextVisitStatusChangeTime );
			   
		       }

		       if (currentVisitStatus == "INACTIVE") {
			   nextVisitStatus = nextstatesforINACTIVE [ getRandomInt(0, 3)];
			   nextVisitStatusChangeTime =  parseFloat(currentVisitStatusTime) + 1.0;
			   
			   console.log("Current state = " + currentVisitStatus + "; The next state (randomly generated) is " + nextVisitStatus);	    
			   client.zadd("visitstatus:"+visitid, nextVisitStatusChangeTime , nextVisitStatus+":"+nextVisitStatusChangeTime );
		       }
		       
		       if (currentVisitStatus == "EXPIRE") {
			   console.log("Current state = " + currentVisitStatus + ". END OF LINE FOR THIS VISIT");	    
		       }

		       cntProcessedInteractions++; 
		       if (cntProcessedInteractions == (numberOfInteractions - 1 )) {
			   client.quit();
		       }
		       
		   }
	       }); 
	   });
	});
    });
    
    
}


function moveVisitToNextState (visitid, datetime, status) { 
    
}

    

function insertUsersIntoRedis(numberofentries) {



    client.set("total:users", numberofentries);
    start = new Date().getTime();
    
    for (i = 1; i < numberofentries; i++) {
	pname = getRandomPersonName ();
	client.hset("user:"+i, pname, start);
    }
    client.quit();

    
    
}

function getRandomPersonName() {
    return getRandomLastName() + "," + getRandomFirstName (); 
}

function getRandomFirstName () {
    return fnames[getRandomInt(0, fnames.length)];
}

function getRandomLastName () {
    return lnames[getRandomInt(0, lnames.length)];
}


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}


function sha1(str) {
  //  discuss at: http://phpjs.org/functions/sha1/
  // original by: Webtoolkit.info (http://www.webtoolkit.info/)
  // improved by: Michael White (http://getsprink.com)
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //    input by: Brett Zamir (http://brett-zamir.me)
  //  depends on: utf8_encode
  //   example 1: sha1('Kevin van Zonneveld');
  //   returns 1: '54916d2e62f65b3afa6e192e6a601cdbe5cb5897'

  var rotate_left = function(n, s) {
    var t4 = (n << s) | (n >>> (32 - s));
    return t4;
  };

  /*var lsb_hex = function (val) { // Not in use; needed?
    var str="";
    var i;
    var vh;
    var vl;

    for ( i=0; i<=6; i+=2 ) {
      vh = (val>>>(i*4+4))&0x0f;
      vl = (val>>>(i*4))&0x0f;
      str += vh.toString(16) + vl.toString(16);
    }
    return str;
  };*/

  var cvt_hex = function(val) {
    var str = '';
    var i;
    var v;

    for (i = 7; i >= 0; i--) {
      v = (val >>> (i * 4)) & 0x0f;
      str += v.toString(16);
    }
    return str;
  };

  var blockstart;
  var i, j;
  var W = new Array(80);
  var H0 = 0x67452301;
  var H1 = 0xEFCDAB89;
  var H2 = 0x98BADCFE;
  var H3 = 0x10325476;
  var H4 = 0xC3D2E1F0;
  var A, B, C, D, E;
  var temp;

  str = this.utf8_encode(str);
  var str_len = str.length;

  var word_array = [];
  for (i = 0; i < str_len - 3; i += 4) {
    j = str.charCodeAt(i) << 24 | str.charCodeAt(i + 1) << 16 | str.charCodeAt(i + 2) << 8 | str.charCodeAt(i + 3);
    word_array.push(j);
  }

  switch (str_len % 4) {
    case 0:
      i = 0x080000000;
      break;
    case 1:
      i = str.charCodeAt(str_len - 1) << 24 | 0x0800000;
      break;
    case 2:
      i = str.charCodeAt(str_len - 2) << 24 | str.charCodeAt(str_len - 1) << 16 | 0x08000;
      break;
    case 3:
      i = str.charCodeAt(str_len - 3) << 24 | str.charCodeAt(str_len - 2) << 16 | str.charCodeAt(str_len - 1) <<
        8 | 0x80;
      break;
  }

  word_array.push(i);

  while ((word_array.length % 16) != 14) {
    word_array.push(0);
  }

  word_array.push(str_len >>> 29);
  word_array.push((str_len << 3) & 0x0ffffffff);

  for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
    for (i = 0; i < 16; i++) {
      W[i] = word_array[blockstart + i];
    }
    for (i = 16; i <= 79; i++) {
      W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
    }

    A = H0;
    B = H1;
    C = H2;
    D = H3;
    E = H4;

    for (i = 0; i <= 19; i++) {
      temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    for (i = 20; i <= 39; i++) {
      temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    for (i = 40; i <= 59; i++) {
      temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    for (i = 60; i <= 79; i++) {
      temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    H0 = (H0 + A) & 0x0ffffffff;
    H1 = (H1 + B) & 0x0ffffffff;
    H2 = (H2 + C) & 0x0ffffffff;
    H3 = (H3 + D) & 0x0ffffffff;
    H4 = (H4 + E) & 0x0ffffffff;
  }

  temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
  return temp.toLowerCase();
}

