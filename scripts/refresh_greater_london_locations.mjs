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

// Rebuild extension/site/londonlocations/core/greater_london_locations.mjs
// from Space:Greater_London_Locations.
//
//   node scripts/refresh_greater_london_locations.mjs
//   node scripts/refresh_greater_london_locations.mjs --from path/to/table.md
//
// The default fetches the raw wikitext. --from reads a local wikitext or
// markdown export. Review the diff before committing: the space page says the
// list is incomplete.

import fs from "fs";
import path from "path";

const SOURCE_URL = "https://www.wikitree.com/wiki/Space:Greater_London_Locations";
const RAW_URL = "https://www.wikitree.com/index.php?title=Space:Greater_London_Locations&action=raw";
const OUTPUT = path.resolve("extension/site/londonlocations/core/greater_london_locations.mjs");

function wikiDisplayText(cell) {
  let text = cell.replace(/\{\{[^}]+\}\}/g, " ");
  text = text.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1");
  text = text.replace(/'''|''/g, "");
  text = text.replace(/<[^>]+>/g, "");
  return text.replace(/\s+/g, " ").trim();
}

function parseCounty(cell) {
  const text = wikiDisplayText(cell);
  if (!text || text === "-" || text === "—" || text === "–" || /^[-—–]+$/.test(text)) {
    return null;
  }
  if (text.includes("/")) {
    return text
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return text;
}

function classifyName(rawName) {
  const name = rawName.replace(/\s+/g, " ").trim();
  if (/registration district$/i.test(name)) {
    return { name: name, note: "", kind: "registrationDistrict" };
  }
  const noteMatch = name.match(/^(.*)\s+\(([^)]+)\)$/);
  if (noteMatch) {
    const note = noteMatch[2].trim();
    const kind = /london borough/i.test(note) ? "borough" : "place";
    return { name: noteMatch[1].trim(), note: note, kind: kind };
  }
  return { name: name, note: "", kind: "place" };
}

function isDashOnly(text) {
  return /^[-—–]+$/.test(text);
}

function isHeaderOrLetter(name) {
  if (!name) {
    return true;
  }
  if (isDashOnly(name)) {
    return true;
  }
  if (/^location$/i.test(name)) {
    return true;
  }
  if (/^navigator$/i.test(name)) {
    return true;
  }
  if (/^[A-Z]$/.test(name)) {
    return true;
  }
  return false;
}

function rowFromCells(cells) {
  if (!cells || cells.length < 4) {
    return null;
  }
  const classified = classifyName(wikiDisplayText(cells[0]));
  if (isHeaderOrLetter(classified.name)) {
    return null;
  }
  return {
    name: classified.name,
    note: classified.note,
    kind: classified.kind,
    counties: {
      to1889: parseCounty(cells[1]),
      london: parseCounty(cells[2]),
      greaterLondon: parseCounty(cells[3]),
    },
  };
}

function cellsFromLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) {
    return null;
  }
  if (trimmed.startsWith("|-") || trimmed.startsWith("|+") || trimmed.startsWith("|}")) {
    return null;
  }
  let body = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const pieces = body.includes("||") ? body.split("||") : body.split("|");
  return pieces.map((piece) => piece.trim());
}

function parseLocationTable(text) {
  const places = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = cellsFromLine(line);
    const row = rowFromCells(cells);
    if (row) {
      places.push(row);
    }
  }
  return places;
}

function renderModule(places, retrieved) {
  const payload = {
    source: SOURCE_URL,
    retrieved: retrieved,
    places: places,
  };
  return `/*
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

// Generated by scripts/refresh_greater_london_locations.mjs
// Source: ${SOURCE_URL}
// Retrieved: ${retrieved}
// Do not edit by hand. Re-run the script and review the diff.

export const greaterLondonLocations = ${JSON.stringify(payload, null, 2)};
`;
}

async function loadText() {
  const fromFlag = process.argv.indexOf("--from");
  if (fromFlag !== -1) {
    const filePath = process.argv[fromFlag + 1];
    if (!filePath) {
      throw new Error("--from needs a file path");
    }
    return fs.readFileSync(filePath, "utf8");
  }
  const response = await fetch(RAW_URL, {
    headers: { "User-Agent": "WikiTree-Sourcer-london-locations-refresh" },
  });
  if (!response.ok) {
    throw new Error("Fetch failed: " + response.status + " " + response.statusText);
  }
  return await response.text();
}

async function main() {
  const text = await loadText();
  const places = parseLocationTable(text);
  if (places.length < 50) {
    throw new Error("Only parsed " + places.length + " places. The table format may have changed.");
  }
  const retrieved = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, renderModule(places, retrieved));
  console.log("Wrote " + places.length + " places to " + OUTPUT);
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith("refresh_greater_london_locations.mjs");
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { parseLocationTable, classifyName, parseCounty };
