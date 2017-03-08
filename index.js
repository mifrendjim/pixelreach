'use strict';
const electron = require('electron');
electron.powerSaveBlocker.start('prevent-app-suspension');

const app = electron.app;
app.commandLine.appendSwitch('disable-renderer-backgrounding');

const storage = require('electron-json-storage');
var ipc = require('electron').ipcMain;

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

// prevent window being garbage collected
let mainWindow;
let child_One;
let child_Two;
let child_Middle;
let clickThroughApp = false;
let windowInterval;

function onClosed() {
	clearInterval(windowInterval);	
	mainWindow = null;
}

function createMainWindow() {
	const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
	const win = new electron.BrowserWindow({
		width: width,
		height: height,
		transparent: true, 
		frame: false,
		hasShadow:false,
		resizable:false,
		movable:false,
		fullscreenable:false,
		type:'textured',
		alwaysOnTop: true,
 		webPreferences: {
	    	pageVisibility: false,
	    	backgroundThrottling: false,
	    	experimentalFeatures: true
	  	}
	});

	win.loadURL(`file://${__dirname}/index.html`);
	win.on('closed', onClosed);
//	win.openDevTools();

	return win;
}
var i = 1;
function createChildWindow(whichChild) {
	const win = new electron.BrowserWindow({
		width: 30,
		height: 30,
		x:300*i,
		y:200*i,
		transparent: false,
		frame: false,
		parent: mainWindow,
		hasShadow:false,
		resizable:false
	});
	win.loadURL(`file://${__dirname}/child_${whichChild}.html`);
	win.on('closed', onClosed);
	i++;	
	return win;
}

		// 
		// movable:true,
		// fullscreenable:false,
		// type:'textured',
		// alwaysOnTop: true,


app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

app.on('ready', () => {
	mainWindow = createMainWindow();
	child_One = createChildWindow('1');
	child_Two = createChildWindow('2');
	child_Middle = createChildWindow('Middle');	
	mainWindow.setAlwaysOnTop(true, 'floating');
	

	// child_One.on('move', (e, cmd) => {
	//   console.log('child one',e);
	// })

	// child_Two.on('move', (e, cmd) => {
	//   console.log('child two',e);
	// })
	buildEventLoop();
});


function buildEventLoop() {
	mainWindow.setIgnoreMouseEvents(true);
	windowInterval = setInterval(() =>{
		var pos1 = child_One.getPosition();
		console.log(pos1);
		//win.setPosition(x, y[, animate])
		console.log(electron.screen.getCursorScreenPoint());

     }, 1);
}


ipc.on('hoverOn', function(event, data){
	console.log('HOVER ON',data);
	clickThroughApp = false;
	// mainWindow.setIgnoreMouseEvents(false);

});

ipc.on('hoverOff', function(event, data){
	console.log('HOVER OFF',data);
	clickThroughApp = true;
	// mainWindow.setIgnoreMouseEvents(true);	
});

ipc.on('savePositon', function(event, data){
	console.log('save data',data);
	storage.set('userPoints', data, function(error) {
	  if (error) throw error;
	});

});

ipc.on('getStartingPoints', function(event, data){
	console.log('get Starting Points');
	storage.get('userPoints', function(error, data) {
		console.log('read data', data);
		 event.sender.send('startingPoints-reply', data);
	  if (error) throw error;
	});
});


ipc.on('mouseMove', function(event, data){
	console.log('mouse moving');
});








