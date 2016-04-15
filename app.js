var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var nicknames = [];

server.listen(3000);

app.get('/', function(req, res){ //send the home page
	res.sendFile(__dirname +'/index.html');
});
//turn on connection event, what happens when user sends something. kind of like document.ready
io.sockets.on('connection', function(socket){ //function with user's socket
	socket.on('new user', function(data, callback){
		if(nicknames.indexOf(data)!= -1){ //check if exists
			callback(false);
		} else { //if not in array
			callback(true);
			socket.nickname = data; //store each user with socket as property of socket.
			nicknames.push(socket.nickname);
			updateNicks();
		}
	});

	function updateNicks(){
		io.sockets.emit('usernames', nicknames); //resend list of users
	}

	socket.on('send message', function(data){ //do something with message data
		io.sockets.emit('new message', {msg: data, nick: socket.nickname});
	});

	socket.on('disconnect', function(data){
		if(!socket.nickname) return; //if leaving before setting nickname
		nicknames.splice(nicknames.indexOf(socket.nickname), 1); //splice user from array
		updateNicks();
	});
});