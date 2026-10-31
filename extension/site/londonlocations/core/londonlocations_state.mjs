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

const MEMORY_LIMIT = 40;

function blankForm(wikiId) {
  return {
    wikiId: wikiId || "",
    ticks: { birth: false, marriage: false, death: false },
    marriageIndex: 0,
    includeUnitedKingdom: false,
    edits: {},
  };
}

function cloneForm(form) {
  return JSON.parse(JSON.stringify(form || blankForm("")));
}

function emptyMemory() {
  return { tabs: {}, people: [] };
}

function wikiIdFromPage(data) {
  const extracted = data && data.extractedData;
  const generalized = data && data.generalizedData;
  if (extracted && extracted.wikiId) {
    return String(extracted.wikiId);
  }
  if (generalized && (generalized.personRepoRef || generalized.wikiId)) {
    return String(generalized.personRepoRef || generalized.wikiId);
  }
  const url = extracted && (extracted.url || extracted.pageUrl) ? String(extracted.url || extracted.pageUrl) : "";
  const match = url.match(/\/wiki\/([^/?#]+)/i);
  if (!match) {
    return "";
  }
  let id = "";
  try {
    id = decodeURIComponent(match[1]);
  } catch (error) {
    id = match[1];
  }
  if (/^(space|category|special):/i.test(id) || !/-\d+$/.test(id)) {
    return "";
  }
  return id;
}

function personForm(memory, wikiId) {
  if (!wikiId || !memory || !memory.people) {
    return null;
  }
  for (let index = memory.people.length - 1; index >= 0; index--) {
    if (memory.people[index].wikiId === wikiId) {
      return cloneForm(memory.people[index].form);
    }
  }
  return null;
}

function rememberPerson(memory, wikiId, form) {
  const next = {
    tabs: Object.assign({}, (memory && memory.tabs) || {}),
    people: ((memory && memory.people) || []).filter(function (person) {
      return person.wikiId !== wikiId;
    }),
  };
  if (wikiId) {
    next.people.push({
      wikiId: wikiId,
      savedAt: Date.now(),
      form: Object.assign(cloneForm(form), { wikiId: wikiId }),
    });
    while (next.people.length > MEMORY_LIMIT) {
      next.people.shift();
    }
  }
  return next;
}

function saveTab(memory, tabId, form) {
  const tabs = Object.assign({}, (memory && memory.tabs) || {});
  tabs[String(tabId)] = cloneForm(form);
  let next = { tabs: tabs, people: ((memory && memory.people) || []).slice() };
  if (form && form.wikiId) {
    next = rememberPerson(next, form.wikiId, form);
  }
  return next;
}

function clearPeople(memory) {
  return emptyMemory();
}

function resolveForm(memory, tabId, pageWikiId) {
  const base = memory || emptyMemory();
  const existing = (base.tabs || {})[String(tabId)];
  const pageId = pageWikiId || "";
  if (!existing) {
    const remembered = pageId ? personForm(base, pageId) : null;
    const form = remembered ? Object.assign(remembered, { wikiId: pageId }) : blankForm(pageId);
    return { form: form, mismatch: false, memory: saveTab(base, tabId, form) };
  }
  if (!pageId || !existing.wikiId || existing.wikiId === pageId) {
    const form = pageId && !existing.wikiId ? Object.assign(cloneForm(existing), { wikiId: pageId }) : existing;
    return { form: form, mismatch: false, memory: base };
  }
  const remembered = personForm(base, pageId);
  if (remembered) {
    const withPrevious = rememberPerson(base, existing.wikiId, existing);
    const form = Object.assign(remembered, { wikiId: pageId });
    return { form: form, mismatch: false, memory: saveTab(withPrevious, tabId, form) };
  }
  return { form: existing, mismatch: true, memory: rememberPerson(base, existing.wikiId, existing) };
}

export {
  MEMORY_LIMIT,
  blankForm,
  emptyMemory,
  wikiIdFromPage,
  personForm,
  rememberPerson,
  saveTab,
  clearPeople,
  resolveForm,
};
