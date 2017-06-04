/**
 * Copyright Antti Lamminsalo, 2014
 */

var APIkey = 'AIzaSyAvUkwnZgyRixQ6oM86DzvHBTU4nKop9uQ';

//Global DOM element variables

var playlistDOM = document.getElementById('playlist');
var playlistsDOM = document.getElementById('playlists');
var resultsDOM = document.getElementById('searchList');
var queueDOM = document.getElementById('queuelist');

//Document load functions begin

window.onload = function () {
	if (!isMobile() && !is_touch_device()) {
		createSortables();
	}
	else {
		document.getElementById('addPlaylistButton').style.visibility = 'visible';
	}
};

var lptimer;
function _longPressDown(e, el){
	e.stopPropagation();
	var self = el || this;
	self.addEventListener('touchend', _cancelPress);
	self.addEventListener('touchmove', _cancelPress);

	lptimer = setTimeout(function(){
		e.preventDefault();
		_cancelPress();
		showContextMenu(e, self)
	},1000);

	function _cancelPress(){
		clearTimeout(lptimer);
		self.removeEventListener('touchend', _cancelPress);
		self.removeEventListener('touchmove', _cancelPress);
	}
}

var plSortable = undefined;
function createSortables(){
	plSortable = Sortable.create(playlistsDOM, {
		animation: 50, // ms, animation speed moving items when sorting, `0` — without animation
		draggable: ".container", // Specifies which items inside the element should be sortable
		ghostClass: 'ghost',
		onUpdate: function (evt/**Event*/){
			//console.log(evt);
			playlists.dragSort(evt.oldIndex, evt.newIndex);
			refreshPlaylists();
			saveStoredPlaylists();
		}
	});

	Sortable.create(playlistDOM, {
		animation: 50, // ms, animation speed moving items when sorting, `0` — without animation
		draggable: ".container", // Specifies which items inside the element should be sortable
		ghostClass: 'ghost',
		onUpdate: function (evt/**Event*/){
			selectedList.items.dragSort(evt.oldIndex, evt.newIndex);
			refresh();
			saveStoredPlaylists();
		}
	});

	Sortable.create(queueDOM, {
		animation: 50, // ms, animation speed moving items when sorting, `0` — without animation
		draggable: ".container", // Specifies which items inside the element should be sortable
		ghostClass: 'ghost',
		onUpdate: function (evt/**Event*/) {
			queue.items.dragSort(evt.oldIndex, evt.newIndex);
			queue.update();
		}
	});
}

function dropItem(e){
	console.log(e.dataTransfer.getData("el"));
	e.preventDefault();
	console.log(e.target);
}

function onItemDrag(e, self){
	//console.log(self);
	e.dataTransfer.setData("el", self);
}

//DOM event listeners
function onLoaded() {
	fillStorageIfEmpty();
	loadStoredPlaylists();
	selectedList = playlists[0];
	if (window.location.href.indexOf('#') !== -1) {
		parseURI(window.location.href);
	}
	setupListeners();
}

function getContainer(el, parent){
	while (el.parentNode !== parent){
		el = el.parentNode;
	}
	if (!el.className.match(/container|result/i)){
		return null;
	}
	return el;
}

function setupDelegate(self, trigger, fn, passObject, passEvent){
	self.addEventListener(trigger, function(e){
		var item = getContainer(e.target,this);
		//console.log(item);
		if (item){
			if (passEvent){
				fn(e,passObject ? item : item.getAttribute('index'));
			} else {
				fn(passObject ? item : item.getAttribute('index'));
			}
		}
		//e.stopPropagation();
	});
}

function setupListeners() {
	//Playback buttons
	document.getElementById("nextButton").addEventListener('click', getNext);
	document.getElementById("prevButton").addEventListener('click', getPrev);
	document.getElementById("playIcon").addEventListener('click', togglePause);
	document.getElementById("clearSearchButton").addEventListener('click', clearSearch);
	document.getElementById("addPlaylistButton").addEventListener('click', addPlaylist);
	document.getElementById("queueButton").addEventListener('click', toggleQueue);
	document.getElementById("shuffleButton").addEventListener('click', toggleShuffle);
	document.getElementById('img-wrap').addEventListener('click', showOverlayPlayer);


	//Static contextmenu spawning elements and hiders

	//document.body.addEventListener('click', hideContextMenu);
	//if (!isMobile()){
	setupDelegate(playlistDOM, 'click', selectItem);
	setupDelegate(playlistsDOM, 'click', selectPlaylist);
	setupDelegate(resultsDOM, 'click', addResultAndCloseSearch, true);
	setupDelegate(queueDOM, 'click', skipQueueTo);
	setupDelegate(playlistsDOM, 'dblclick', editPlaylist);
	document.body.addEventListener('contextmenu', showContextMenu);
	document.getElementById('playlists-wrap').addEventListener('contextmenu', showContextMenu);
	setupDelegate(playlistDOM, 'contextmenu', showContextMenu, true, true);
	setupDelegate(playlistsDOM, 'contextmenu', showContextMenu, true, true);
	setupDelegate(resultsDOM, 'contextmenu', showContextMenu, true, true);
	setupDelegate(queueDOM, 'contextmenu', showContextMenu, true, true);

	if (!isMobile()) {
		document.getElementById('listHandle').addEventListener('mousedown', function (e) {
			var self = document.getElementById('playlists-wrap');
			var startX = e.clientX;
			var startWidth = self.offsetWidth;
			var dragEvent = true;
			var _move = function (e) {
				if (dragEvent) {
					self.style.width = (startWidth + e.clientX - startX) + 'px';
				}
			};
			self.parentNode.addEventListener('mousemove', _move);
			self.parentNode.addEventListener('mouseup', function _up() {
				dragEvent = false;
				self.parentNode.removeEventListener('mousemove', _move);
				self.parentNode.removeEventListener('mouseup', _up);
			}, false);
		}, false);
	}

	//} else {
	if (isMobile()){
		document.body.addEventListener('touchstart', _longPressDown);
		document.getElementById('playlists-wrap').addEventListener('touchstart', _longPressDown);
		setupDelegate(playlistDOM, 'touchstart', _longPressDown, true, true);
		setupDelegate(playlistsDOM, 'touchstart', _longPressDown, true, true);
		setupDelegate(resultsDOM, 'touchstart', _longPressDown, true, true);
		setupDelegate(queueDOM, 'touchstart', _longPressDown, true, true);
		//document.body.addEventListener('click', showContextMenu);
		//document.getElementById('playlists-wrap').addEventListener('click', showContextMenu);
		//setupDelegate(playlistDOM, 'click', showContextMenu, true, true);
		//setupDelegate(playlistsDOM, 'click', showContextMenu, true, true);
		//setupDelegate(resultsDOM, 'click', showContextMenu, true, true);
		//setupDelegate(queueDOM, 'click', showContextMenu, true, true);
	}

	document.getElementById("posBar").addEventListener('click', function (e) {
		if (activeItem && player.getPlayerState() === 1 || player.getPlayerState() === 2 || player.getPlayerState() === 3) {
			var value = (e.pageX - this.offsetLeft) / this.offsetWidth;
			player.seekTo(activeItem.timesecs * value);
			document.getElementById("posfg").style.width = value * 100 + '%';
		}
	}, false);

	document.getElementById("searchbox").addEventListener('input', function () {
		setTimeout(function () {
			search();
		}, 400);
	}, false);

	document.addEventListener('keydown', function (e) {
		switch (e.keyCode) {
			case 32:
				if (document.activeElement.nodeName !== 'INPUT') {
					togglePause();
					e.preventDefault();
					return false;
				}
				break;
			case 39:
				if (document.activeElement.nodeName !== 'INPUT') {
					getNext();
				}
				break;
			case 37:
				if (document.activeElement.nodeName !== 'INPUT'){
					getPrev();
				}
				break;
			case 81:
				if (e.ctrlKey) {
					document.getElementById("searchbox").focus();
				}
				break;
			case 90:
				if (e.ctrlKey) {
					addPlaylist();
				}
				break;
			case 49:
				if (document.activeElement.nodeName !== 'INPUT' && playlists.length > 0) {
					selectPlaylist(0);
				}
				break;
			case 50:
				if (document.activeElement.nodeName !== 'INPUT' && playlists.length > 1) {
					selectPlaylist(1);
				}
				break;
			case 51:
				if (document.activeElement.nodeName !== 'INPUT' && playlists.length > 2) {
					selectPlaylist(2);
				}
				break;
			case 52:
				if (document.activeElement.nodeName !== 'INPUT' && playlists.length > 3) {
					selectPlaylist(3);
				}
				break;
			case 53:
				if (document.activeElement.nodeName !== 'INPUT' && playlists.length > 4) {
					selectPlaylist(4);
				}
				break;
			case 54:
				if (document.activeElement.nodeName !== 'INPUT' && playlists.length > 5) {
					selectPlaylist(5);
				}
				break;
			case 55:
				if (document.activeElement.nodeName !== 'INPUT' && playlists.length > 6) {
					selectPlaylist(6);
				}
				break;
			case 56:
				if (document.activeElement.nodeName !== 'INPUT' && playlists.length > 7) {
					selectPlaylist(7);
				}
				break;
			case 57:
				if (document.activeElement.nodeName !== 'INPUT' && playlists.length > 8) {
					selectPlaylist(8);
				}
				break;
		}
	});
}

