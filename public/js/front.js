// public/js/front.js

jQuery(function($){
	var socket = io.connect();
	var $nickForm = $('#setNick');
	var $nickError = $('#nickError');
	var $nickBox = $('#nickname');
	var $users = $('#users');
	var $messageForm = $('#send-message');
	var $messageBox = $('#message');
	var $chat = $('#chat');
	//game vars
	var $alerts = $('#alerts');
	var $join = $('#join-request');
	var $joinWrap = $('#joinWrap');
	var $gameArea = $('#gameAreaWrap');
	var $playWrap = $('#playWrap');
	var $gameNotes = $('#gameNotes');
	var $movie = $('#movieStuff');
	var $submission = $('#submission');
	var $sendAnswer = $('#send-answer');
	var $answer = $('#answer');
	var $wait = $('#waiting');
	var $rounds = $('#rounds');
	var round = 0;

	var	$p1 = $('#p1nick');
	var	$p2 = $('#p2nick');
	var	$p1s = $('#p1score');
	var	$p2s = $('#p2score');

	//spectator vars
	var $spectateWrap = $('#spectateWrap');
	var $spectateNotes = $('#spectateNotes');
	var $spectateInfo = $('#spectateInfo');

	function slideFade(elem) {
		$(elem).removeAttr( 'style' );
		if(elem === "#p1up" || elem === "#p2up"){
			$(elem).addClass('text-success');
		}else{
			$(elem).addClass('text-danger');
		}
		$(elem).show();
		$(elem).animate({
		    opacity: 0,
		    //height: 0,
		    marginTop: -100,
		    //marginBottom: 0,
		    //paddingTop: 0,
		    //paddingBottom: 0
		}, 'slow', function() {
		    $(this).hide();
		});
	}

	function keepFading($obj) {
	    $obj.fadeToggle(800, function () {
	        keepFading($obj)
	    });
	}
	function resetClient(){
		round = 0;
		$p1.html('');
		$p2.html('');
		$p1s.html('');
		$p2s.html('');
		$movie.delay(2000).html(''); //to fix: this gets overwritten due to later callback in game data function
		$rounds.delay(2000).html(''); //to fix: this gets overwritten due to later callback in game data function
		$spectateNotes.html('');
		$spectateInfo('');
		console.log("reset client "); //test +++++++++++++++++++++++++++++++++
	}

 //nicknames controls==============================
	$nickForm.submit(function(e){
		e.preventDefault();
		if($nickBox.val().length > 0){
			socket.emit('new user', $nickBox.val(), function(data){
				if(data){ //callback comes back true
					$('#nickWrap').hide();
					$('#contentWrap').show();
				} else {
					$nickError.html("Somebody's already using that one :( try again.").addClass('alert alert-danger').show().delay(1000).fadeOut("slow");
				}
			});
			$nickBox.val('');
		}
	});

	//chat controls====================================
	socket.on('usernames', function(data){ //receive & refresh users list
		var html = '';
		var len = data.length;
		for(i=0;i<len;i++){
			html+=data[i]+'</br>';
		}
		$users.html(html);
	});

	$messageForm.submit(function(e){ //bind event handler to message form. on each submit, send message to server. function with event as param.
		e.preventDefault(); //stops from refreshing the whole page.
		if($messageBox.val() != ''){ //no accidental clicks
			socket.emit('send message', $messageBox.val());
			$messageBox.val('');
		}
	});
	//receive message
	socket.on('new message', function(data){
		if(data.nick === 'robot'){
			$chat.append('<i><b>'+ data.nick + ': </b>' + data.msg + "</i></br>");
		}else{
			$chat.append('<b>'+ data.nick + ': </b>' + data.msg + "</br>");
		}
		$chat.animate({ scrollTop: $chat[0].scrollHeight}, 1000);
	});
	//to do: do some check scroll magic on new message.

	//leave arcade
	socket.on('leave arcade', function(){ //on disconnect
		$('#contentWrap').hide();
		$('#nickWrap').show();
	});



	//game controls=====================================================
	$join.submit(function(e){ //join
		e.preventDefault();
		socket.emit('join request'); //it has the nickname data
	});
	$sendAnswer.submit(function(e){ //answer
		e.preventDefault();
		socket.emit('send answer', $answer.val());
		$answer.val('');
	});

	socket.on('alert', function(data){ //for multiple notifications. 1create div, 2add id, 3pop based on id.
		var $alertHash = (0|Math.random()*9e6).toString(36);
		var $alertDiv = $("<div>", {"id": $alertHash, "class": 'alert '+data.alert}).html(data.msg);
		console.log($alertHash +" "+ $alertDiv); //test+++++++++++++++++++++++++++++++++++
		$alerts.append($alertDiv);
		$($alertDiv).show("fast").delay(2000).fadeOut("slow", function(){
			$alertDiv.remove();
		});
	});

 	socket.on('show board', function(){
		$playWrap.show();
		$joinWrap.hide();
		$spectateWrap.hide();
	});
	 socket.on('hide board', function(){
		$playWrap.hide();
		$joinWrap.show();
	});
	socket.on('start', function(){
		$wait.stop().hide();
		$submission.prop('disabled', false);
		$answer.focus();
		//$('body').scrollTo($gameArea,{duration:'fast'});
	});
	socket.on('wait', function(){
		$wait.show();
		keepFading($($wait));
		$submission.prop('disabled', true);
	});
	socket.on('reset client', function(){
		resetClient();
	});

  //game play updates =========================================================
  //game alerts ------------------------------------------
	socket.on('game message', function(data){
		//$gameNotes.removeClass().html(data.msg).addClass('alert '+data.alert).show().delay(1000).fadeOut("slow");

		var $noteHash = (0|Math.random()*9e6).toString(36); //this takes care of multiple notifications.
		var $noteDiv = $("<div>", {"id": $noteHash, "class": 'alert '+data.alert}).html(data.msg);
		console.log($noteHash +" "+ $noteDiv); //test+++++++++++++++++++++++++++++++++++
		$gameNotes.append($noteDiv);
		$($noteDiv).show("fast").delay(3000).fadeOut("slow", function(){
			$noteDiv.remove();
		});
		$('body').animate({ scrollTop: $('body')[0].scrollHeight}, 1000); //make sure mobile users can see notifications.
		$answer.delay(3000).focus();

	});
	//receive game data -------------------------------------
	socket.on('game data', function(data){ //gets whole object at first.
		$p1.html(data.player1);
		$p2.html(data.player2);
		$p1s.html(data.p1score);
		$p2s.html(data.p2score);
		if(data.round+1 > round && data.round<8){ //populate next round data
				$movie.slideUp("fast", function(){ //callback so switch happens out of sight
					$movie.html('').html(data.movies[data.round][0]).slideDown();
					console.log(data.movies[data.round][0]);
				});
				$rounds.fadeOut("fast", function(){ //callback so fade back in with new number.
					round = data.round+1;
					$rounds.html('').html('round: '+round).fadeIn("fast");
				});
		}else if(data.p1score === 0 && data.p2score === 0 && data.player2.length > 0){ //first game data
				$movie.html('').html(data.movies[data.round][0]).fadeIn("fast");
				round = data.round+1;
				$rounds.html('').html('round: '+round).fadeIn("fast");
				console.log("first data"); //test +++++++++++++++++++++++++++++++++
		}else if(data.player2.length === 0){ //null these while waiting
				$movie.html('');
				round = 0;
				$rounds.html('');
				console.log("data reset"); //test +++++++++++++++++++++++++++++++++
		}
	});	
	//scoring points ----------------------------------------------
	socket.on('points', function(data){
		if(data.player === "p1"){
			if(data.type === "up"){
				slideFade($('#p1up'));
			}else{
				slideFade($('#p1down'));
			}
			
		}else if(data.player === "p2"){
			if(data.type === "up"){
				slideFade($('#p2up'));
			}else{
				slideFade($('#p2down'));
			}
		}
	});

	//spectator updates ======================================================
	socket.on('spectator message', function(data){
		if(data.cmd === 'game running'){
			$spectateWrap.show();
			$spectateNotes.html(data.msg);
		}else if(data.cmd === 'game stopped'){
			$spectateNotes.html(data.msg);
			$spectateWrap.delay(1000).fadeOut(800);
		}
	});

});
