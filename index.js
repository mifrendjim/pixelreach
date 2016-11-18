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
let clickThroughApp = false;
let windowInterval;


function onClosed() {
	clearInterval(windowInterval);	
	// dereference the window
	// for multiple windows store them in an array
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
		type:'textured'
	});

	win.loadURL(`file://${__dirname}/index.html`);
	win.on('closed', onClosed);
//	win.openDevTools();

	return win;
}

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
	mainWindow.setAlwaysOnTop(true, 'dock');
	buildEventLoop();
});


function buildEventLoop() {
	windowInterval = setInterval(() =>{
		mainWindow.setIgnoreMouseEvents(false);
		console.log('interval - click through',clickThroughApp);
		if(clickThroughApp){
			mainWindow.setIgnoreMouseEvents(true);
		}
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