//Parsing functions begin
function parseURI(str) {
	var regex = /playeri\.net\/?#.+=/;

	if (str.match(regex)){
		str = str.slice(str.indexOf('#') + 1)

		var pl_title = str.slice(0, str.indexOf('='));
		var pl_items = str.slice(str.indexOf('=') + 1).split(',');

		playlists.push(new Playlist(decodeURIComponent(pl_title) + ' (Shared)'));

		fetchItems(pl_items, playlists.last());
		window.location.hash = '';
	}
}

function parseDuration(str, self) {
	str = str.slice(str.indexOf('PT') + 2);
	var hours = str.substr(0, str.indexOf('H'));
	str = str.slice(str.indexOf('H') + 1);
	var minutes = str.substr(0, str.indexOf('M'));
	str = str.slice(str.indexOf('M') + 1);
	var seconds = str.substr(0, str.indexOf('S'));
	str = '';
	self.timesecs = 0;
	if (hours) {
		str += hours + ':';
		self.timesecs += parseInt(hours) * 3600;
	}
	if (minutes) {
		str += minutes + ':';
		self.timesecs += parseInt(minutes) * 60;
	}
	else {
		str += '0:';
	}
	if (seconds) {
		if (seconds.length > 1) {
			str += seconds;
		}
		else {
			str += '0' + seconds;
		}
		self.timesecs += parseInt(seconds);
	}
	else {
		str += '00';
	}
	self.duration = str;
}

function secondsToTime(time){
	time += 1;
	var seconds = time % 60;
	var minutes = Math.floor(time / 60);
	var hours = null;
	if (minutes > 59){
		hours = Math.floor(minutes / 60);
		minutes = minutes % 60;
	}

	return ((hours ? hours + ':' : '') + minutes + ':' + (seconds < 10 ? '0':'') + seconds);
}

function matchYoutubeUrl(url) {
	var p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
	return (url.match(p)) ? RegExp.$1 : false;
}

//Embedded player functions begin

var player;
var playerVisible;
var HighQuality = false;
var isPlaying = false;

function showPlayer() {
	document.getElementById("current-wrap").style.marginBottom = '0';
	playerVisible = true;
}

function hidePlayer() {
	document.getElementById("current-wrap").style.marginBottom = '-48px';
	playerVisible = false;
}

function onPlayerReady() {
	onLoaded();
}

function onPlayerStateChange(event) {
	switch (event.data) {
		case YT.PlayerState.ENDED:
			getNext();
			break;

		case YT.PlayerState.PLAYING:
			document.getElementById("playIcon").classList.remove("icon-play");
			document.getElementById("playIcon").classList.add("icon-pause");
			if (HighQuality) {
				player.setPlaybackQuality(player.getAvailableQualityLevels()[0]);
			} else {
				player.setPlaybackQuality('suggestedQuality');
			}
			errorCounter = 0;
			break;

		case YT.PlayerState.PAUSED:
			document.getElementById("playIcon").classList.remove("icon-pause");
			document.getElementById("playIcon").classList.add("icon-play");
			break;
	}
}

function onError() {
	activeItem.setError();
	errorCounter++;
	getNext();
}

function onYouTubeIframeAPIReady() {
	player = new YT.Player('player', {
		height: '100%',
		width: '100%',
		playerVars: {
			'autohide': '1',
			'controls': '1',
			'iv_load_policy': '3'
		},
		events: {
			'onStateChange': onPlayerStateChange,
			'onReady': onPlayerReady,
			'onError': onError
		}
	});
}

//Search and arrange functions

