import { App, ButtonComponent, Plugin, PluginSettingTab, Setting, TFile, Editor, debounce } from 'obsidian';
import { updateFileFromServer } from "./updateFileFromServer";
import { DEFAULT_SETTINGS, TeamDynamixSettings } from "./DefaultSettings";

export default class TeamDynamix extends Plugin {
	settings: TeamDynamixSettings;
	hasIntervalFailure: boolean = false;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'replace-tdx-ids',
			name: 'Replace TeamDynamix item IDs with links',
			editorCallback: (editor, view) => {
				if (view.file) {
					updateFileFromServer(this.settings, view.file, this.app);
				}
			}
		});

		if (this.settings.enableAutomaticReplacement) {
			const debouncedReplace = debounce((editor: Editor) => {
				if (this.hasIntervalFailure) {
					console.log("TeamDynamix: not checking for replacement keyword because of previous server " +
						"failure. Either use the manual keyword, or restart the app.")
					return;
				}
				try {
					this.replaceInEditor(editor);
				} catch {
					this.hasIntervalFailure = true;
				}
			}, 1500, false); // Debounce: 1.5s delay, false = wait for user to stop typing (trailing edge)

			this.registerEvent(this.app.workspace.on('editor-change', debouncedReplace));
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
		// Removed aggressive background polling to prevent interrupting user typing.
		// To re-enable background checking (e.g. for external changes), uncomment the line below,
		// but be aware it may conflict with active typing if not carefully managed.
		// this.registerInterval(window.setInterval(() => this.updateFileFromServerIfEnabled(), 4 * 1000))
	}

	async updateFileFromServerIfEnabled() {
		if (this.settings.enableAutomaticReplacement && !this.hasIntervalFailure) {
			await new Promise(r => setTimeout(r, 2000));
			try {
				const file = this.app.workspace.getActiveFile();
				if (file) {
					await updateFileFromServer(this.settings, file, this.app)
				}
			}
			catch {
				this.hasIntervalFailure = true;
			}
		}
	}

	onunload() {

	}

	replaceInEditor(editor: Editor) {
		const text = editor.getValue();

		// group the keywords by itemType
		let itemTypesGroup = this.settings.keywordToItemType.reduce((acc, curr) => {
			if (!acc[curr.itemType]) acc[curr.itemType] = [];
			acc[curr.itemType].push(curr);
			return acc;
		}, {} as any);

		let replacements: { start: number, end: number, text: string }[] = [];

		for (const [key, value] of Object.entries(itemTypesGroup)) {
			// build a regex string for just the keywords of the current item type
			const items = value as any[];
			let localMatchString = `(?<!\\[)(${items.map(a => a.keyword).join('|')})(\\d+)(?!.*\\])`;

			const regex = new RegExp(localMatchString, 'g');
			let match;
			while ((match = regex.exec(text)) !== null) {
				const fullMatch = match[0];
				if (!fullMatch) continue;

				const itemPath = (this.settings.typeToPath.find(i => i.itemType == key))?.path;

				if (itemPath) {
					// Reconstruct formatted link
					// match[1] is keyword, match[2] is ID
					const keyword = match[1];
					const id = match[2];
					const formattedLink = `[${keyword}${id}](${this.settings.teamdynamixBaseUrl}${itemPath}${id})`;

					replacements.push({
						start: match.index,
						end: match.index + fullMatch.length,
						text: formattedLink
					});
				}
			}
		}

		if (replacements.length > 0) {
			// Sort descending to prevent offset changes affecting strictly
			replacements.sort((a, b) => b.start - a.start);

			// Apply replacements
			// We must check if any replacement overlaps, but with this regex they shouldn't unless keywords overlap substrings
			for (const r of replacements) {
				const from = editor.offsetToPos(r.start);
				const to = editor.offsetToPos(r.end);
				editor.replaceRange(r.text, from, to);
			}
		}
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
		containerEl.createEl('a', { text: 'Important - see usage instructions', href: 'https://github.com/rukas/obsidian-teamdynamix/tree/master#readme' });

		this.addbaseUrlSetting(containerEl);
		this.addEnableAutomaticReplacementSetting(containerEl);
		this.addKeywordTeamDynamixQuerySetting(containerEl);
	}

	private addbaseUrlSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('TeamDynamix base URL')
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
				" When disabled, manually use the 'Replace TeamDynamix item IDs with links' command to replace your keyword with links")
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
		containerEl.createEl('h2', { text: 'Keywords and filter definitions' });
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
					.addDropdown(dropDown => {
						for (const typeToPath of this.plugin.settings.typeToPath) {
							dropDown.addOption(typeToPath.itemType, typeToPath.itemType);
						}
						dropDown.setValue(this.plugin.settings.keywordToItemType[index].itemType);
						dropDown.onChange(async (value) => {
							this.plugin.settings.keywordToItemType[index].itemType = value;
							await this.plugin.saveSettings();
						});
					})
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
				if (this.containerEl.lastChild) {
					div.appendChild(this.containerEl.lastChild);
				}
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
