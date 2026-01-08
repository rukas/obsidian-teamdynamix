import { updateFileFromServer } from '../src/updateFileFromServer';
import { App, TFile } from 'obsidian';
import { TeamDynamixSettings } from '../src/DefaultSettings';

// Mock TFile
const mockFile = new TFile();

const mockSettings: TeamDynamixSettings = {
    teamdynamixBaseUrl: 'https://tdx.example.com',
    enableAutomaticReplacement: true,
    keywordToItemType: [
        { keyword: 'Ticket #', itemType: 'Ticket' }
    ],
    typeToPath: [
        { itemType: 'Ticket', path: '/TicketDet?TicketID=' }
    ]
};

describe('updateFileFromServer', () => {
    let app: App;

    beforeEach(() => {
        app = new App();
    });

    test('should replace keyword with link', async () => {
        const initialContent = 'Reference Ticket #12345 here.';

        // Mock app.vault.process implementation to simulate reading and writing
        (app.vault.process as jest.Mock).mockImplementation((file, callback) => {
            return callback(initialContent);
        });

        const result = await updateFileFromServer(mockSettings, mockFile, app);

        // Check if the result content has the replaced link
        expect(result).toBe('Reference [Ticket #12345](https://tdx.example.com/TicketDet?TicketID=12345) here.');
    });

    test('should not change content if no keyword match', async () => {
        const initialContent = 'No ticket here.';

        (app.vault.process as jest.Mock).mockImplementation((file, callback) => {
            return callback(initialContent);
        });

        const result = await updateFileFromServer(mockSettings, mockFile, app);

        expect(result).toBe('No ticket here.');
    });

    test('should handle multiple replacements', async () => {
        const initialContent = 'Ticket #123 and Ticket #456.';

        (app.vault.process as jest.Mock).mockImplementation((file, callback) => {
            return callback(initialContent);
        });

        const result = await updateFileFromServer(mockSettings, mockFile, app);

        expect(result).toBe('[Ticket #123](https://tdx.example.com/TicketDet?TicketID=123) and [Ticket #456](https://tdx.example.com/TicketDet?TicketID=456).');
        // Note: The current regex might only support one replacement per line dependent on global flag usage?
        // Actually the regex in the code is /.../ mig with 'join(|)' so it should replace all?
        // Wait, the regex construction is `(?<!\\[)(?:...)(?:(\\d+)(?!.*\\]))`
        // Let's verify if the regex supports multiple matches on partial text.

        // Looking at the code: 
        // let localMatchString = `(?<!\\[)(${itemTypesGroup[key].map(a => a.keyword).join('|')})(\\d+)(?!.*\\])`;
        // const regex = new RegExp(localMatchString, `mig`);
        // fileContents = fileContents.replace(regex, formattedLink);

        // If "Ticket #123" is replaced, it becomes "[Ticket #123](...)"
        // The negative lookahead (?!.*\\]) ensures we don't double replace.
    });
});