function clearSearch() {
	document.getElementById("searchbox").value = '';
	resultsDOM.clear();
	document.getElementById("results-wrap").style.height = '0';
	tokenList = '';
	document.getElementById("clearSearchButton").classList.add('hidden');
}

var tokenList = '';
var nextToken = '';

var _scrollEvent = function () {
	//console.log(this.scrollTop + this.offsetHeight , this.scrollHeight);
	if ((this.scrollTop + this.offsetHeight > this.scrollHeight - 4) && nextToken) {
		//console.log(tokenList);
		if (tokenList.indexOf(nextToken) === -1) {
			tokenList += nextToken + "|";
			search(nextToken);
		}
		document.getElementById('results-wrap').removeEventListener('scroll', _scrollEvent);
	}
};

function search(token) {
	if (!token) {
		token = '';
		tokenList = [];
	}
	if (matchYoutubeUrl(document.getElementById("searchbox").value)) {
		var request0 = new XMLHttpRequest();
		request0.onreadystatechange = function () {
			document.getElementById("searchbox").value = '';
			if (this.readyState === 4) {
				var result = JSON.parse(request0.responseText);
				toPlaylist(result.items[0].id, result.items[0].snippet.title, result.items[0].contentDetails.duration, selectedList);
			}
		};
		request0.open('GET', 'https://www.googleapis.com/youtube/v3/videos?key=' + APIkey + '&part=snippet,contentDetails&fields=items(id,snippet(title),contentDetails(duration))&id=' + matchYoutubeUrl(document.getElementById("searchbox").value), true);
		request0.send();
	}
	else {
		if (document.getElementById("searchbox").value) {
			document.getElementById("clearSearchButton").classList.remove('hidden');
			var str = document.getElementById("searchbox").value.toLowerCase();
			str = str.replace(/' '/g, '%20');
			var request = new XMLHttpRequest();
			request.onreadystatechange = function () {
				if (this.readyState === 4 && document.getElementById("searchbox").value) {
					var result = JSON.parse(request.responseText);
					nextToken = result.nextPageToken;
					document.getElementById("results-wrap").style.height = '100%';
					if (!token) {
						resultsDOM.clear();
						document.getElementById('results-wrap').scrollTop = 0;
					}
					var results = [];

					var plContainers = [];
					for (var i = 0; i < 25 && i < result.pageInfo.totalResults; i++) {
						if (result.items[i] !== null) {
							results[i] = document.createElement("div");
							//results[i].id = "result" + i;
							results[i].className = i % 2 === 0 ? "result" : "result lighter";

							createResultTemplate(results[i], result.items[i]);

							if (results[i].getAttribute('data-pid')){
								plContainers.push(results[i]);
							}
							resultsDOM.appendChild(results[i]);
						}
					}
					getPlaylistItemsCount(plContainers);
					document.getElementById('results-wrap').addEventListener('scroll', _scrollEvent, true);
				}
			};
			request.open('GET', 'https://www.googleapis.com/youtube/v3/search?key=' + APIkey +
				'&part=snippet&fields=nextPageToken,pageInfo(totalResults),items(id(videoId,playlistId),snippet(title,thumbnails(default)))&maxResults=25&type=video,playlist&q=' + str +
					'&pageToken=' + token, true);
			request.send();
		} else {
			document.getElementById("results-wrap").style.height = '0';
			document.getElementById("clearSearchButton").classList.add('hidden');
			tokenList = '';
		}
	}
}

function createResultTemplate(container, resultItem) {
	//console.log(resultItem);
	container.innerHTML = '<span class="title">' + resultItem.snippet.title + '</span>';
	if (resultItem.id.videoId) {
		container.innerHTML += '<span class="inforight result-item">Item</span>';
		container.setAttribute('data-vid', resultItem.id.videoId);
	}
	else {
		container.innerHTML += '<span class="inforight result-pl">Playlist</span>';
		container.setAttribute('data-pid', resultItem.id.playlistId);
	}
	container.innerHTML += '<span class="thumbnail"><img src="' + resultItem.snippet.thumbnails.default.url + '" height="40"/></span>';
	container.setAttribute('data-title', resultItem.snippet.title);

	container.setAttribute('_context', 'result');
}

function getPlaylistItemsCount(containers){
	var request = new XMLHttpRequest();

	request.onreadystatechange = function () {
		if (this.readyState === 4) {
			var result = JSON.parse(request.responseText);
			//console.log(result);

			for(var i = 0; i < containers.length; i++) {
				containers[i].children[1].textContent += ' (' + result.items[i].contentDetails.itemCount + ')';
			}
		}
	};
	var query = 'https://www.googleapis.com/youtube/v3/playlists?key=' + APIkey +
		'&part=contentDetails&fields=items(id,contentDetails)&id=';
	for (var i = 0; i < containers.length; i++){
		query += (i > 0 ? ',':'') + containers[i].getAttribute('data-pid');
		//console.log(containers[i].getAttribute('data-pid'));
	}
	//console.log(query);
	request.open('GET', query, true);
	request.send();
}

//For quickly adding content and closing the search, on CLICK
function addResultAndCloseSearch(item) {
	//Add new single items to existing list, new playlists to their own lists
	if (item.getAttribute('data-pid')){
		//playlists.push(new Playlist('Playlist ' + (playlists.length + 1)));
	}
	addResult(item, playlists.last());
	clearSearch();
	selectPlaylist(playlists.length - 1);
}

function addResult(item, playlist) {
	//console.log(item, playlist);
	playlist = playlist || selectedList;

	if (!playlist || playlists.indexOf(playlist) === -1) {
		addPlaylist();
		playlist = selectedList;
	}
	playlist.setSpinner(true);

	if (item.getAttribute('data-vid')){
		toPlaylist(item.getAttribute('data-vid'), item.getAttribute('data-title'), false, playlist);
	}
	else if (item.getAttribute('data-pid')) {
		arrangePlaylist(item.getAttribute('data-pid'), playlist);
		if (!playlist.renamed) {
			playlist.title = item.getAttribute('data-title');
			playlist.Container.children[0].innerHTML = item.getAttribute('data-title');
			playlist.renamed = true;
		}
	}
	item.children[0].innerHTML += '<span class = "svgicon active2 icon-check"></span>';
	refresh();
}

