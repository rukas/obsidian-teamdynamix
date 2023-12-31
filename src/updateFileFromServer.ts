import { App } from 'obsidian'
import { TeamDynamixSettings } from "./DefaultSettings";

export async function updateFileFromServer(settings: TeamDynamixSettings, app: App) {

  const file = app.workspace.getActiveFile();

  let fileContents = await app.vault.read(file)

  // group the keywords by itemType
  // we can't use Object.groupBy since we're on ES6
  let itemTypesGroup = settings.keywordToItemType.reduce((acc, curr) => {
    
    if (!acc[curr.itemType]) acc[curr.itemType] = []; //If this type wasn't previously stored
    acc[curr.itemType].push(curr);
    return acc;
  }, {});

  // build a regex string to see if there are any changes at all to make to the file
  // this will be checked first to make sure we're not trying to edit the file for no reason
  let globalMatchString = `(?<!\\[)(?:${settings.keywordToItemType.map(a => a.keyword).join('|')})(\\d+)(?!.*\\])`;

  if (fileContents.match(globalMatchString)) {

    for (const [key, value] of Object.entries(itemTypesGroup)) {

      // build a regex string for just the keywords of the current item type
      let localMatchString = `(?<!\\[)(${itemTypesGroup[key].map(a => a.keyword).join('|')})(\\d+)(?!.*\\])`;

      // console.log(localMatchString);

      // if there are matches for the current item type perform a replacement on the file
      if (fileContents.match(localMatchString)) {

        const itemPath = (settings.typeToPath.find(i => i.itemType == key)).path;
        const formattedLink = `[$1$2](${settings.teamdynamixBaseUrl}${itemPath}$2)`;
        const regex = new RegExp(localMatchString, `mig`);
        fileContents = fileContents.replace(regex, formattedLink);
      }
    }
  }
  // save the file after all of the replacements have been completed
  return app.vault.process(file, (data) => fileContents);
}