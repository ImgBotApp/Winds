const {
	app,
	BrowserWindow,
	shell,
	ipcMain,
	Menu,
	TouchBar,
	protocol,
} = require('electron');
const { TouchBarButton, TouchBarLabel, TouchBarSpacer } = TouchBar;

const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		backgroundColor: '#F7F7F7',
		height: 800,
		minWidth: 850,
		show: false,
		titleBarStyle: 'hidden',
		webPreferences: {
			nodeIntegration: false,
			preload: __dirname + '/preload.js',
		},
		width: 1280,
	});

	mainWindow.loadURL(
		isDev
			? 'http://localhost:3000'
			: `file://${path.join(__dirname, '../build/index.html')}`,
	);

	if (isDev) {
		const {
			default: installExtension,
			REACT_DEVELOPER_TOOLS,
			REDUX_DEVTOOLS,
		} = require('electron-devtools-installer');

		installExtension(REACT_DEVELOPER_TOOLS)
			.then(name => {
				console.log(`Added Extension: ${name}`);
			})
			.catch(err => {
				console.log('An error occurred: ', err);
			});

		installExtension(REDUX_DEVTOOLS)
			.then(name => {
				console.log(`Added Extension: ${name}`);
			})
			.catch(err => {
				console.log('An error occurred: ', err);
			});
	}

	mainWindow.once('ready-to-show', () => {
		mainWindow.show();

		ipcMain.on('open-external-window', (event, arg) => {
			shell.openExternal(arg);
		});

		ipcMain.on('media-controls', (event, args) => {
			mediaControls(event, args);
		});
	});
};

function registerProtocol() {
	protocol.registerFileProtocol(
		'winds',
		(request, callback) => {
			const url = request.url.substr(8);
			callback({ path: path.normalize(`${__dirname}/${url}`) });
		},
		error => {
			if (error) {
				console.error('Failed to register protocol');
			}
		},
	);
};

function generateMenu() {
	const template = [
		{
			label: 'File',
			submenu: [{ role: 'about' }, { role: 'quit' }],
		},
		{
			label: 'Edit',
			submenu: [
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ role: 'pasteandmatchstyle' },
				{ role: 'delete' },
				{ role: 'selectall' },
			],
		},
		{
			label: 'View',
			submenu: [
				{ role: 'reload' },
				{ role: 'forcereload' },
				{ role: 'toggledevtools' },
				{ type: 'separator' },
				{ role: 'resetzoom' },
				{ role: 'zoomin' },
				{ role: 'zoomout' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' },
			],
		},
		{
			role: 'window',
			submenu: [{ role: 'minimize' }, { role: 'close' }],
		},
		{
			role: 'help',
			submenu: [
				{
					click() {
						require('electron').shell.openExternal(
							'https://getstream.io/winds',
						);
					},
					label: 'Learn More',
				},
				{
					click() {
						require('electron').shell.openExternal(
							'https://github.com/GetStream/Winds/issues',
						);
					},
					label: 'File Issue on GitHub',
				},
			],
		},
	];

	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

function mediaControls(event, args) {
	let next = new TouchBarButton({
		icon: `${__dirname}/static/next.png`,
		click: function() {
			event.sender.send('media-controls', 'next');
		},
	});

	let previous = new TouchBarButton({
		icon: `${__dirname}/static/previous.png`,
		click: function() {
			event.sender.send('media-controls', 'previous');
		},
	});

	let playPause = new TouchBarButton({
		icon: `${__dirname}/static/pause.png`,
		click: function() {
			event.sender.send('media-controls', 'togglePlayPause');
		},
	});

	let info = new TouchBarLabel({
		label:
			args.title && args.title.length > 40
				? `${args.title.substr(0, 40) + '...'}`
				: args.title,
		textColor: '#FFFFFF',
	});

	if (args.type === 'play') {
		playPause.icon = `${__dirname}/static/pause.png`;
		info.label = args.title;
	} else {
		playPause.icon = `${__dirname}/static/play.png`;
	}

	var touchBar = new TouchBar([
		previous,
		playPause,
		next,
		new TouchBarSpacer({ size: 'flexible' }),
		info,
		new TouchBarSpacer({ size: 'flexible' }),
	]);

	mainWindow.setTouchBar(touchBar);
};

app.on('ready', () => {
	createWindow();
	generateMenu();

	app.setAsDefaultProtocolClient('winds');
});

app.on('window-all-closed', () => {
	app.quit();
});

app.on('activate', () => {
	if (mainWindow === null) {
		createWindow();
	}
});

ipcMain.on('load-page', (event, arg) => {
	mainWindow.loadURL(arg);
});