//Gets lists of id data with minimum number of API calls
function fetchItems(idArray, playlist, save) {
	//console.log("at item mashup!");
	if (playlist) {
		var request = new XMLHttpRequest();
		request.onreadystatechange = function () {
			if (this.readyState === 4) {
				var result = JSON.parse(request.responseText);
				//console.log(result);
				for (var i = 0; i < result.items.length; i++) {
					toPlaylist(result.items[i].id, result.items[i].snippet.title, result.items[i].contentDetails.duration, playlist);
					//console.log(count,playlist.items.length);
				}
				if (idArray.length > 0) {
					fetchItems(idArray, playlist, save);
				}
				else{
					playlist.setSpinner(false);

					if (save){
						saveStoredPlaylists();
					}

					refresh();
				}

			}
		};
		var query = 'https://www.googleapis.com/youtube/v3/videos?key=' + APIkey +
			'&part=snippet,contentDetails&fields=items(id,snippet(title),contentDetails(duration))&id=' +
			idArray.splice(0, 50).join();
		//console.log(query);
		request.open('GET', query, true);
		request.send();
		playlist.setSpinner(true);
	}
}

function arrangePlaylist(id, playlist, token, idArray) {
	var request = new XMLHttpRequest();
	idArray = idArray || [];
	request.onreadystatechange = function () {
		if (this.readyState === 4) {
			var result = JSON.parse(request.responseText);

			for (var i = 0; i < result.items.length; i++) {
				if (result.items[i].snippet.title && result.items[i].snippet.title !== 'Private video') {
					idArray.push(result.items[i].snippet.resourceId.videoId);
				}
			}

			if (result.nextPageToken) {
				arrangePlaylist(id, playlist, result.nextPageToken, idArray);
			}
			else {
				fetchItems(idArray, playlist, true);
			}
		}
	};
	token = token || '';
	request.open('GET', 'https://www.googleapis.com/youtube/v3/playlistItems?key=' + APIkey + '&part=snippet&maxResults=50&playlistId=' + id +
		'&fields=nextPageToken,items/snippet(title,resourceId/videoId)&pageToken=' + token, true);
	request.send();
}

function getListOf(item) {
	for (var i = 0; i < playlists.length; i++) {
		if (playlists[i].items.indexOf(item) !== -1) {
			return playlists[i];
		}
	}
	return null;
}


//Playback control functions begin

var intervalId = null;
function playVideo(selection) {
	if (selection) {
		if (activeItem) {
			activeItem.Container.classList.remove('active');
		}
		activeItem = selection;
		activeItem.Container.classList.add('active');

		player.loadVideoById(activeItem.videoId);
		document.getElementById('current-title').textContent = activeItem.title;
		document.getElementById('current-duration').textContent = '0:00/'+activeItem.duration;

		//Deprecated
		//getItemThumb(activeItem);

		document.title = activeItem.title;

		if (activeList && activeList.items.indexOf(activeItem) === -1) {
			activeList = getListOf(activeItem) || activeList;
		}

		if (!playerVisible) {
			showPlayer();
		}

		isPlaying = true;
		if (intervalId) {
			clearInterval(intervalId);
		}
		intervalId = setInterval(function () {
			//console.log(activeItem);
			if (activeItem) {
				document.getElementById("posfg").style.width = 100 * player.getCurrentTime() / activeItem.timesecs + '%';
				document.getElementById('current-duration').textContent = secondsToTime(parseInt(player.getCurrentTime())) + '/' + activeItem.duration;
			}
		}, 1000);
	}
}

function togglePause() {
	//stopPlaying();
	if (player.getPlayerState() !== 2) {
		player.pauseVideo();
	}
	else if (player.getPlayerState() !== -1) {
		player.playVideo();
	}
	if (!isPlaying) {
		showPlayer();
		playVideo(activeList.items[0]);
	}
}

var errorCounter = 0;
function getNext() {
	if (queue.hasItems()) {
		//console.log("Next from queue");
		playVideo(queue.popItem());
	}
	else if (activeItem && activeList && activeList.items.length > 0 && errorCounter < activeList.items.length) {
		//console.log("Next from activelist");
		playVideo(activeList.getNext(activeItem));
	} else{
		stopPlaying();
	}
}

function getPrev() {
	if (activeItem && activeList && activeList.items.length > 0) {
		playVideo(activeList.getPrevious(activeItem));
	} else{
		stopPlaying();
	}
}

function stopPlaying() {
	document.title = 'Playeri.net - Play music and videos from YouTube';
	player.stopVideo();
	player.clearVideo();
	hidePlayer();
	isPlaying = false;
}

var ShuffleOn = false;
function toggleShuffle() {
	var icon = document.getElementById("shuffleButton");
	icon.classList.toggle("alt");
	ShuffleOn = !ShuffleOn;
	if (ShuffleOn) {
		//icon.getElementsByClassName('tip')[0].innerHTML = 'Unshuffle';
		activeList.createShuffle();
	}
	//else {
	//icon.getElementsByClassName('tip')[0].innerHTML = 'Shuffle';
	//}
}

//Item functions

var activeItem = null;

function Item(videoId, videoTitle, videoDuration, index) {
	this.title = videoTitle;
	this.duration = '';
	this.videoId = videoId;
	this.Container = document.createElement("li");
	this.Container.className = 'container';
	this.Container.setAttribute('_context', 'item');
	this.Container.setAttribute('index', index);

	this.timesecs = '';
	parseDuration(videoDuration, this);

	this.Container.innerHTML = '<span class="title">' + this.title + '</span>' +
		'<span class="inforight">' + this.duration + '</span>';

	if (!Item.prototype.setError) {
		Item.prototype.setError = function () {
			//this.error = true;
			this.Container.classList.add('error');
		};
	}
}

function _onItemContext(e){
	showContextMenu(e, getContainer(e.target));
}

function selectItem(index) {
	//console.log(index);
	var item = selectedList.items[index];

	if (item && activeItem !== item) {
		if (activeList !== selectedList) {
			/*if (ShuffleOn === true){
		toggleShuffle();
	    }*/
			activeList = selectedList;
		}
		playVideo(item);
	}
}


function removeItem(index, playlist) {
	playlist = playlist || selectedList;
	playlist.removeItem(index);
}

//Item creator

function fetchItem(videoId, playlist){
	var request = new XMLHttpRequest();
	request.onreadystatechange = function () {
		if (this.readyState == 4) {
			var result = JSON.parse(request.responseText);
			if (result.items[0] != null) {
				playlist.addItem(videoId, result.items[0].snippet.title, result.items[0].contentDetails.duration);
				saveStoredPlaylists();
				playlist.setSpinner(false);
				refreshPlaylists();
			}
		}
	}
	request.open('GET', 'https://www.googleapis.com/youtube/v3/videos?key=' + APIkey + '&part=snippet,contentDetails&fields=items(contentDetails(duration),snippet(title))&id=' + videoId, true);
	request.send();
}


