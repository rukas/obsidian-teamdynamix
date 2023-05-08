import { App, ButtonComponent, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { updateFileFromServer } from "./src/updateFileFromServer";
import { DEFAULT_SETTINGS, TeamDynamixSettings } from "./src/DefaultSettings";

export default class TeamDynamix extends Plugin {
	settings: TeamDynamixSettings;
	hasIntervalFailure: boolean = false;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'replace-tdx-ids',
			name: 'Replace TeamDynamix Item IDs With Links',
			editorCallback: () => {
				updateFileFromServer(this.settings, this.app)
			}
		});

		if (this.settings.enableAutomaticReplacement) {
			this.registerEvent(this.app.workspace.on('file-open', async () => {
				if (this.hasIntervalFailure) {
					console.log("TeamDynamix: not checking for replacement keyword because of previous server " +
						"failure. Either use the manual keyword, or restart the app.")
					return;
				}
				try {
					await updateFileFromServer(this.settings, this.app)
				} catch {
					this.hasIntervalFailure = true;
				}
			}));
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TeamDynamixPluginSettingTab(this.app, this));


		/* This is in addition to the on file-open callback. This helps with
				 1. manually adding the keyword to a new spot in a file
				 2. when you make a setting change, such as changing your keyword
			If this notices a keyword, it should wait at least 2 seconds before updating the text - this avoids a shocking
			user experience.
		 */
		// 5 sec sleep because we want to ensure the file-open event finishes before this loop starts
		await new Promise(r => setTimeout(r, 3000));
		this.registerInterval(window.setInterval(() => this.updateFileFromServerIfEnabled(), 4 * 1000))
	}

	async updateFileFromServerIfEnabled() {
		if (this.settings.enableAutomaticReplacement && !this.hasIntervalFailure) {
			await new Promise(r => setTimeout(r, 2000));
			try {
				await updateFileFromServer(this.settings, this.app)
			}
			catch {
				this.hasIntervalFailure = true;
			}
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TeamDynamixPluginSettingTab extends PluginSettingTab {
	plugin: TeamDynamix;

	constructor(app: App, plugin: TeamDynamix) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl('h1', { text: 'TeamDynamix' });
		containerEl.createEl('a', { text: 'Important - see usage instructions', href: 'https://github.com/rukas/obsidian-teamdynamix/tree/master#readme' });

		this.addbaseUrlSetting(containerEl);
		this.addEnableAutomaticReplacementSetting(containerEl);
		this.addKeywordTeamDynamixQuerySetting(containerEl);
	}

	private addbaseUrlSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('TeamDynamix Base URL')
			.setDesc('Your TeamDynamix instance base URL. eg `https://solutions.teamdynamix.com`')
			.addText(text => text
				.setPlaceholder('https://solutions.teamdynamix.com')
				.setValue(this.plugin.settings.teamdynamixBaseUrl)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.teamdynamixBaseUrl = value;
					await this.plugin.saveSettings();
				}));
	}

	private addEnableAutomaticReplacementSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('Enable automatic replacement of keyword with links')
			.setDesc("When enabled, any time a keyword is seen in a file, it will be automatically" +
				" replaced with your a link to the TeamDynamix item." +
				" When disabled, manually use the 'Replace TeamDynamix Item IDs With Links' command to replace your keyword with links")
			.addToggle(t =>
				t.setValue(this.plugin.settings.enableAutomaticReplacement)
					.onChange(async (value) => {
						this.plugin.settings.enableAutomaticReplacement = value;
						await this.plugin.saveSettings();
					}
					));
	}

	private addKeywordTeamDynamixQuerySetting(containerEl: HTMLElement) {
		// todo add warning/stop if multiple same keywords
		containerEl.createEl('h2', { text: 'Keywords and Filter Definitions' });
		const filterDescription = document.createDocumentFragment();
		filterDescription.append('This plugin will find the specified keyword in a currently open file and replace ' +
			'the keyword with a link to the TeamDynamix item.',
			containerEl.createEl("br"),
			"Each keyword / type pair you use should be unique."
		)
		new Setting(containerEl).setDesc(filterDescription);

		this.plugin.settings.keywordToItemType.forEach(
			(keywordToItemType, index) => {
				const div = this.containerEl.createEl("div");
				div.addClass("teamdynamix-setting-div");
				new Setting(containerEl)
					.addText(text => text
						.setPlaceholder("@@TEAMDYNAMIX_KEYWORD@@")
						.setValue(
							this.plugin.settings.keywordToItemType[index].keyword
						)
						.onChange(async (value) => {
							this.plugin.settings.keywordToItemType[index].keyword = value;
							await this.plugin.saveSettings();
						})
						.inputEl.addClass("teamdynamix-keyword-setting")
					)
					.addText(text => text
						.setPlaceholder("Ticket")
						.setValue(
							this.plugin.settings.keywordToItemType[index].itemType
						)
						.onChange(async (value) => {
							this.plugin.settings.keywordToItemType[index].itemType = value;
							await this.plugin.saveSettings();
						})
						.inputEl.addClass("teamdynamix-keyword-setting")
					)
					.addExtraButton(eb => {
						eb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(async () => {
								this.plugin.settings.keywordToItemType.splice(
									index,
									1
								);
								await this.plugin.saveSettings();
								await this.display()
							})
					})
				div.appendChild(this.containerEl.lastChild);
			});


		new Setting(this.containerEl)
			.setName("Add another keyword and TeamDynamix item type")
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText("+")
					.setCta()
					.onClick(async () => {
						this.plugin.settings.keywordToItemType.push({
							keyword: "",
							itemType: ""
						});
						await this.plugin.saveSettings();
						this.display();
					});
			});
	}
}
