var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var nicknames = [];

function Game(player1,player2){
	this.player1 = player1;
	this.player2 = player2;
	this.p1score = 0;
	this.p2score = 0;
	this.movies = [['Casablanca',1942],['Whiplash',2014],['Memento',2000]]; //test data before live calls
}

function createGame(data,data){
	var game = new Game(data,data);

}

function addPlayer(socket.nickname){
	game.player2 = socket.nickname
}


server.listen(3000);

	app.use(express.static(__dirname + '/public')); //lemme not deal with individual GET reqs...

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