function toPlaylist(id, title, duration, playlist) {
	if (id) {
		if (!(title && duration)) {
			fetchItem(id,playlist);
		}
		else {
			playlist.addItem(id, title, duration);
			playlist.setSpinner(false);
		}
	}
}


// playlist section

var playlists = [];
var activeList = null;
var selectedList = null;

Node.prototype.clear = function(){
	while(this.firstChild){
		this.removeChild(this.firstChild);
	}
}

function refresh() {
	playlistDOM.clear();

	refreshPlaylists();

	if (QueueVisible){
		queue.update();
	} else if (selectedList) {
		selectedList.refreshItems();
		for (var j = 0; j < selectedList.items.length; j++) {
			playlistDOM.appendChild(selectedList.items[j].Container);
		}
	}
}

function Playlist(title) {
	this.title = title;
	this.index = playlists.length;
	this.items = [];
	this.renamed = false;
	this.Container = document.createElement('li');
	this.Container.className = 'container';
	this.shuffleList = [];
	this.loading = false;
	this.Container.setAttribute('index', this.index);
	this.Container.setAttribute('_context', 'playlist');
	this.Container.setAttribute('title', 'Double click to rename');

	this.titleDOM = document.createElement('span');
	this.titleDOM.className = 'title';
	this.titleDOM.textContent = title;

	this.renameDOM = document.createElement('span');
	this.renameDOM.className = 'title hidden';
	this.renameDOM.innerHTML = '<input class="playlist-rename textbox" type="text">';

	this.countDOM = document.createElement('span');
	this.countDOM.className = 'inforight';
	this.countDOM.textContent = '0';

	this.Container.appendChild(this.titleDOM);
	this.Container.appendChild(this.renameDOM);
	this.Container.appendChild(this.countDOM);


	if (!Playlist.prototype.createShuffle) {
		Playlist.prototype.createShuffle = function () {
			this.shuffleList = [];
			if (this.items.length > 1) {
				for (var j = 0; j < this.items.length; j++){
					this.shuffleList[j] = j;
				}
				for (var i = this.shuffleList.length - 1; i > 0; i--) {
					var random = Math.floor((Math.random() * i));
					var tmpIndex = this.shuffleList[random];
					this.shuffleList[random] = this.shuffleList[i];
					this.shuffleList[i] = tmpIndex;
				}
			}
		};
	}

	if (!Playlist.prototype.getNext) {
		Playlist.prototype.getNext = function (item) {
			var index = this.items.indexOf(item);
			//console.log(item,index,this.title,this.index);
			if (index !== -1) {
				index++;
				if (!ShuffleOn || this.items.length < 3) {
					return index < this.items.length ? this.items[index] : this.items[0];
				}
				else {
					if (this.shuffleList.length !== this.items.length){
						this.createShuffle();
					}
					return index < this.items.length ? this.items[this.shuffleList[index]] : this.items[this.shuffleList[0]];
				}
			}
		};
	}

	if (!Playlist.prototype.getPrevious) {
		Playlist.prototype.getPrevious = function (item) {
			var index = this.items.indexOf(item);
			if (index !== -1) {
				index--;
				if (!ShuffleOn || this.items.length < 3) {
					return index > -1 ? this.items[index] : this.items.last();
				}
				else {
					return index > 0 ? this.items[this.shuffleList[index]] : this.items[this.shuffleList.last()];
				}
			}
		};
	}

	if (!Playlist.prototype.refreshItems) {
		Playlist.prototype.refreshItems = function () {
			for (var i = 0; i < this.items.length; i++) {
				this.items[i].Container.setAttribute('index', i);
			}
		};
	}

	if (!Playlist.prototype.setSpinner){
		Playlist.prototype.setSpinner = function(on){
			this.countDOM.className = on ? 'inforight spinner icon-spin3' : 'inforight';
		};
	}

	if (!Playlist.prototype.addItem){
		Playlist.prototype.addItem = function(id, title, duration) {
			var index = this.items.length;
			this.items.push(new Item(id, title, duration));
			this.items.last().Container.setAttribute('index', index);
			this.countDOM.textContent = this.items.length;
			if (this === selectedList) {
				playlistDOM.appendChild(this.items.last().Container);
			}
		}
	}

	if (!Playlist.prototype.removeItem){
		Playlist.prototype.removeItem = function(index){
			var item = this.items[index];

			if (item) {
				item.Container.removeAttribute("onclick");

				if (item === activeItem){
					getNext();
				}

				if (this === selectedList){
					playlistDOM.removeChild(item.Container);
				}

				this.items.splice(index,1);
				this.countDOM.textContent = this.items.length;

				this.refreshItems();

				saveStoredPlaylists();
			}
		}
	}

	if (this.index === 0) {
		this.Container.classList.add('activePl');
		activeList = this;
	}
	playlistsDOM.appendChild(this.Container);
}

function refreshPlaylists(){
	for (var i = 0; i < playlists.length; i++){
		playlists[i].Container.setAttribute('index', i);
	}
}

// playlist class end

var editedPlaylist;

var _renameDone = function (e) {
	if (e && (e.keyCode !== 13) && e.type !== 'blur') {
		return;
	}

	this.removeEventListener('blur', _renameDone);
	this.removeEventListener('keyup', _renameDone);
	//console.log(this);
	editedPlaylist.Container.classList.remove('editing');

	var name = editedPlaylist.titleDOM;
	var rename = editedPlaylist.renameDOM;
	//console.log(rename);
	name.classList.remove('hidden');
	rename.classList.add('hidden');
	rename = rename.children[0];

	if (rename.value){
		name.textContent = rename.value;
		//name.setAttribute('title', rename.value);
		editedPlaylist.title = rename.value;
		editedPlaylist.renamed = true;
		saveStoredPlaylists();

		editedPlaylist = null;
	}
	if (!isMobile() && plSortable){
		plSortable.option("disabled", false);
	}
};

function editPlaylist(index) {
	var playlist = playlists[index];

	if (playlist && editedPlaylist !== playlist) {
		if (!isMobile() && plSortable){
			plSortable.option("disabled", true);
		}
		editedPlaylist = playlist;
		playlist.Container.classList.add('editing');

		var name = playlist.Container.children[0];
		localStorage.removeItem('playlist_' + name.getAttribute('title'));
		name.classList.add('hidden');


		var rename = playlist.Container.children[1];
		rename.classList.remove('hidden');
		rename = rename.children[0];
		rename.value = name.textContent;
		rename.select();
		rename.focus();

		rename.addEventListener('blur', _renameDone);
		rename.addEventListener('keyup', _renameDone);
	}
}

