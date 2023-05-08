import { App, Editor, Notice, } from 'obsidian'
import { TeamDynamixSettings } from "./DefaultSettings";

export async function updateFileFromServer(settings: TeamDynamixSettings, app: App) {
  const file = app.workspace.getActiveFile();
  // if length too short, probably didn't set the settings and just left the placeholder empty string
  let fileContents = await app.vault.read(file)

  for (const keywordToItemType of settings.keywordToItemType) {
    // if length too short, probably didn't set the settings and just left the placeholder empty string
    // If you wanted to pull all tasks, you can always use `view all` filter definition.
    if (keywordToItemType.keyword.length > 1 && keywordToItemType.itemType.length > 1 && fileContents.includes(keywordToItemType.keyword)) {

      console.log("TeamDynamix: Updating work item id with link. If this happened automatically and you did not intend for this " +
        "to happen, you should either disable automatic replacement of your keyword with todos (via the settings), or" +
        " exclude this file from auto replace (via the settings).")

      const itemPath = (settings.typeToPath.find(i => i.itemType == keywordToItemType.itemType)).path;

      const formattedLink = `[${keywordToItemType.keyword}$1](${settings.teamdynamixBaseUrl}${itemPath}$1)`;

      const regex = new RegExp(`(?<!\\[)${keywordToItemType.keyword}(\\d+)`, `gm`);

      // re-read file contents to reduce race condition after slow server call
      fileContents = await app.vault.read(file)
      const newData = fileContents.replace(regex, formattedLink);
      await app.vault.modify(file, newData)
    }
  }
}