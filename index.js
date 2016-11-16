'use strict';
const electron = require('electron');
electron.powerSaveBlocker.start('prevent-app-suspension');

const app = electron.app;
app.commandLine.appendSwitch('disable-renderer-backgrounding');

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
		hasShadow:false
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
	var counter = 0;
	windowInterval = setInterval(() =>{
		counter++;
		mainWindow.setIgnoreMouseEvents(false);
		console.log('interval - click through',clickThroughApp,counter);
		if(clickThroughApp){
			mainWindow.setIgnoreMouseEvents(true);
		}
    }, 1);
}


ipc.on('hoverOn', function(event, data){
	console.log('HOVER ON',data);
	clickThroughApp = false;
});

ipc.on('hoverOff', function(event, data){
	console.log('HOVER OFF',data);
	clickThroughApp = true;
});
