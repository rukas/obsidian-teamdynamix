import { App, TFile } from 'obsidian'
import { TeamDynamixSettings } from "./DefaultSettings";

export async function updateFileFromServer(settings: TeamDynamixSettings, file: TFile, app: App) {

  // group the keywords by itemType
  // we can't use Object.groupBy since we're on ES6
  let itemTypesGroup = settings.keywordToItemType.reduce((acc, curr) => {

    if (!acc[curr.itemType]) acc[curr.itemType] = []; //If this type wasn't previously stored
    acc[curr.itemType].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  // build a regex string to see if there are any changes at all to make to the file
  // this will be checked first to make sure we're not trying to edit the file for no reason
  let globalMatchString = `(?<!\\[)(?:${settings.keywordToItemType.map(a => a.keyword).join('|')})(\\d+)(?!.*\\])`;

  return app.vault.process(file, (data) => {
    let fileContents = data;

    if (fileContents.match(globalMatchString)) {

      for (const [key, value] of Object.entries(itemTypesGroup)) {

        // build a regex string for just the keywords of the current item type
        let localMatchString = `(?<!\\[)(${itemTypesGroup[key].map(a => a.keyword).join('|')})(\\d+)(?!.*\\])`;

        // console.log(localMatchString);

        // if there are matches for the current item type perform a replacement on the file
        if (fileContents.match(localMatchString)) {

          const itemPath = settings.typeToPath.find(i => i.itemType == key)?.path;
          if (!itemPath) continue;
          const formattedLink = `[$1$2](${settings.teamdynamixBaseUrl}${itemPath}$2)`;
          const regex = new RegExp(localMatchString, `mig`);
          fileContents = fileContents.replace(regex, formattedLink);
        }
      }
    }
    return fileContents;
  });
}