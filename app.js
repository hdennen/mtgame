//app.js

//setup==============================
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var request = require('request');
var cheerio = require('cheerio');
//var mongoose = require('mongoose');
var nicknames = []; //to do: set a limit on this.
var game = new Game(); //maybe do: dynamically instantiate this for multiple simultanious games later
var gameRunning = false;
var gameBoard = 'gameBoard'; //use socket.io's rooms functionality
var spectators = 'spectators'; //room for spectators, everyone auto joined.

//var topMoviesAPI = '';//OLD
var topMovies = ''; //store what we scrape.
scrapeMovies();

//to do: finish top winning streak storage
/*mongoose.connect('mongodb://myArcade:my@rcad3@waffle.modulusmongo.net:27017/awOmoj9i')
var topStreaks = mongoose.model('tops', {
    text : String
});*/


server.listen(3000);
app.use(express.static(__dirname + '/public')); //lemme not deal with individual GET reqs...
//scraper api
app.get('/api/scraper', function(req, res) {
  res.send(topMovies);
});


//functions===============================
function scrapeMovies(){
  var url = 'http://www.imdb.com/chart/top';
  console.log("Begin scraping.");//test++++++++++++++++++++++++++++++
  request(url, function(error, response, body){
    if(!error && response.statusCode == 200){
      console.log("scraping complete.");//test++++++++++++++++++++++++++++++
      var $ = cheerio.load(body);
      var title = "";
      var year = "";
      var rank = 1;
      topMovies = {"data":{"movies":[]}};
      $('tbody.lister-list').filter(function(){
        $('tr').each(function(){
          var movieJSON = {};
          movieJSON.title = $(this).children('td.titleColumn').children('a').text(); //some of these don't come back in english...
          movieJSON.year = $(this).children('td.titleColumn').children('span').text().replace(/[()]/g, ''); //regex remove parenthesis.
          if(movieJSON.title != ''){ //weird null at beginning and some at end, filter them out here.
          	topMovies.data.movies.push(movieJSON);
          }
        });
      });
    } 
  });
}



function Game(){ //game object
	this.player1 = '';
	this.player2 = '';
	this.p1score = 0;
	this.p2score = 0;
	this.p1socket = '';
	this.p2socket = '';
	this.keys = [];
	this.round = 0;
	this.movies = [['','']];
}
//old method
/*function getMovies(){ //do once to reduce api calls
	console.log("calling API");
	request.get('http://api.myapifilms.com/imdb/top?start=1&end=250&token=9cdf9b51-79af-4eeb-95ad-e50f3acaaf4e&format=json&data=0', function(error, response, body){
		console.log("response received");
    if (!error && response.statusCode == 200) {
        topMoviesAPI = body; //for some reason it doesn't like this... so we'll run it through a parser.
        console.log("returning movies");
        //return body;
    }
	});
}*/

function addPlayer1(socket){ //socket id and nickname
	game.player1 = socket.nickname; //passed from socket.nickname
	game.p1socket = socket.id; //store player's socket in game
	socket.leave(spectators);
	socket.join(gameBoard);
	socket.emit('show board');
	socket.emit('wait');
	socket.emit('game message', {msg:"You're in!", alert: 'alert-success'});
}
function addPlayer2(socket){
	game.player2 = socket.nickname; //passed from socket.nickname
	game.p2socket = socket.id; //store player's socket in game
	socket.leave(spectators);
	socket.join(gameBoard);
	socket.emit('show board');
	socket.emit('game message', {msg:"You're in!", alert: 'alert-success'});
	startGame();
}

function genKeys(){ //8 random keys for movies
	for(var i=0;i<8;i++){
		game.keys.push(Math.floor(Math.random() * (250)) + 1); //random number between 1 adn 250
		console.log("generating movie key");
	}
/*	if(topMovies === ''){
		topMovies = JSON.parse(topMoviesAPI); //just making sure this gets done after api is called. to do: find a better way to do this.
	}*/
}