function selectPlaylist(index) {
	var selection = playlists[index];
	//console.log(selection);
	if (selection && (QueueVisible || selectedList !== selection)) {
		if (QueueVisible) {
			toggleQueue();
		}
		if (selectedList){
			selectedList.Container.classList.remove('activePl');
		}
		selectedList = selection;
		selectedList.Container.classList.add('activePl');
		refresh();
	}
}


function removePlaylist(index) {
	//console.log(index);
	var playlist = playlists[index];

	if (playlist/* && confirm('Really remove ' + playlist.title + ' ?')*/) {
		playlist.Container.removeAttribute("onclick");
		playlist.Container.removeAttribute("ondblclick");
		if (playlist === activeList && !queue.hasItems()) {
			activeList = null;
			stopPlaying();
		}
		if (playlist === selectedList) {
			selectedList = null;
			playlist.items = [];
		}

		playlist.Container.parentNode.removeChild(playlist.Container);
		playlists.removeObj(playlist);
		for (var i = index; i < playlists.length; i++) {
			playlists[i].index--;
		}
		refresh();
		saveStoredPlaylists();
	}
}

function fillStorageIfEmpty() {
	if (!localStorage.getItem("playlist_names")) {
		localStorage.setItem('playlist_Playlist 1', JSON.stringify([]));
		localStorage.setItem('playlist_names', JSON.stringify(['Playlist 1']));
	}
}

function saveStoredPlaylists() {
	//console.log('saving');
	localStorage.clear();
	var playlistNames = [];
	var date = new Date();
	var unixTime = date.getTime();
	for (var i = 0; i < playlists.length; i++) {
		playlistNames.push(playlists[i].title + '|' + (unixTime + i));
		var playlistContent = [];
		for (var ii = 0; ii < playlists[i].items.length; ii++) {
			playlistContent.push(playlists[i].items[ii].videoId);
		}
		localStorage.setItem('playlist_' + playlists[i].title + '|' + (unixTime + i), JSON.stringify(playlistContent));
	}
	localStorage.setItem('playlist_names', JSON.stringify(playlistNames));
}

function loadStoredPlaylists() {
	var playlistNameArray = JSON.parse(localStorage.getItem('playlist_names'));
	for (var i = 0; i < playlistNameArray.length; i++) {
		var playlistContent = localStorage.getItem('playlist_' + playlistNameArray[i]);
		playlists.push(new Playlist(playlistNameArray[i].split('|')[0]));
		var IdArray = JSON.parse(playlistContent);
		fetchItems(IdArray, playlists[i]);
	}
	if (!playlists[0]){
		addPlaylist();
	}
}

Array.prototype.last = function () {
	return this[this.length - 1];
};

Array.prototype.dragSort = function(oldIndex, newIndex) {
	var item = this.splice(oldIndex,1)[0];
	this.splice(newIndex, 0, item);
}

Array.prototype.removeObj = function (object) {
	var index = this.indexOf(object);
	if (index === -1){
		return false;
	}
	this.splice(index, 1);
	return true;
};

function addPlaylist() {
	playlists.push(new Playlist('Playlist ' + (playlists.length + 1)));
	selectPlaylist(playlists.length - 1);
}

function createClickGuard(){
	var clickGuard = document.createElement('div');
	document.body.appendChild(clickGuard);

	clickGuard.id = 'clickGuard';
	clickGuard.className = 'screen';
	clickGuard.style.zIndex = '99';

	clickGuard.addEventListener('click', function(e){
		hideContextMenu();
		e.stopPropagation();
		e.preventDefault();
	});
	clickGuard.addEventListener('contextmenu', function(e){
		hideContextMenu();
		e.stopPropagation();
		e.preventDefault();
	});
}

var contextMenu = null;
function showContextMenu(e, el) {
	hideContextMenu();
	e.preventDefault();
	e.stopPropagation();
	var self = el || this;
	e = e || window.event;

	createClickGuard();

	var pos = getPosition(e);

	self.classList.add('hover-on');

	contextMenu = document.createElement('table');
	contextMenu.className = 'dark-ui contextmenu';
	contextMenu.addEventListener('click', hideContextMenu);

	var index = self.getAttribute('index');
	//console.log(this.getAttribute('_context'));
	switch (self.getAttribute('_context')) {

		case 'playlist-add':
			contextMenu.innerHTML =
				'<tr class="menuitem" onclick="addPlaylist()"><td class="svgicon menuicon icon-plus"></td><td>New Playlist</td></tr>';
			break;

		case 'playlist':
			contextMenu.innerHTML =
				'<tr class="menuitem" onclick="selectPlaylist(' + index + ')"><td class="svgicon menuicon icon-eye"></td><td>Show</td></tr>' +
				'<tr class="menuitem" onclick="editPlaylist(' + index + ')"><td class="svgicon menuicon icon-pencil"></td><td>Edit</td></tr>' +
				'<tr class="menuitem" onclick="share(' + index + ')"><td class="svgicon menuicon icon-link"></td><td>Share</td></tr>' +
				'<tr class="menuitem" onclick="removePlaylist(' + index + ')"><td class="svgicon menuicon icon-cancel"></td><td>Remove</td></tr>';
			break;

		case 'item':
			contextMenu.innerHTML =
				'<tr class="menuitem" onclick="addToQueue(' + index + ')"><td class="svgicon menuicon icon-list-add"></td><td class="menuEntry">Queue</td></tr>' +
				'<tr class="menuitem" onclick="selectItem(' + index + ')"><td class="svgicon menuicon icon-play"></td><td class="menuEntry">Play</td></tr>' +
				'<tr class="menuitem" onclick="showItemUrl(' + index + ')"><td class="svgicon menuicon icon-link"></td><td class="menuEntry">Get Link</td></tr>' +
				'<tr class="menuitem" onclick="removeItem(' + index + ')"><td class="svgicon menuicon icon-cancel"></td><td class="menuEntry">Remove</td></tr>';
			break;

		case 'result':
			contextMenu.innerHTML =
				(selectedList ? '<tr class="menuitem"><td class="svgicon menuicon icon-plus"></td><td>Add to ' + selectedList.title + '</td></tr>'
					: '<tr style="display:none;"><td></td><td></td></tr>') +
				'<tr class="menuitem"><td class="svgicon menuicon icon-level-down"></td><td>To new playlist</td></tr>';

			var addButton = contextMenu.children[0].children[0];
			addButton.addEventListener('click', function () {
				addResult(self, null);
			});

			var addButton2 = contextMenu.children[0].children[1];
			addButton2.addEventListener('click', function () {
				playlists.push(new Playlist('Playlist ' + (playlists.length + 1)));
				addResult(self, playlists.last());
			});
			break;

		case 'queue':
			contextMenu.innerHTML =
				'<tr class="menuitem" onclick="skipQueueTo(' + index + ')"><td class="svgicon menuicon icon-level-down"></td><td>Skip to this</td></tr>' +
				'<tr class="menuitem" onclick="removeQueueItem(' + index + ')"><td  class="svgicon menuicon icon-cancel"></td><td>Remove</td></tr>';
			break;

		case 'about':
			contextMenu.innerHTML =
				'<tr class="menuitem" onclick="showAbout()"><td class="svgicon menuicon icon-help"></td><td>About</td></tr>';
			break;

		default:
			hideContextMenu();
			return;
	}
	document.body.appendChild(contextMenu);

	contextMenu.style.top = pos.y + 'px';
	contextMenu.style.left = pos.x + 'px';
	fitContextMenu(pos);

	//window.getComputedStyle(contextMenu).opacity;
	contextMenu.style.opacity = 1;

}

