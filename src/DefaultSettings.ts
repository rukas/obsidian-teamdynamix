export interface TeamDynamixSettings {
  teamdynamixBaseUrl: string;
  enableAutomaticReplacement: boolean;
  keywordToItemType: keywordToItemType[];
  typeToPath: typeToPath[];
}

export interface keywordToItemType {
  keyword: string;
  itemType: string;
}

export interface typeToPath {
  itemType: string;
  path: string;
}

export const DEFAULT_SETTINGS: TeamDynamixSettings = {
  teamdynamixBaseUrl: 'https://solutions.teamdynamix.com',
  enableAutomaticReplacement: true,
  keywordToItemType: [
    { keyword: "Major Incident #", itemType: "Ticket" },
    { keyword: "Incident #", itemType: "Ticket" },
    { keyword: "Change #", itemType: "Ticket" },
    { keyword: "Problem #", itemType: "Ticket" },
    { keyword: "Release #", itemType: "Ticket" },
    { keyword: "Service Request #", itemType: "Ticket" },
    { keyword: "Asset #", itemType: "Asset" },
    { keyword: "Configuration Item #", itemType: "ConfigurationItem" },
    { keyword: "Issue #", itemType: "Issue" },
    { keyword: "Project #", itemType: "Project" },
  ],

  typeToPath: [
    { itemType: "Ticket", path: "/TDNext/Apps/Tickets/TicketDet?TicketID=" },
    { itemType: "Asset", path: "/TDNext/Apps/Assets/AssetDet.aspx?AssetID=" },
    { itemType: "ConfigurationItem", path: "TDNext/Apps/Assets/CIDet.aspx?ID=" },
    { itemType: "Issue", path: "/TDNext/Apps/Projects/Issues/IssueDet.aspx?IID=" },
    { itemType: "Project", path: "/TDNext/Apps/Projects/TeamManagement/ProjectDetails.aspx?TID=" },
  ],
}