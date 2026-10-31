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
  SEARCH_MENU_LABEL,
  buildOutputs,
  profileEvents,
  hasProfileEvents,
  canFillWikiTreeEdit,
} from "../core/london_location.mjs";

const FORM_STORAGE_KEY = "londonLocationsForm";

function formStorage() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.session) {
    return chrome.storage.session;
  }
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return chrome.storage.local;
  }
  return null;
}

function saveFormState(state) {
  const area = formStorage();
  if (!area) {
    return;
  }
  area.set({ [FORM_STORAGE_KEY]: state });
}

function loadFormState() {
  const area = formStorage();
  if (!area) {
    return Promise.resolve(null);
  }
  return new Promise(function (resolve) {
    area.get(FORM_STORAGE_KEY, function (value) {
      resolve(value ? value[FORM_STORAGE_KEY] : null);
    });
  });
}

function clearFormState() {
  const area = formStorage();
  if (!area) {
    return;
  }
  area.remove(FORM_STORAGE_KEY);
}

let otherToolListener = null;

function armClearWhenAnotherToolIsChosen() {
  if (otherToolListener) {
    document.removeEventListener("click", otherToolListener, true);
  }
  otherToolListener = function (event) {
    const button = event.target && event.target.closest ? event.target.closest("button") : null;
    if (!button) {
      return;
    }
    const text = (button.innerText || "").replace(/\s+/g, " ").trim();
    if (text === SEARCH_MENU_LABEL || text === "< Back") {
      if (text === SEARCH_MENU_LABEL) {
        document.removeEventListener("click", otherToolListener, true);
        otherToolListener = null;
      }
      return;
    }
    if (!button.classList.contains("menuButton") && !button.classList.contains("dialogButton")) {
      return;
    }
    document.removeEventListener("click", otherToolListener, true);
    otherToolListener = null;
    clearFormState();
  };
  setTimeout(function () {
    if (otherToolListener) {
      document.addEventListener("click", otherToolListener, true);
    }
  }, 0);
}

const MAX_SUGGESTIONS = 40;

const ROLES = [
  { id: "birth", title: "Birth", fillField: "birthLocation" },
  { id: "marriage", title: "Marriage", fillField: "marriageLocation" },
  { id: "death", title: "Death", fillField: "deathLocation" },
];

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

function blankState(fillField) {
  return {
    place: "",
    date: "",
    registration: false,
    fillField: fillField || "birthLocation",
  };
}

function stateFromEvent(event, fillField) {
  if (!event) {
    return blankState(fillField);
  }
  return {
    place: event.placeText || "",
    date: event.dateText || "",
    registration: Boolean(event.registration),
    fillField: fillField,
  };
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

function addOutputLine(parent, heading, text) {
  const wrap = document.createElement("div");
  wrap.className = "londonLocLine";
  const title = document.createElement("span");
  title.className = "londonLocHeading";
  title.textContent = heading;
  wrap.appendChild(title);
  wrap.appendChild(document.createTextNode(text));
  addCopyButton(wrap, text);
  parent.appendChild(wrap);
  return wrap;
}

function renderOutputs(results, row, dateText, registration, includeUnitedKingdom, allowFill, onUnitedKingdomChange) {
  const keptSelect = results.querySelector("select");
  const selectedField = keptSelect ? keptSelect.value : "";
  results.replaceChildren();

  const rule = document.createElement("hr");
  rule.className = "londonLocRule";
  results.appendChild(rule);

  const heading = document.createElement("div");
  heading.className = "londonLocHeading";
  heading.textContent = "Result";
  results.appendChild(heading);

  const ukLabel = document.createElement("label");
  ukLabel.className = "londonLocCheck";
  const ukBox = document.createElement("input");
  ukBox.type = "checkbox";
  ukBox.checked = includeUnitedKingdom;
  ukBox.addEventListener("change", function () {
    onUnitedKingdomChange(ukBox.checked);
  });
  ukLabel.appendChild(ukBox);
  ukLabel.appendChild(document.createTextNode("Include United Kingdom (from 1801)"));
  results.appendChild(ukLabel);

  const fillLabel = document.createElement("label");
  fillLabel.className = "londonLocCheck";
  fillLabel.appendChild(document.createTextNode("Result goes to"));
  const fillSelect = document.createElement("select");
  for (const field of FILL_FIELDS) {
    const option = document.createElement("option");
    option.value = field.value;
    option.textContent = field.label;
    fillSelect.appendChild(option);
  }
  if (selectedField) {
    fillSelect.value = selectedField;
  }
  fillLabel.appendChild(fillSelect);
  results.appendChild(fillLabel);

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

  const built = buildOutputs(row, dateText, registration, { includeUnitedKingdom: includeUnitedKingdom });
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
    if (option.ukNote) {
      const ukNote = document.createElement("div");
      ukNote.className = "londonLocNote";
      ukNote.textContent = option.ukNote;
      block.appendChild(ukNote);
    }
    for (const variant of option.variants) {
      if (option.variants.length > 1) {
        const which = document.createElement("div");
        which.className = "londonLocHeading";
        which.textContent = variant.county;
        block.appendChild(which);
      }
      const locationLine = addOutputLine(block, "Location field", variant.location);
      if (allowFill) {
        const fill = document.createElement("button");
        fill.className = "dialogButton londonLocButtons";
        fill.type = "button";
        fill.innerText = "Fill";
        fill.onclick = function () {
          fillLocation(fillSelect.value, variant.location, results);
        };
        locationLine.appendChild(fill);
      }
      const categoryLine = document.createElement("div");
      categoryLine.className = "londonLocLine";
      const categoryTitle = document.createElement("span");
      categoryTitle.className = "londonLocHeading";
      categoryTitle.textContent = "WikiTree Category";
      categoryLine.appendChild(categoryTitle);
      if (variant.categoryWiki) {
        categoryLine.appendChild(document.createTextNode(variant.categoryWiki));
        addCopyButton(categoryLine, variant.categoryWiki);
      }
      if (variant.categoryNote) {
        const note = document.createElement("div");
        note.className = "londonLocNote";
        note.textContent = variant.categoryNote;
        categoryLine.appendChild(note);
      }
      block.appendChild(categoryLine);
      addOutputLine(block, "Bio Narrative", variant.narrative);
    }
    results.appendChild(block);
  }
}

