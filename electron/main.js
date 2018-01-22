"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const url_1 = require("url");
const fs_1 = require("fs");
const path_1 = require("path");
const CONFIG = {
    META_PATH: path_1.join(__dirname, 'meta.json'),
    INDEX_PATH: './index.html'
};
class Main {
    constructor() {
        this.mainWindow = null;
        this.setHandlers();
    }
    createWindow() {
        Main.loadMeta().then((pack) => {
            this.mainWindow = new electron_1.BrowserWindow(Main.getWindowOptions(pack));
            this.mainWindow.loadURL(url_1.format({
                pathname: CONFIG.INDEX_PATH,
                protocol: 'file:',
                slashes: true
            }));
            this.mainWindow.on('closed', () => {
                this.mainWindow = null;
            });
            const onChangeWindow = Main.asyncHandler(() => {
                const [x, y] = this.mainWindow.getPosition();
                const [width, height] = this.mainWindow.getSize();
                const isFullScreen = this.mainWindow.isFullScreen();
                Main.updateMeta({ x, y, width, height, isFullScreen });
            }, 200);
            this.mainWindow.on('move', onChangeWindow);
            this.mainWindow.on('resize', onChangeWindow);
            this.mainWindow.on('enter-full-screen', onChangeWindow);
            this.mainWindow.on('leave-full-screen', onChangeWindow);
        });
    }
    replaceProtocol() {
        electron_1.protocol.unregisterProtocol('file');
        electron_1.protocol.registerFileProtocol('file', (request, callback) => {
            const url = request.url.substr(7).replace(/(#.*)|(\?.*)/, '');
            console.log(url);
            callback(path_1.join(__dirname, url));
        }, (error) => {
            if (error) {
                console.error('Failed to register protocol');
            }
        });
    }
    setHandlers() {
        electron_1.app.on('ready', () => this.onAppReady());
        electron_1.app.on('window-all-closed', Main.onAllWindowClosed);
        electron_1.app.on('activate', () => this.onActivate());
    }
    onAppReady() {
        this.replaceProtocol();
        this.createWindow();
    }
    onActivate() {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (!this.mainWindow) {
            this.createWindow();
        }
    }
    static onAllWindowClosed() {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    }
    static loadMeta() {
        return new Promise((resolve, reject) => {
            fs_1.readFile(CONFIG.META_PATH, 'utf8', (err, file) => {
                err ? reject(err) : resolve(JSON.parse(file));
            });
        });
    }
    static updateMeta({ x, y, width, height, isFullScreen }) {
        return Main.loadMeta().then((meta) => {
            meta.window.lastOpen = {
                width, height, x, y, isFullScreen
            };
            fs_1.writeFile(CONFIG.META_PATH, JSON.stringify(meta, null, 4), () => null);
        });
    }
    static getWindowOptions(pack) {
        const fullscreen = pack.window.lastOpen && pack.window.lastOpen.isFullScreen;
        const display = electron_1.screen.getPrimaryDisplay();
        let width, height, x, y;
        if (pack.window.lastOpen) {
            width = pack.window.lastOpen.width;
            height = pack.window.lastOpen.height;
            x = pack.window.lastOpen.x;
            y = pack.window.lastOpen.y;
        }
        else {
            const size = Main.getStartSize({
                width: display.workAreaSize.width,
                height: display.size.height
            }, pack);
            width = size.width;
            height = size.height;
            x = (display.size.width - width) / 2;
            y = (display.size.height - height) / 2;
        }
        return {
            minWidth: pack.window.minSize.width,
            minHeight: pack.window.minSize.height,
            icon: path_1.join(__dirname, 'img/icon.png'),
            fullscreen, width, height, x, y
        };
    }
    static getStartSize(size, pack) {
        const width = Math.max(Math.min(size.width, pack.window.open.maxSize.width), pack.window.open.minSize.width);
        const height = Math.max(Math.min(size.height, pack.window.open.maxSize.height), pack.window.open.minSize.height);
        return { width, height };
    }
    static asyncHandler(handler, timeout) {
        let timer = null;
        return function () {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                timer = null;
                handler();
            }, timeout);
        };
    }
}
new Main();
//# sourceMappingURL=main.js.map