function popMovies(keys, callback){ //populate movies based on keys on callback to make sure they're populated first.
	game.movies = [];
	for(var item of keys){
		console.log("populating movie");
		game.movies.push([topMovies.data.movies[item].title, topMovies.data.movies[item].year]);
	}
}

function startGame(){ //run the game
	//by this point the game has players and the gameBoard room is populated with the players.
	gameRunning = true;
	popMovies(game.keys, genKeys());
	io.sockets.emit('new message', {msg: game.player1 + " and " + game.player2 + " started a game.", nick: 'robot'});
	io.sockets.in(gameBoard).emit('game data', game);
	io.sockets.in(gameBoard).emit('game message', {msg:"The game is afoot!", alert: 'alert-success'});
	io.sockets.in(gameBoard).emit('start');
	io.sockets.in(spectators).emit('spectator message', {cmd:'game running', msg: game.player1 + " and " + game.player2 + " are currently playing."}); //on new join too if gameRunning===true
	console.log(game); //test+++++++++++++++++++++++++++
}

function resetGame(socket){ //resets and puts winner as player 1, to do: check for empty socket? meh, soft fails and resets empty game anyway...
	console.log("resetting game."); //test+++++++++++++++++++++++++++
	gameRunning = false;
	game = new Game();
	addPlayer1(socket);
	io.sockets.in(gameBoard).emit('game data', game);
	//console.log(game); //test+++++++++++++++++++++++++++
}

function getSocket(socketID){
	console.log("getting socket of " + socketID); //test+++++++++++++++++++++++++++
	return io.sockets.sockets[socketID];;
}

function wrongAnswerHelp(data, socket){
	var diff = Math.abs(data - game.movies[game.round][1]);
	if(data === 'quit'){
		removeMe(socket);
	}else	if(data === ''){
		socket.emit('game message', {msg:"Did you accidentally submit? Tough, you still lose points.", alert:"alert-danger"});
	}else if(diff < 4){
		socket.emit('game message', {msg:"so close!", alert:"alert-success"});
	}else if(diff < 11){
		socket.emit('game message', {msg:"Hey, you're within a decade, not too shabby for a guess.", alert:"alert-warning"});
	}else if(diff < 21){
		socket.emit('game message', {msg:"ehh, close but not close.", alert:"alert-warning"});
	}else if(diff < 31){
		socket.emit('game message', {msg:"You're showing your generation here...", alert:"alert-danger"});
	}else if(diff < 51){
		socket.emit('game message', {msg:"almost half a century off, wow...", alert:"alert-danger"});
	}else {
		socket.emit('game message', {msg:"You've never heard of this movie have you?", alert:"alert-danger"});
	}
	if(data > game.movies[game.round][1]){ //if guess high
		socket.emit('game message', {msg:"go lower!", alert:"alert-danger"});
	}else if(data < game.movies[game.round][1]){ //low guess
		socket.emit('game message', {msg:"go higher!", alert:"alert-info"});
	}
};

function removeMe(socket){
	socket.leave(gameBoard);
	socket.join(spectators);
	io.sockets.in(spectators).emit('spectator message', {cmd:'game stopped', msg: "You can now join!"});
	socket.emit('reset client');
	socket.emit('hide board');
	socket.emit('alert', {msg: "You left the game.", alert: "alert-info"});
	io.sockets.emit('new message', {msg: socket.nickname+' left the game.', nick: 'robot'});
	if(io.sockets.adapter.rooms[gameBoard] == undefined){
		game = new Game();
	}else if(socket.id === game.p1socket) {
		var sock = getSocket(game.p2socket);
		sock.emit('reset client');
		sock.emit('alert', {msg: "Your opponent bailed.", alert: "alert-info"});
		resetGame(sock);
	}else if(socket.id === game.p2socket){
		var sock = getSocket(game.p1socket);
		sock.emit('reset client');
		sock.emit('alert', {msg: "Your opponent bailed.", alert: "alert-info"});
		resetGame(sock);
	}
}


