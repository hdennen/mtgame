//app.js

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var nicknames = [];
var game = new Game();

function Game(){ //game object
	this.player1 = '';
	this.player2 = '';
	this.p1score = 0;
	this.p2score = 0;
	this.movies = [['Casablanca',1942],['Whiplash',2014],['Memento',2000]]; //test data before live calls
}

function createGame(){ //create blank game
	game = new Game();
}

function addPlayer1(player){
	game.player1 = player //passed from socket.nickname
}
function addPlayer2(player){
	game.player2 = player //passed from socket.nickname
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



	//game controls ==========================
	socket.on('join request', function(){ //add players to game
		if(game.player1 != '' && game.player2 != ''){
			io.sockets.emit('new message', {msg: socket.nickname+', the game is full dude.', nick: 'robot'});
			console.log("game full");
		}else if(game.player1 === ''){
			addPlayer1(socket.nickname);
			io.sockets.emit('new message', {msg: socket.nickname+' created a new game!', nick: 'robot'});
			console.log(game);
		}else if(game.player1 != '' && game.player2 === ''){
			addPlayer2(socket.nickname);
			io.sockets.emit('new message', {msg: socket.nickname+' joined the game!', nick: 'robot'});
			console.log(game);
		}
	});


	//on disconnect=======================================
	socket.on('disconnect', function(data){
		if(!socket.nickname) return; //if leaving before setting nickname
		nicknames.splice(nicknames.indexOf(socket.nickname), 1); //splice user from array
		updateNicks();
	});
});