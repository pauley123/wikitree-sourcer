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

// Registered like a search site so the item appears in every site's search
// submenu. It opens the location picker instead of a website. shouldShow is
// always true so a date or country filter cannot hide it.
function addLondonLocationsMenuItem(menu, data, backFunction) {
  addMenuItem(menu, SEARCH_MENU_LABEL, function () {
    setupLondonLocationsMenu(data, backFunction);
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
