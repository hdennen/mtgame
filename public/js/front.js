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
	var $playWrap = $('#playWrap');
	var $gameNotes = $('#gameNotes');
	var $movie = $('#movieStuff');
	var $sendAnswer = $('#send-answer');
	var $answer = $('#answer');

	var	$p1 = $('#p1nick');
	var	$p2 = $('#p2nick');
	var	$p1s = $('#p1score');
	var	$p2s = $('#p2score');

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

 //nicknames controls==============================
	$nickForm.submit(function(e){
		e.preventDefault();
		socket.emit('new user', $nickBox.val(), function(data){
			if(data){
				$('#nickWrap').hide();
				$('#contentWrap').show();
			} else {
				$nickError.html("Somebody's already using that one :( try again.").addClass('alert alert-danger').show().delay(1000).fadeOut("slow");
			}
		});
		$nickBox.val('');
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
		socket.emit('send message', $messageBox.val());
		$messageBox.val('');
	});
	//receive message
	socket.on('new message', function(data){
		if(data.nick === 'robot'){
			$chat.append('<p class="alert alert-info"><b>'+ data.nick + ': </b>' + data.msg + "</p>");
		}else{
			$chat.append('<b>'+ data.nick + ': </b>' + data.msg + "</br>");
		}
		
	});
	//to do: do some check scroll magic on new message.

	//leave arcade
	socket.on('leave arcade', function(){
		$('#contentWrap').hide();
		$('#nickWrap').show();
	});



	//game controls=====================================
	$join.submit(function(e){ //join
		e.preventDefault();
		socket.emit('join request'); //it has the nickname data
	});
	$sendAnswer.submit(function(e){ //answer
		e.preventDefault();
		socket.emit('send answer', $answer.val());
		$answer.val('');
	});

	socket.on('alert', function(data){
		$alerts.html(data.msg).removeClass().addClass('alert '+data.alert).show().delay(1000).fadeOut("slow");
	});

 	socket.on('show board', function(){
		$playWrap.show();
		$joinWrap.hide();
	});
	 socket.on('hide board', function(){
		$playWrap.hide();
		$joinWrap.show();
	});

  //game play updates =======================================
	socket.on('game message', function(data){
		$gameNotes.removeClass().html(data.msg).addClass('alert '+data.alert).show().delay(1000).fadeOut("slow");
	});

	socket.on('game data', function(data){ //gets whole object at first.
		$p1.html(data.player1);
		$p2.html(data.player2);
		$p1s.html(data.p1score);
		$p2s.html(data.p2score);
		$movie.html('').html(data.movies[data.round][0]);
	});	

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

});
