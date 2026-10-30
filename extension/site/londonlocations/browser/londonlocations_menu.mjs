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

import {
  beginMainMenu,
  endMainMenu,
  addBackMenuItem,
  overrideMenuWidth,
} from "/base/browser/popup/popup_menu_building.mjs";
import { writeToClipboard } from "/base/browser/popup/popup_clipboard.mjs";
import { getLatestPersonData } from "/base/browser/popup/popup_person_data.mjs";
import {
  filterRows,
  rowLabel,
  matchPlaceString,
  buildOutputs,
  prefillFromGeneralizedData,
  canFillWikiTreeEdit,
} from "../core/london_location.mjs";

const MAX_SUGGESTIONS = 40;

const FILL_FIELDS = [
  { value: "birthLocation", label: "Birth location" },
  { value: "deathLocation", label: "Death location" },
  { value: "marriageLocation", label: "Marriage location" },
];

function suggestionQuery(placeText) {
  const text = placeText.trim();
  if (!text) {
    return "";
  }
  if (filterRows(text).length) {
    return text;
  }
  const first = text.split(",")[0].trim();
  if (first && filterRows(first).length) {
    return first;
  }
  return text;
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const previous = button.innerText;
    button.innerText = "Copied";
    setTimeout(function () {
      button.innerText = previous;
    }, 1200);
  } catch (error) {
    await writeToClipboard(text, "London location");
  }
}

function addCopyButton(parent, text) {
  const button = document.createElement("button");
  button.className = "dialogButton londonLocButtons";
  button.type = "button";
  button.innerText = "Copy";
  button.onclick = function () {
    copyText(text, button);
  };
  parent.appendChild(button);
  return button;
}

function fillStatus(results, message) {
  let status = results.querySelector(".londonLocStatus");
  if (!status) {
    status = document.createElement("div");
    status.className = "londonLocNote londonLocStatus";
    results.appendChild(status);
  }
  status.textContent = message;
}

async function fillLocation(field, value, results) {
  let tab;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = tabs && tabs[0];
  } catch (error) {
    fillStatus(results, "This page has no location field to fill.");
    return;
  }
  if (!tab) {
    fillStatus(results, "This page has no location field to fill.");
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: "setLocationField", field: field, value: value }, function (response) {
    if (chrome.runtime.lastError || !response || !response.success) {
      fillStatus(results, "This page has no location field to fill.");
    } else {
      fillStatus(results, "Location field updated.");
    }
  });
}

function renderOutputs(results, row, dateText, registration, allowFill, fillField) {
  results.replaceChildren();
  if (!row) {
    const note = document.createElement("div");
    note.className = "londonLocNote";
    note.textContent = "Choose a place from the list.";
    results.appendChild(note);
    return;
  }
  if (!dateText.trim()) {
    const note = document.createElement("div");
    note.className = "londonLocNote";
    note.textContent = "Enter a date.";
    results.appendChild(note);
    return;
  }

  const built = buildOutputs(row, dateText, registration);
  if (!built.ok) {
    const note = document.createElement("div");
    note.className = "londonLocNote";
    note.textContent = built.message;
    results.appendChild(note);
    return;
  }
  if (built.message) {
    const note = document.createElement("div");
    note.className = "londonLocNote";
    note.textContent = built.message;
    results.appendChild(note);
  }
  if (!built.options.length) {
    return;
  }

  for (const option of built.options) {
    const block = document.createElement("div");
    block.className = "londonLocResult";
    if (option.reason) {
      const reason = document.createElement("div");
      reason.className = "londonLocNote";
      reason.textContent = option.reason;
      block.appendChild(reason);
    }
    for (const variant of option.variants) {
      if (option.variants.length > 1) {
        const which = document.createElement("div");
        which.className = "londonLocHeading";
        which.textContent = variant.county;
        block.appendChild(which);
      }
      addOutputLine(block, "Location field", variant.location, true, allowFill, fillField, results);
      addCategoryLine(block, variant);
      addOutputLine(block, "Biography", variant.narrative, false, false, fillField, results);
    }
    results.appendChild(block);
  }
}

function addOutputLine(parent, heading, text, isLocation, allowFill, fillField, results) {
  const wrap = document.createElement("div");
  wrap.className = "londonLocLine";
  const title = document.createElement("span");
  title.className = "londonLocHeading";
  title.textContent = heading;
  wrap.appendChild(title);
  wrap.appendChild(document.createTextNode(text));
  addCopyButton(wrap, text);
  if (isLocation && allowFill) {
    const fill = document.createElement("button");
    fill.className = "dialogButton londonLocButtons";
    fill.type = "button";
    fill.innerText = "Fill";
    fill.onclick = function () {
      const select = document.getElementById("londonLocFillField");
      const field = select ? select.value : fillField || "birthLocation";
      fillLocation(field, text, results);
    };
    wrap.appendChild(fill);
  }
  parent.appendChild(wrap);
}

function addCategoryLine(parent, variant) {
  const wrap = document.createElement("div");
  wrap.className = "londonLocLine";
  const title = document.createElement("span");
  title.className = "londonLocHeading";
  title.textContent = "Category";
  wrap.appendChild(title);
  if (variant.category) {
    wrap.appendChild(document.createTextNode(variant.category));
    addCopyButton(wrap, variant.category);
  }
  if (variant.categoryNote) {
    const note = document.createElement("div");
    note.className = "londonLocNote";
    note.textContent = variant.categoryNote;
    wrap.appendChild(note);
  }
  parent.appendChild(wrap);
}

