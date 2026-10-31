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

import { setupLondonLocationsMenu } from "./londonlocations_menu.mjs";

async function readTab(tabId) {
  const empty = { extractedData: { url: "" }, generalizedData: {} };
  if (tabId == null) {
    return empty;
  }
  let response;
  try {
    response = await chrome.tabs.sendMessage(tabId, { type: "extract" });
  } catch (error) {
    response = null;
  }
  if (!response || !response.success || !response.extractedData) {
    let url = "";
    try {
      const tab = await chrome.tabs.get(tabId);
      url = tab && tab.url ? tab.url : "";
    } catch (error) {
      url = "";
    }
    return { extractedData: { url: url }, generalizedData: {} };
  }
  const extractedData = response.extractedData;
  if (!extractedData.url) {
    try {
      const tab = await chrome.tabs.get(tabId);
      extractedData.url = tab && tab.url ? tab.url : "";
    } catch (error) {
      extractedData.url = extractedData.url || "";
    }
  }
  let generalizedData = {};
  const siteName = response.contentType;
  if (siteName) {
    try {
      const loaded = await import(
        chrome.runtime.getURL("site/" + siteName + "/core/" + siteName + "_generalize_data.mjs")
      );
      if (loaded.generalizeData) {
        generalizedData = loaded.generalizeData({ extractedData: extractedData }) || {};
      }
    } catch (error) {
      generalizedData = {};
    }
  }
  return { extractedData: extractedData, generalizedData: generalizedData };
}

async function activeTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0] ? tabs[0].id : null;
}

let controller = null;
let shownTabId = null;

async function showTab(tabId) {
  if (tabId == null || !controller) {
    return;
  }
  if (tabId === shownTabId) {
    const data = await readTab(tabId);
    await controller.setPage(data, tabId);
    return;
  }
  shownTabId = tabId;
  const data = await readTab(tabId);
  await controller.setPage(data, tabId);
}

async function start() {
  const tabId = await activeTabId();
  shownTabId = tabId;
  const data = await readTab(tabId);
  controller = await setupLondonLocationsMenu(data, function () {}, { tabId: tabId });
  chrome.tabs.onActivated.addListener(function (info) {
    showTab(info.tabId);
  });
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
    if (changeInfo.status === "complete" && tabId === shownTabId) {
      showTab(tabId);
    }
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      activeTabId().then(showTab);
    }
  });
}

start();
