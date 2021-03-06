var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// Load config json file
var nconf = require('nconf');
nconf.file('./settings.json');

var routes = require('./routes/index');
var users = require('./routes/users');

var bodyParser = require('body-parser');

var formidable = require('formidable');
var util = require('util');
var fs = require('fs');
var path = require('path');

var convert = require('netpbm').convert;
var _ = require("underscore");
// database in coachDB
var nano = require('nano')('http://localhost:5984');
var db = nano.use('thehighesthumantower');

var couchDBModel = require('couchdb-model');
var myModel = couchDBModel(db);

var app = express(); // bring app to anyfile
var server = require('http').createServer(app);

var io = null;
//var io = require('socket.io')(server);
// socket goes same port app, because listen app

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

server = require('http').createServer(app);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
//app.engine('html', require('ejs').renderFile);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// parse application/vnd.api+json as json
app.use(bodyParser.json({ type: 'application/vnd.api+json' }))

//app.use('/', routes);
app.use('/users', users);

/*sort results*/
function sortResults(results){
	//sort list by createAt
        // split list in two lists, one with elements with createdAt field and another with the ones that don't have it 
	var datedList   = [];
	var undatedList = [];
        for(var i =0;i<results.length;i++){
		if('createdAt' in results[i]){
			datedList.push(results[i]);
		}else{
			undatedList.push(results[i]);
		}
	}
	//sort the dated list by it createdAt field
	datedList = _.sortBy(datedList,function(obj){return obj['createdAt'];});
	//concatenate both lists
	return undatedList.concat(datedList);	
}

/* Export json */

app.get('/tower-json', function(req, res) {
  myModel.findAll(function(error, results) {
    if (error){
        console.error('failed list documents');
    }else{
        // sort 
	results  = sortResults(results);
	// filter to objects need to display
        var list = [];
        var count = 0;
        for(var i =0;i<results.length;i++){
            var obj = _.pick(results[i],'_id','heightPerson','totalFrames');
            if(obj.heightPerson>100){
                list.push({'heightPerson':obj.heightPerson,'_id':obj._id,'position':count,'totalFrames':obj.totalFrames});   
                count+=1; 
            }
        }
        // return request as json 
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify(list));
    }
  });
});

app.get('/tower-json-all', function(req, res) {
  myModel.findAll(function(error, results) {
    if (error){
        console.error('failed list documents');
    }else{  
	var list = sortResults(results);
        // return request as json 
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify(list));
    }
  });
});
   
/* Receive new interaction */
app.post('/insert-new', function(req, res) {
    // specify the database we are going to use
    
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        // get fields data
        var heightPerson = parseInt(fields.heightPerson);
        var totalFrames = fields.totalFrames;
        var api_key = fields.api_key;
        if(nconf.get('api_key') == api_key && heightPerson>100 && files.animation2048.size>0 ){
            // save to database
            db.insert({'heightPerson': heightPerson,'totalFrames': totalFrames,'createdAt': Date.now() }, function(err, body, header) {
                if (err) {
                    console.log('[db.insert] ', err.message);
                    return;
                }
                myModel.findAll(function(error, results) {
                    // Upload to internet
                    var position = 0;
                    for(var i=0;i<results.length;i++){
			    if(results[i]['heightPerson']>100){
				    position++;
			    }
		    }
		    position = position - 1 ; //point the last element
		    console.log(position);
                    var humanInfo = {'_id':body.id,'heightPerson':heightPerson,'position':position,'totalFrames':totalFrames};
                    console.log(humanInfo);
            		res.setHeader('Content-Type','application/json');
            		res.end(JSON.stringify(humanInfo));
            		console.log(body);

            		var serverPath = __dirname +'/public/img/';
            		console.log(serverPath);
            		// Create Folder
                    // Animation2048
                    var imgfilepath = serverPath+'temp/'+body.id+path.extname(files.animation2048.name);
            		
                    //move downloaded file with document's id
                    fs.writeFileSync(imgfilepath, fs.readFileSync(files.animation2048.path));
                    
                    //run python script to resize and update the spritesheets
            		var exec = require('child_process').exec;
            		var child = exec(__dirname +'/public/img/generateSpriteSheets.py '+imgfilepath+' '+position,
        			{cwd:__dirname +'/public/img/'},
        			function (error, stdout, stderr) {
        				console.log('stdout: ' + stdout);
        				console.log('stderr: ' + stderr);
        				if (error !== null) {
        					console.log('exec error: ' + error);
        				}
        			});
        		
                    // Give information that have new human after 5s
                    setTimeout(function(){
                        io.sockets.emit('new-human',humanInfo);   
                    },5000);
                });
                
            });
        }else{
            console.log('Error not valid API KEY:'+api_key+" =="+nconf.get('api_key'));
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify({}));
        }
    });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// configure your socket.io instance here
server.listen(3000, function() {
    io = require('socket.io').listen(server);
    routes.io = io;
    // server started
    io.on('connection', function(socket){
        console.log("connected socket");
      
    });
});

module.exports = app;


