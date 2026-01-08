export class App {
    vault = {
        process: jest.fn(),
        read: jest.fn(),
        modify: jest.fn(),
    };
    workspace = {
        getActiveFile: jest.fn(),
    };
}

export class Plugin {
    app: App;
    constructor(app: App) {
        this.app = app;
    }
}

export class PluginSettingTab { }
export class Setting { }
export class TFile { }
export class Editor { }
