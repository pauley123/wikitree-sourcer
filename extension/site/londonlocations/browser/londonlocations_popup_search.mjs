/*
MIT License

Copyright (c) 2026 Robert M Pavey and the wikitree-sourcer contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { addMenuItem } from "/base/browser/popup/popup_menu_building.mjs";
import { registerSearchMenuItemFunction } from "/base/browser/popup/popup_search.mjs";
import { SEARCH_MENU_LABEL } from "../core/london_location.mjs";
import { setupLondonLocationsMenu } from "./londonlocations_menu.mjs";
import { openLondonLocationsPanel } from "./londonlocations_panel_open.mjs";

// Registered like a search site so the item appears in every site's search
// submenu. Chrome opens the side panel and Firefox opens the sidebar. Other
// browsers keep the picker in this popup.
function addLondonLocationsMenuItem(menu, data, backFunction) {
  addMenuItem(menu, SEARCH_MENU_LABEL, function () {
    openLondonLocationsPanel(null).then(async function (opened) {
      if (opened) {
        window.close();
        return;
      }
      let tabId = null;
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tabs && tabs[0] ? tabs[0].id : null;
      } catch (error) {
        tabId = null;
      }
      setupLondonLocationsMenu(data, backFunction, { tabId: tabId });
    });
  });
  return true;
}

function shouldShowLondonLocationsMenuItem() {
  return true;
}

registerSearchMenuItemFunction(
  "londonlocations",
  "London Locations",
  addLondonLocationsMenuItem,
  shouldShowLondonLocationsMenuItem
);