function renderSuggestions(list, placeText, selected, onChoose) {
  list.replaceChildren();
  const query = suggestionQuery(placeText);
  if (!query) {
    return;
  }
  const matches = filterRows(query);
  const shown = matches.slice(0, MAX_SUGGESTIONS);
  for (const row of shown) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menuButton londonLocChoice";
    if (selected && selected.name === row.name && selected.kind === row.kind) {
      button.classList.add("selected");
    }
    button.textContent = rowLabel(row);
    button.onclick = function () {
      onChoose(row);
    };
    list.appendChild(button);
  }
  if (matches.length > shown.length) {
    const more = document.createElement("div");
    more.className = "londonLocNote";
    more.textContent = "Keep typing to narrow the list.";
    list.appendChild(more);
  }
  if (!matches.length) {
    const none = document.createElement("div");
    none.className = "londonLocNote";
    none.textContent = "No place in the Greater London Locations table matches that name.";
    list.appendChild(none);
  }
}

async function loadPrefill(data) {
  const current = prefillFromGeneralizedData(data && data.generalizedData);
  if (current && current.placeText) {
    return current;
  }
  try {
    const saved = await getLatestPersonData();
    return prefillFromGeneralizedData(saved && saved.generalizedData);
  } catch (error) {
    return null;
  }
}

async function setupLondonLocationsMenu(data, backFunction) {
  const previousWidth = overrideMenuWidth("540px");
  const prefill = await loadPrefill(data);
  const allowFill = canFillWikiTreeEdit(data);

  const menu = beginMainMenu();
  addBackMenuItem(menu, function () {
    overrideMenuWidth(previousWidth || "350px");
    backFunction();
  });

  const placeLabel = document.createElement("label");
  placeLabel.className = "londonLocLabel";
  placeLabel.appendChild(document.createTextNode("Location name"));
  const placeInput = document.createElement("input");
  placeInput.type = "text";
  placeInput.className = "dialogTextInput londonLocInput";
  placeInput.id = "londonLocPlace";
  placeLabel.appendChild(placeInput);
  menu.list.appendChild(placeLabel);

  const note = document.createElement("div");
  note.className = "londonLocNote";
  note.id = "londonLocSelectedNote";
  menu.list.appendChild(note);

  const list = document.createElement("div");
  list.className = "londonLocList";
  menu.list.appendChild(list);

  const registrationLabel = document.createElement("label");
  registrationLabel.className = "londonLocLabel";
  const registrationInput = document.createElement("input");
  registrationInput.type = "checkbox";
  registrationInput.id = "londonLocRegistration";
  registrationLabel.appendChild(registrationInput);
  registrationLabel.appendChild(document.createTextNode(" Registration record"));
  menu.list.appendChild(registrationLabel);

  const dateLabel = document.createElement("label");
  dateLabel.className = "londonLocLabel";
  dateLabel.appendChild(document.createTextNode("Date"));
  const dateInput = document.createElement("input");
  dateInput.type = "text";
  dateInput.className = "dialogTextInput londonLocInput";
  dateInput.id = "londonLocDate";
  dateInput.placeholder = "1 Jan 1880, 1889, abt 1888, bef 1900";
  dateLabel.appendChild(dateInput);
  menu.list.appendChild(dateLabel);

  let fillField = (prefill && prefill.fillField) || "birthLocation";
  if (allowFill) {
    const fillLabel = document.createElement("label");
    fillLabel.className = "londonLocLabel";
    fillLabel.appendChild(document.createTextNode("Fill into"));
    const fillSelect = document.createElement("select");
    fillSelect.id = "londonLocFillField";
    for (const field of FILL_FIELDS) {
      const option = document.createElement("option");
      option.value = field.value;
      option.textContent = field.label;
      fillSelect.appendChild(option);
    }
    fillSelect.value = FILL_FIELDS.some((field) => field.value === fillField) ? fillField : "birthLocation";
    fillLabel.appendChild(fillSelect);
    menu.list.appendChild(fillLabel);
  }

  const results = document.createElement("div");
  results.id = "londonLocResults";
  menu.list.appendChild(results);

  function refresh() {
    const match = matchPlaceString(placeInput.value);
    const row = match ? match.row : null;
    if (row && row.kind === "registrationDistrict") {
      registrationInput.checked = true;
      registrationInput.disabled = true;
    } else if (match && match.registration) {
      registrationInput.checked = true;
      registrationInput.disabled = false;
    } else {
      registrationInput.disabled = false;
    }
    note.textContent = row && row.note ? row.note : "";
    renderSuggestions(list, placeInput.value, row, function (picked) {
      placeInput.value = picked.name;
      if (picked.kind === "registrationDistrict") {
        registrationInput.checked = true;
      }
      refresh();
    });
    renderOutputs(results, row, dateInput.value, registrationInput.checked, allowFill, fillField);
  }

  placeInput.addEventListener("input", refresh);
  dateInput.addEventListener("input", refresh);
  registrationInput.addEventListener("change", refresh);

  if (prefill) {
    placeInput.value = prefill.placeText || "";
    dateInput.value = prefill.dateText || "";
    registrationInput.checked = Boolean(prefill.registration);
  }
  refresh();

  endMainMenu(menu);
  placeInput.focus();
}

export { setupLondonLocationsMenu };