//turn on connection event, what happens when user sends something. similar to document.ready
io.sockets.on('connection', function(socket){ //function with user's socket

	//chat controls===========================================================================================================

	socket.on('new user', function(data, callback){
		if(nicknames.indexOf(data)!= -1){ //check if exists
			callback(false);
		} else { //if not in array
			callback(true);
			socket.nickname = data; //store each user with socket as property of socket.
			nicknames.push(socket.nickname);
			updateNicks();
			socket.emit('new message', {msg: 'Hi '+socket.nickname+', welcome to the arcade! </br> Click join to join a trivia game. I will send movie titles from the IMDB top 250 list and you have to guess the year (old movies too). </br> 5 points for correct answer, -3 for a wrong answer, highest points after 8 rounds wins! </br>You can also type quit as an answer to quit if the game is going badly for you...', nick: 'robot'});
			socket.emit('alert', {msg:"Welcome to the Arcade.", alert: 'alert-success'});
			socket.join(spectators); //join spectator room
			if(gameRunning === true){
				io.sockets.in(spectators).emit('spectator message', {cmd:'game running', msg: game.player1 + " and " + game.player2 + " are currently playing."});
			}
		}
	});

	function updateNicks(){
		io.sockets.emit('usernames', nicknames); //resend list of users
	}

	socket.on('send message', function(data){ //put user message in group chat
		io.sockets.emit('new message', {msg: data, nick: socket.nickname});
	});



	//game controls ================================================================================

	//join game-------------------
	socket.on('join request', function(){ //add players to game
		if(game.player1 === socket.nickname || game.player2 === socket.nickname){ //check player's not already in game
			socket.emit('alert', {msg:"You're already in the game dummy!", alert: 'alert-danger'});
		}else if(game.player1 != '' && game.player2 != ''){ //check game's not full
			socket.emit('alert', {msg:"whoa there, this game is full.", alert: 'alert-danger'});
		}else if(game.player1 === '' && socket.nickname != undefined){ //add as player 1
			addPlayer1(socket);
			io.sockets.emit('new message', {msg: socket.nickname+' joined the game!', nick: 'robot'});
			console.log(game); //test+++++++++++++++++++++++++++
		}else if(game.player1 != '' && game.player2 === '' && socket.nickname != undefined){ //add as player 2
			addPlayer2(socket);
			io.sockets.emit('new message', {msg: socket.nickname+' joined the game!', nick: 'robot'});
			console.log(game); //test+++++++++++++++++++++++++++
		}
/*		if(gameRunning === false && game.player1 != '' && game.player2 != ''){
			startGame();
		}*/
	});

	//game setup -------------------------



	//answers-------------------------------------------------------------------------
	socket.on('send answer', function(data){
		if(data == game.movies[game.round][1]){ 
			game.round++;
			if(socket.nickname === game.player1){
				game.p1score += 5;
				io.sockets.in(gameBoard).emit('points', {msg:"+5", type:"up", player:"p1"});
				socket.emit('game message', {msg:"Nice!", alert:"alert-success"});
			}else if(socket.nickname === game.player2){
				game.p2score += 5;
				io.sockets.in(gameBoard).emit('points', {msg:"+5", type:"up", player:"p2"});
				socket.emit('game message', {msg:"Nice!", alert:"alert-success"});
			}
		}else {
			if(socket.nickname === game.player1){
				game.p1score -= 3;
				io.sockets.in(gameBoard).emit('points', {msg:"-3", type:"down", player:"p1"});
				wrongAnswerHelp(data, socket);
				
			}else if(socket.nickname === game.player2){
				game.p2score -= 3;
				io.sockets.in(gameBoard).emit('points', {msg:"-3", type:"down", player:"p2"});
				wrongAnswerHelp(data, socket);
				//socket.emit('game message', {msg:"Oh no!", alert:"alert-danger"});
			}
		}
		io.sockets.in(gameBoard).emit('game data', game);

		//game end------------------------------------------
		if(game.round === 8){
			io.sockets.in(gameBoard).emit('alert', {msg:"Game Over", alert: 'alert-info'});
			io.sockets.in(gameBoard).emit('reset client');
			var p1fullSock = getSocket(game.p1socket);
			var p2fullSock = getSocket(game.p2socket);
			if(game.p1score > game.p2score){ //player 1 wins
				var diff = game.p1score - game.p2score;
				io.sockets.emit('new message', {msg: game.player1+' won the last game by ' + diff +' points!', nick: 'robot'});
				io.to(game.p2socket).emit('hide board');
				io.to(game.p1socket).emit('alert', {msg:"You won!", alert: 'alert-success'});
				io.to(game.p2socket).emit('alert', {msg:"You lost, bye bye!", alert: 'alert-danger'});
				//reset game
				p2fullSock.leave(gameBoard);
				p2fullSock.join(spectators);
				resetGame(p1fullSock); //put player 1 in a new game
			}else if(game.p1score < game.p2score){ //player 2 wins
				var diff = game.p2score - game.p1score;
				io.sockets.emit('new message', {msg: game.player2+' won the last game by ' + diff +' points!', nick: 'robot'});
				io.to(game.p1socket).emit('hide board');
				io.to(game.p2socket).emit('alert', {msg:"You won!", alert: 'alert-success'});
				io.to(game.p1socket).emit('alert', {msg:"You lost, bye bye!", alert: 'alert-danger'});
				//reset game
				p1fullSock.leave(gameBoard);
				p1fullSock.join(spectators);
				resetGame(p2fullSock);
			}else { //if they tie then they both lose and the game resets.
				io.sockets.in(gameBoard).emit('hide board');
				io.sockets.in(gameBoard).emit('alert', {msg: "y'all tied! So you're both off the board :)", alert: "alert-danger"});
				io.sockets.in(gameBoard).emit('reset client');
				p1fullSock.leave(gameBoard);
				p1fullSock.join(spectators);
				p2fullSock.leave(gameBoard);
				p2fullSock.join(spectators);
				game = new Game();
				gameRunning = false;
			}
			

		}
	});

	socket.on('remove me', function(){ //does nothing right now.
		removeMe(socket);
	})
		


	//on disconnect=============================================================

	socket.on('disconnect', function(data){
		if(!socket.nickname) return; //if leaving before setting nickname
		nicknames.splice(nicknames.indexOf(socket.nickname), 1); //splice user from array
		updateNicks();
		socket.emit('leave arcade'); //will reset to nickname page
		if(socket.nickname === game.player1){
			//io.sockets.in(gameBoard).emit('reset client');
			gameRunning = false;
			io.sockets.emit('new message', {msg: socket.nickname+' aborted game and left the arcade.', nick: 'robot'});
			io.sockets.in(spectators).emit('spectator message', {cmd:'game stopped', msg: "You can join now."});
			//io.sockets.in(spectators).emit('spectator message', {cmd:'game running', msg: "game ended."});
			//reset game
			if(game.p2socket){
				resetGame(getSocket(game.p2socket));
			}else{
				game = new Game();
			}
			
			console.log(game); //test+++++++++++++++++++++++++++

		}else if(socket.nickname === game.player2){
			//io.sockets.in(gameBoard).emit('reset client');
			gameRunning = false;
			io.sockets.emit('new message', {msg: socket.nickname+' aborted game and left the arcade.', nick: 'robot'});
			io.sockets.in(spectators).emit('spectator message', {cmd:'game stopped', msg: "You can join now."});
			//reset game
			resetGame(getSocket(game.p1socket));

			console.log(game); //test+++++++++++++++++++++++++++

		}
	});
});