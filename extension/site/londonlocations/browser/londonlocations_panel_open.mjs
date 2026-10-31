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

const PANEL_PATH = "site/londonlocations/browser/londonlocations_panel.html";

async function openLondonLocationsPanel(tabId) {
  try {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      if (chrome.sidePanel.setOptions) {
        const options = { path: PANEL_PATH, enabled: true };
        if (tabId != null) {
          options.tabId = tabId;
        }
        await chrome.sidePanel.setOptions(options);
      }
      if (tabId != null) {
        await chrome.sidePanel.open({ tabId: tabId });
      } else {
        await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      }
      return true;
    }
  } catch (error) {
    console.log("London Locations side panel did not open.", error);
  }

  const sidebar = chrome.sidebarAction || (typeof browser !== "undefined" ? browser.sidebarAction : undefined);
  if (sidebar && sidebar.open) {
    try {
      await sidebar.open();
      return true;
    } catch (error) {
      console.log("London Locations sidebar did not open.", error);
    }
  }
  return false;
}

export { openLondonLocationsPanel, PANEL_PATH };
