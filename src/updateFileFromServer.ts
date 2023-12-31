import { App } from 'obsidian'
import { TeamDynamixSettings } from "./DefaultSettings";

export async function updateFileFromServer(settings: TeamDynamixSettings, app: App) {

  const file = app.workspace.getActiveFile();

  let fileContents = await app.vault.read(file)

  let changed = false;

  for (const keywordToItemType of settings.keywordToItemType) {
    if (keywordToItemType.keyword.length > 1 && keywordToItemType.itemType.length > 1 && fileContents.includes(keywordToItemType.keyword)) {

      console.log("TeamDynamix: Updating work item id with link. If this happened automatically and you did not intend for this " +
        "to happen, you should either disable automatic replacement of your keyword with todos (via the settings), or" +
        " exclude this file from auto replace (via the settings).")

      const itemPath = (settings.typeToPath.find(i => i.itemType == keywordToItemType.itemType)).path;

      const formattedLink = `[${keywordToItemType.keyword}$1](${settings.teamdynamixBaseUrl}${itemPath}$1)`;

      const regex = new RegExp(`(?<!\\[)${keywordToItemType.keyword}(\\d+)`, `gm`);

      fileContents = fileContents.replace(regex, formattedLink);
      changed = true;
    }

    if (changed == true) {
      return app.vault.process(file, (data) => fileContents);
    }
  }
}