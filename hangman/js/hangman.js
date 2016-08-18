//MODEL
var model = {
	loggedIn: false,
	user: {
		email: ''
	},
	score: {
			won: 0,
			lost: 0
		}
};

//VIEW

//clears HTML
function clearHtml() {
	$('#menu').html('');
	$('#hangmanContainer').html('');
	$('#gameOver').html('');
	$('#makeContainer').html('');
}

function renderMenu() {
	clearHtml();

	var source = $('#menu-template').html();
	var template = Handlebars.compile(source);
	$('#menu').html(template(model));
}

function renderOver() {
	clearHtml();

	var source = $('#over-template').html();
	var template = Handlebars.compile(source);

	$('#gameOver').html(template(model));
	$('#gameOver').on('click', '#playAgain', menu);
}

function renderGame() {
	clearHtml();

	if (model.win || model.lose) {
		renderOver();
	} else {
		model.imgsrc = 'img/' + model.wrong + '.png'; 
		var source = $('#game-template').html();
		var template = Handlebars.compile(source);
		$('#hangmanContainer').html(template(model));
	}
}

function renderForm() {
	var source = $('#form-template').html();
   	var template = Handlebars.compile(source);
  	$('#formContainer').html(template(model));
}

 //CONTROL

//INIT FUNCTIONS

function getImgSrc() {
	return ('img/' + model.wrong + '.png');
}

function Letter(string) {
	this.name = string;
	this.correct = (model.word.indexOf(this.name) !== -1);
	this.unguessed = true;
}

function initWord(word) {
	var wordUpper = word.toUpperCase();
	var wordArray = wordUpper.split('');
	model.word = wordArray;
	model.guesses = [];
	for (var i = 0; i < model.word.length; i++) {
		var letter = new Letter('_')
		model.guesses.push(letter);
	}
}

function initLetters() {
	model.alphabet = [];
	var alphabet = ['A','B','C','D','E','F','G','H','I',
	'J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
	for (var i = 0; i < alphabet.length; i++) {
		var letter = new Letter(alphabet[i]);
		model.alphabet.push(letter);
	}
}

function initModel() {
	model.word = [];
	model.alphabet = [];
	model.guesses = [];
	model.wrong = 0;
	model.right = 0;
	model.win = false;
	model.lose = false;
	model.imgsrc = '';
	model.randomWord = '';
	model.level = '';
}

//returns length of word to request based on level selected
function getLength() {
	//easy = 4 - 7
	//medium = 8 - 13
	//hard = 14 - 20
	if (model.level === 'easy') {
		return Math.floor((Math.random() * 3) + 4);
	} else if (model.level === 'medium') {
		return Math.floor((Math.random() * 5) + 8);
	} else {
		return Math.floor((Math.random() * 6) + 14);
	}
}

//gets random word via HTTP request; updates model and view
function getRandomWord() {
	var length = getLength();

    $.ajax({
        type: "GET",
        url: "http://randomword.setgetgo.com/get.php?len=" + length,
        dataType: "jsonp",
        success: function (data) {
        	model.randomWord = data.Word;
        	initWord(model.randomWord);
        	initLetters();
        	renderGame();
        }
    });
}

//CONTROLLER

function setup() {
	initModel();
	renderForm();
	menu();

	$('#formContainer').on('click', '#register', handleRegister);
  	$('#formContainer').on('click', '#login', handleLogin);
  	$('#formContainer').on('click', '#signOut', handleSignOut);
  	firebase.auth().onAuthStateChanged(handleAuthStateChange);
}

function handleRegister() {
  var email = $('input[name="email"]').val();
  var password = $('input[name="password"]').val();

  firebase.auth().createUserWithEmailAndPassword(email, password);
}

function handleLogin() {
  var email = $('input[name="email"]').val();
  var password = $('input[name="password"]').val();

  firebase.auth().signInWithEmailAndPassword(email, password);
}

function handleSignOut() {
  firebase.auth().signOut();
}

function handleAuthStateChange() {
  	var user = firebase.auth().currentUser;

	if (user) {
    	model.loggedIn = true;
    	model.user = user;
    	var userId = user.uid;
    	firebase.database().ref('score').child(userId).on('value', processScore);
  	} else {
	    model.loggedIn = false;
	    model.user = undefined;
  	}
  renderForm();
}

//get score when user logs in
function processScore(snapshot) {
	var score = snapshot.val();
	if (!score) {
		var userId = model.user.uid;
		var blankScore = {won: 0, lost: 0};
		firebase.database().ref('score').child(userId).set(blankScore);
		model.score = score;
	} else {
		model.score = score;
		renderForm();
	}
}

//player chooses what level to play
function menu() {
	$('#menu').off();
	initModel();
	renderMenu();

	$('#menu').on('click', '.levels', game);
}


function game() {
	$('#hangmanContainer').off();
	model.level = $(this).attr('id');
	getRandomWord();

	$('#hangmanContainer').on('click', '.unguessed', handleGuess);
	$('#hangmanContainer').on('click', '#newGame', menu);
}

//returns an array of indices of correct letter in word
function getIndices(string) {
	var indices = [];
	var index;
	while (index !== -1) {
		index = model.word.indexOf(string);
		indices.push(index);
		model.word[index] = new Letter('_');
	}
	return indices;	
}

function handleGuess() {
	var index = $(this).index();
	var letter = model.alphabet[index];
	if (letter.correct) {
		var indices = getIndices(letter.name);
		model.right += indices.length -1;
		for (var i = 0; i < indices.length; i++) {
			model.guesses[indices[i]] = letter;
		}
	} else if (model.alphabet[index].unguessed) {
		model.wrong++;
		}
	model.alphabet[index].unguessed = false;
	gameStatus();
}

//checks for win or lose
function gameStatus() {
	if (model.right === model.word.length) {
		model.win = true;
		model.imgsrc = 'img/win.png'
		model.score.won++
	} else if (model.wrong >= 6) {
		model.lose = true;
		model.imgsrc = 'img/lose.png';
		model.score.lost++
	}
	if (model.loggedIn) {
		var userId = model.user.uid;
		firebase.database().ref('score').child(userId).update({
			won: model.score.won,
			lost: model.score.lost
		});
	}
	renderForm();
	renderGame();
}


$(document).ready(setup);