async function loadEvents(data) {
  const current = profileEvents(data && data.generalizedData);
  if (hasProfileEvents(current)) {
    return current;
  }
  try {
    const saved = await getLatestPersonData();
    const fromSaved = profileEvents(saved && saved.generalizedData);
    if (hasProfileEvents(fromSaved)) {
      return fromSaved;
    }
  } catch (error) {
    return profileEvents(null);
  }
  return profileEvents(null);
}

async function setupLondonLocationsMenu(data, backFunction) {
  const previousWidth = overrideMenuWidth("540px");
  const events = await loadEvents(data);
  const allowFill = canFillWikiTreeEdit(data);
  const savedForm = await loadFormState();
  const edits = (savedForm && savedForm.edits) || {};
  let marriageIndex = savedForm && savedForm.marriageIndex ? savedForm.marriageIndex : 0;
  let includeUnitedKingdom = Boolean(savedForm && savedForm.includeUnitedKingdom);

  const menu = beginMainMenu();
  addBackMenuItem(menu, function () {
    saveForm();
    armClearWhenAnotherToolIsChosen();
    overrideMenuWidth(previousWidth || "350px");
    backFunction();
  });

  const prefillRow = document.createElement("div");
  prefillRow.className = "londonLocToolbar";
  const prefillLabel = document.createElement("span");
  prefillLabel.textContent = "Prefill";
  prefillRow.appendChild(prefillLabel);
  const ticks = {};
  for (const role of ROLES) {
    const label = document.createElement("label");
    label.className = "londonLocCheck";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.role = role.id;
    label.appendChild(input);
    label.appendChild(document.createTextNode(role.title));
    prefillRow.appendChild(label);
    ticks[role.id] = input;
  }
  menu.list.appendChild(prefillRow);
  if (savedForm && savedForm.ticks) {
    for (const role of ROLES) {
      ticks[role.id].checked = Boolean(savedForm.ticks[role.id]);
    }
  }

  const clearAll = document.createElement("button");
  clearAll.type = "button";
  clearAll.className = "dialogButton";
  clearAll.textContent = "Clear all";
  clearAll.style.margin = "4px 10px 8px 10px";
  menu.list.appendChild(clearAll);

  const sections = document.createElement("div");
  menu.list.appendChild(sections);

  function marriageEvent() {
    if (!events.marriages.length) {
      return null;
    }
    if (marriageIndex < 0 || marriageIndex >= events.marriages.length) {
      marriageIndex = 0;
    }
    return events.marriages[marriageIndex];
  }

  function initialState(roleId) {
    if (roleId === "birth") {
      return stateFromEvent(events.birth, "birthLocation");
    }
    if (roleId === "death") {
      return stateFromEvent(events.death, "deathLocation");
    }
    if (roleId === "marriage") {
      return stateFromEvent(marriageEvent(), "marriageLocation");
    }
    return blankState("birthLocation");
  }

  function activeRoles() {
    return ROLES.filter((role) => ticks[role.id].checked);
  }

  function renderSections() {
    sections.replaceChildren();
    const roles = activeRoles();
    const shown = roles.length ? roles : [{ id: "manual", title: "Location", fillField: "birthLocation" }];
    shown.forEach(function (role, index) {
      const state = edits[role.id] || initialState(role.id);
      sections.appendChild(buildSection(index + 1, role, state));
    });
  }

  function buildSection(number, role, state) {
    const section = document.createElement("div");
    section.className = "londonLocSection";
    section.dataset.role = role.id;

    const title = document.createElement("div");
    title.className = "londonLocSectionTitle";
    title.textContent = number + ". " + role.title;
    section.appendChild(title);

    if (role.id === "marriage" && events.marriages.length > 1) {
      const spouseLabel = document.createElement("label");
      spouseLabel.className = "londonLocLabel";
      spouseLabel.appendChild(document.createTextNode("Spouse"));
      const spouseSelect = document.createElement("select");
      events.marriages.forEach(function (marriage, index) {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = marriage.label;
        spouseSelect.appendChild(option);
      });
      spouseSelect.value = String(marriageIndex);
      spouseSelect.addEventListener("change", function () {
        marriageIndex = Number(spouseSelect.value);
        const next = stateFromEvent(marriageEvent(), "marriageLocation");
        edits.marriage = next;
        placeInput.value = next.place;
        dateInput.value = next.date;
        registrationInput.checked = next.registration;
        refresh();
      });
      spouseLabel.appendChild(spouseSelect);
      section.appendChild(spouseLabel);
    }

    const placeLabel = document.createElement("label");
    placeLabel.className = "londonLocLabel";
    placeLabel.appendChild(document.createTextNode("Location name"));
    const placeInput = document.createElement("input");
    placeInput.type = "text";
    placeInput.className = "dialogTextInput londonLocInput";
    placeInput.value = state.place;
    placeLabel.appendChild(placeInput);
    section.appendChild(placeLabel);

    const note = document.createElement("div");
    note.className = "londonLocNote";
    section.appendChild(note);

    const list = document.createElement("div");
    list.className = "londonLocList";
    section.appendChild(list);

    const registrationLabel = document.createElement("label");
    registrationLabel.className = "londonLocCheck";
    const registrationInput = document.createElement("input");
    registrationInput.type = "checkbox";
    registrationInput.checked = state.registration;
    registrationLabel.appendChild(registrationInput);
    registrationLabel.appendChild(document.createTextNode("Registration record"));
    section.appendChild(registrationLabel);

    const dateLabel = document.createElement("label");
    dateLabel.className = "londonLocLabel";
    dateLabel.appendChild(document.createTextNode("Date"));
    const dateInput = document.createElement("input");
    dateInput.type = "text";
    dateInput.className = "dialogTextInput londonLocInput";
    dateInput.placeholder = "1 Jan 1880, 1889, abt 1888, bef 1900";
    dateInput.value = state.date;
    dateLabel.appendChild(dateInput);
    section.appendChild(dateLabel);

    const clearSection = document.createElement("button");
    clearSection.type = "button";
    clearSection.className = "dialogButton";
    clearSection.textContent = "Clear section";
    clearSection.classList.add("londonLocClearSection");
    clearSection.onclick = function () {
      edits[role.id] = blankState(role.fillField);
      placeInput.value = "";
      dateInput.value = "";
      registrationInput.checked = false;
      refresh();
    };
    section.appendChild(clearSection);

    const results = document.createElement("div");
    section.appendChild(results);
    const fillSelectHolder = document.createElement("div");
    results.appendChild(fillSelectHolder);

    function remember() {
      const select = results.querySelector("select");
      edits[role.id] = {
        place: placeInput.value,
        date: dateInput.value,
        registration: registrationInput.checked,
        fillField: select ? select.value : state.fillField,
      };
    }

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
      renderOutputs(
        results,
        row,
        dateInput.value,
        registrationInput.checked,
        includeUnitedKingdom,
        allowFill,
        function (checked) {
          includeUnitedKingdom = checked;
          saveForm();
          renderSections();
        }
      );
      const select = results.querySelector("select");
      if (select) {
        const wanted = (edits[role.id] && edits[role.id].fillField) || state.fillField;
        if (FILL_FIELDS.some((field) => field.value === wanted)) {
          select.value = wanted;
        }
        select.onchange = function () {
          remember();
          saveForm();
        };
      }
      remember();
      saveForm();
    }

    placeInput.addEventListener("input", refresh);
    dateInput.addEventListener("input", refresh);
    registrationInput.addEventListener("change", refresh);
    refresh();
    return section;
  }

  function saveForm() {
    saveFormState({
      ticks: {
        birth: ticks.birth.checked,
        marriage: ticks.marriage.checked,
        death: ticks.death.checked,
      },
      marriageIndex: marriageIndex,
      includeUnitedKingdom: includeUnitedKingdom,
      edits: edits,
    });
  }

  function onTicksChanged() {
    renderSections();
    saveForm();
  }

  for (const role of ROLES) {
    ticks[role.id].addEventListener("change", onTicksChanged);
  }
  clearAll.onclick = function () {
    for (const role of ROLES) {
      ticks[role.id].checked = false;
    }
    includeUnitedKingdom = false;
    marriageIndex = 0;
    for (const key of Object.keys(edits)) {
      delete edits[key];
    }
    clearFormState();
    renderSections();
  };

  renderSections();
  endMainMenu(menu);
}

export { setupLondonLocationsMenu };
