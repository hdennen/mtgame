
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
	var $join = $('#join-request');
	var $sendAnswer = $('#send-answer');
	var $answer = $('#answer');



	$nickForm.submit(function(e){
		e.preventDefault();
		socket.emit('new user', $nickBox.val(), function(data){
			if(data){
				$('#nickWrap').hide();
				$('#contentWrap').show();
			} else {
				$nickError.html("Somebody's already using that one :( try again.");
			}
		});
		$nickBox.val('');
	});

	//chat controls====================================
	socket.on('usernames', function(data){ //refresh users list
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
	//recieve message
	socket.on('new message', function(data){
		$chat.append('<b>'+ data.nick + ': </b>' + data.msg + "</br>");
	});
	//game controls=====================================



});