function hideContextMenu() {
	if (contextMenu) {
		contextMenu.parentNode.removeChild(contextMenu);
		contextMenu = null;
		[].forEach.call(document.querySelectorAll('.hover-on'), function (el) {
			el.classList.remove('hover-on');
		});
	}

	var clickGuard = document.getElementById('clickGuard');

	if (clickGuard) {
		clickGuard.parentNode.removeChild(clickGuard);
	}
}


function fitContextMenu(pos) {
	if (contextMenu) {
		if (pos.x + contextMenu.offsetWidth > window.innerWidth) {
			contextMenu.style.left = (pos.x - (pos.x + contextMenu.offsetWidth - window.innerWidth)) + 'px';
		}
		if (pos.y + contextMenu.offsetHeight > window.innerHeight) {
			contextMenu.style.top = (pos.y - (pos.y + contextMenu.offsetHeight - window.innerHeight)) + 'px';
		}
	}
}

function getPosition(e) {
	var posx = 0;
	var posy = 0;

	if (e.pageX || e.pageY) {
		posx = e.pageX;
		posy = e.pageY;
	} else if (e.clientX || e.clientY) {
		posx = e.clientX + document.body.scrollLeft +
			document.documentElement.scrollLeft;
		posy = e.clientY + document.body.scrollTop +
			document.documentElement.scrollTop;
	}

	return {
		x: posx,
		y: posy
	};
}

var _mobile = null;
function isMobile() {
	if (_mobile = null){
		(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))_mobile = true})(navigator.userAgent||navigator.vendor||window.opera);
	}
	if (_mobile)
		console.log("Mobile device detected.");
	else
		console.log("Desktop device detected.");

	return _mobile;
}

//Queue functions
var queue = new Queue();

function Queue() {
	this.Container = queueDOM;
	this.items = [];

	if (!Queue.prototype.hasItems) {
		Queue.prototype.hasItems = function () {
			return (this.items.length > 0);
		};
	}

	if (!Queue.prototype.pushItem) {
		Queue.prototype.pushItem = function (item) {
			this.items.push(item);
			item.Container.classList.toggle('queued');
			this.update();
		};
	}

	if (!Queue.prototype.popItem) {
		Queue.prototype.popItem = function () {
			var item = this.items.shift();
			item.Container.classList.toggle('queued');
			this.update();
			return item;
		};
	}

	if (!Queue.prototype.removeItemAt) {
		Queue.prototype.removeItemAt = function (index) {
			var item = this.items.splice(index, 1)[0];
			item.Container.classList.toggle('queued');
			this.update();
		};
	}

	if (!Queue.prototype.update) {
		Queue.prototype.update = function () {
			if (this.hasItems()) {
				document.getElementById("queueButton").classList.add('alt');
				this.Container.clear();
				for (var i = 0; i < this.items.length; i++) {
					var item = document.createElement('li');
					item.className = 'container';
					item.innerHTML = this.items[i].Container.innerHTML; //We dont want the same element referenced here
					item.setAttribute('index', i);
					item.setAttribute('_context', 'queue');
					this.Container.appendChild(item);
				}
			}
			else {
				document.getElementById("queueButton").classList.remove('alt');
				this.Container.innerHTML = '<div class="empty-queue"><span>Empty Queue</span></div>';
			}
		};
	}

	if (!Queue.prototype.show) {
		Queue.prototype.show = function () {
			this.update();
		};
	}

	if (!Queue.prototype.close) {
		Queue.prototype.close = function () {
			//this.Container.style.height = '0%';
		};
	}
}

function addToQueue(index) {
	var item = selectedList.items[index];
	if (item){
		queue.pushItem(item);
	}
	if (!isPlaying){
		getNext();
	}

}

function removeQueueItem(index) {
	queue.removeItemAt(index);
}

function skipQueueTo(index) {
	var item = queue.items[index];
	if (item) {
		for (var i = 0; i < index; i++) {
			queue.popItem();
		}
		playVideo(queue.popItem());
	}
}

var QueueVisible = false;

function toggleQueue() {
	QueueVisible = !QueueVisible;
	var icon = document.getElementById("queueButton");
	icon.classList.toggle("queueactive");
	if (QueueVisible) {
		//icon.getElementsByClassName('tip')[0].innerHTML = "Hide queue";
		document.getElementById('PlaylistContainer').style.left = '-100%';
		//document.getElementById('results-wrap').style.left = '50%';
		queue.update();
	}
	else {
		document.getElementById('PlaylistContainer').style.left = '0';
		refresh();
	}
}

function showQueue() {
	queue.show();
}


// share functions begin
var short = yourls.connect("http://playeri.net/public_api.php");

