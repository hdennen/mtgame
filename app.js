//app.js

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var request = require('request');
var nicknames = []; //to do: set a limit on this somewhere.
var game = new Game(); //to do: dynamically instantiate this
var gameRunning = false;
var gameBoard = 'gameBoard'; //use socket.io's rooms functionality


function Game(){ //game object
	this.player1 = '';
	this.player2 = '';
	this.p1score = 0;
	this.p2score = 0;
	this.movies = [['Casablanca',1942],['Whiplash',2014],['Memento',2000]]; //test data before live calls
	//to do: populate game.movies from http://api.myapifilms.com/imdb/top?start=1&end=250&token=9cdf9b51-79af-4eeb-95ad-e50f3acaaf4e&format=json&data=0
}

function getMovies(){
	app.get('http://api.myapifilms.com/imdb/top?start=1&end=250&token=9cdf9b51-79af-4eeb-95ad-e50f3acaaf4e&format=json&data=0', function(req, res){
		request(function(err, body){
			if (err)
				res.send(err)
			var topMovies = JSON.parse(body);
			//res.render('', locals);
		});
	});
}

function startGame(){ //run the game
	//by this point the game has players and the gameBoard room is populated with the players.
	gameRunning = true;
	io.sockets.emit('new message', {msg: game.player1 + " and " + game.player2 + " started a game.", nick: 'robot'});
	io.sockets.in(gameBoard).emit('game data', game);
	io.sockets.in(gameBoard).emit('game message', {msg:"The game is afoot!", alert: 'alert-success'});
}

function addPlayer1(socket, player){
	game.player1 = player //passed from socket.nickname
	socket.join(gameBoard);
	socket.emit('show board');
	socket.emit('game message', {msg:"You're in!", alert: 'alert-success'});
}
function addPlayer2(socket, player){
	game.player2 = player //passed from socket.nickname
	socket.join(gameBoard);
	socket.emit('show board');
	socket.emit('game message', {msg:"You're in!", alert: 'alert-success'});
}


server.listen(3000);
app.use(express.static(__dirname + '/public')); //lemme not deal with individual GET reqs... sorry angular.

//turn on connection event, what happens when user sends something. similar to document.ready
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

	//join game-------------------
	socket.on('join request', function(){ //add players to game
		if(game.player1 === socket.nickname || game.player2 === socket.nickname){ //check player's not already in game
			//io.sockets.emit('new message', {msg: socket.nickname+", you're already in the game!", nick: 'robot'});
			socket.emit('alert', {msg:"You're already in the game dummy!", alert: 'alert-danger'});
		}else if(game.player1 != '' && game.player2 != ''){ //check game's not full
			io.sockets.emit('new message', {msg: socket.nickname+', the game is full dude.', nick: 'robot'});
		}else if(game.player1 === ''){ //add as player 1
			addPlayer1(socket, socket.nickname);
			io.sockets.emit('new message', {msg: socket.nickname+' joined the game!', nick: 'robot'});
			console.log(game);
		}else if(game.player1 != '' && game.player2 === ''){ //add as player 2
			addPlayer2(socket, socket.nickname);
			io.sockets.emit('new message', {msg: socket.nickname+' joined the game!', nick: 'robot'});
			console.log(game);
		}
		if(gameRunning === false && game.player1 != '' && game.player2 != ''){
			startGame();
		}
	});
	//maybe do: change emit to specific socket on already joined.

	//game setup -------------------------



	//answers--------------------------
	socket.on('send answer', function(){

	});


	//on disconnect=======================================
	socket.on('disconnect', function(data){
		if(!socket.nickname) return; //if leaving before setting nickname
		nicknames.splice(nicknames.indexOf(socket.nickname), 1); //splice user from array
		updateNicks();
		if(socket.nickname === game.player1){
			game.player1 = '';
			gameRunning = false;
			io.sockets.emit('new message', {msg: socket.nickname+'aborted game and left the arcade.', nick: 'robot'});
			console.log(game);
		}else if(socket.nickname === game.player2){
			game.player2 = '';
			gameRunning = false;
			io.sockets.emit('new message', {msg: socket.nickname+' aborted game and left the arcade.', nick: 'robot'});
			console.log(game);
		}
	});
});