function share(index) {
	var playlist = playlists[index];
	if (!playlist){
		return false;
	}
	var shareWrap = document.createElement('div');
	var shareBox = document.createElement('input');
	shareBox.className = "selectable textbox";
	shareWrap.appendChild(shareBox);

	var tooLong = false;
	var URLstr = window.location.host + '#' + playlist.title + '=';
	for (var i = 0; i < playlist.items.length; i++) {
		URLstr += (i > 0 ? ',' : '') + playlist.items[i].videoId;
		if (URLstr.length > 6910){
			tooLong = true;
			break;
		}
	}


	if (playlist.items.length > 0) {
		short.shorten(encodeURIComponent(URLstr), function (url) {
			shareBox.value = url.shorturl;
			shareBox.focus();
			shareBox.select();
		});
	} else {
		shareBox.value = 'Empty list :(';
	}

	showDim();
	var share = document.createElement('span');
	share.className = 'panel dark-ui smaller';
	share.addEventListener('click', function(e){ e.stopPropagation();});
	share.addEventListener('contextmenu', function(e){ e.stopPropagation();});
	dimmer.appendChild(share);
	share.innerHTML = '<h2>Share playlist</h2>' + '<p>' + playlist.title + '</p>';
	share.appendChild(shareWrap);

	if (tooLong){
		share.innerHTML += '<p class="smaller">' + 'Some items were left out (list too long)' + '</p>';
	}
	shareBox.focus();
	shareBox.select();
}

function showItemUrl(index){
	showDim();

	var shareBox = document.createElement('span');
	dimmer.appendChild(shareBox);

	shareBox.className = 'panel dark-ui smaller';
	shareBox.innerHTML = '<h2>Link to video </h2><p>' + selectedList.items[index].title + '</p';

	shareBox.addEventListener('click', function(e){ e.stopPropagation();});
	shareBox.addEventListener('contextmenu', function(e){ e.stopPropagation();});

	var shareInput = document.createElement('input');
	shareBox.appendChild(shareInput);

	shareInput.className = "selectable textbox";
	shareInput.value = 'https://youtu.be/'+selectedList.items[index].videoId;

	shareInput.focus();
	shareInput.select();

}

function showAbout() {
	showDim();
	var about = document.createElement('span');
	about.className = 'panel dark-ui smaller';
	about.innerHTML = '<h2>Playeri.net</h2>' +
		'<p>&copy; Antti Lamminsalo 2014 - 2015</p>' +
		'<p>antti.lamminsalo@playeri.net</p>' +
		'</br><h2>Special thanks</h2>' +
		'<p><a href="https://fortawesome.github.io/Font-Awesome/">Font Awesome</a></p>' +
		'<p><a href="http://www.entypo.com/">Entypo</a></p>' +
		'<p><a href="https://modernpictograms.com/">Modern Pictograms</a></p>' +
		'<p><a href="http://fontello.com">Fontello</a></p>';
	about.addEventListener('click', function(e){ e.stopPropagation();});
	about.addEventListener('contextmenu', function(e){ e.stopPropagation();});
	dimmer.appendChild(about);
}

var dimmer = null;
function showDim(){
	if (dimmer){
		clearTimeout(dimtimer);
		document.body.removeChild(dimmer);
	}
	dimmer = document.createElement('div');
	dimmer.id = 'screendim';
	dimmer.className = 'centerX centerY';
	dimmer.addEventListener('click', hideOverlayPlayer);
	dimmer.addEventListener('contextmenu', hideOverlayPlayer, true);
	dimmer.style.zIndex = 200;
	document.body.appendChild(dimmer);
	dimmer.style.opacity = 0;
	window.getComputedStyle(dimmer).opacity;
	dimmer.style.opacity = 1;
}

function showOverlayPlayer(){
	showDim();
	var player = document.getElementById('player-wrap');
	player.classList.add('playerOverlay');
	player.style.height = '60vh';
	player.style.width = 1.7777 * player.offsetHeight + 'px';
}

function hideOverlayPlayer(e){
	var player = document.getElementById('player-wrap');
	//player.style.height = '0';
	player.classList.remove('playerOverlay');
	player.style.height = 'initial';
	player.style.width = 'initial';
	//player.style.zIndex = -1;
	unDim();
	e.stopPropagation();
	e.preventDefault();
}

var dimtimer;
function unDim() {
	//var screenDim = document.getElementById('screendim');
	if (dimmer) {
		dimmer.style.opacity = 0;
		dimtimer = setTimeout(function () {
			if (dimmer) {
				document.body.removeChild(dimmer);
				dimmer = null;
			}
		}, 400);
		hideContextMenu();
	}
}

function getItemThumb(item){
	var req = new XMLHttpRequest();
	req.onreadystatechange = function () {
		if (this.readyState === 4) {
			var result = JSON.parse(req.responseText)
			document.getElementById('current-img').setAttribute('src', result.items[0].snippet.thumbnails.default.url);
		}
	};
	var url = 'https://www.googleapis.com/youtube/v3/videos?key=' + APIkey + '&part=snippet&fields=items(snippet(thumbnails(default)))&id=' + item.videoId;
	//console.log(url);
	req.open('GET', url, true);
	req.send();
}

var settings = null;
function showSettings(){
	showDim();
	if (!settings) {
		settings = document.createElement('span');
		settings.className = 'panel dark-ui';
		settings.innerHTML = '<h2>Settings</h2>' +
			'<table>' +
			'<tr>' +
			'<td class="smaller">Highest quality</td>' +
			'<td id="qualityButton" class="switch"><a></a></td>' +
			'</tr>' +
			'<tr>' +
			'<td class="smaller">Switch theme</td>' +
			'<td id="themeButton" class="switch"><a></a></td>' +
			'</tr>'+
			'</table>';
		settings.addEventListener('click', function (e) {
			e.stopPropagation();
		});
		settings.addEventListener('contextmenu', function (e) {
			e.stopPropagation();
		});
		settings.getElementsByClassName('switch')[0].addEventListener('click', toggleQuality);
		settings.getElementsByClassName('switch')[1].addEventListener('click', toggleTheme);
	}
	dimmer.appendChild(settings);
}

function is_touch_device() {
	return 'ontouchstart' in window        // works on most browsers 
		|| navigator.maxTouchPoints;       // works on IE10/11 and Surface
};

function toggleQuality() {
	HighQuality = !HighQuality;
	this.children[0].classList.toggle('activeknob');
	this.children[0].style.left = HighQuality ?
		this.offsetWidth - 4 - this.children[0].offsetWidth + 'px' : this.children[0].style.left = '0';

	if (isPlaying){
		player.setPlaybackQuality(HighQuality ? player.getAvailableQualityLevels()[0] : 'default');
	}
}

var OldTheme = true;
function toggleTheme(){
	OldTheme = !OldTheme;
	this.children[0].classList.toggle('activeknob');
	this.children[0].style.left = !OldTheme ?
		this.offsetWidth - 4 - this.children[0].offsetWidth + 'px' : this.children[0].style.left = '0';

	document.getElementById('css_theme').href = OldTheme ? 'css/dark.min.css' : 'css/modernflat.min.css';
}
