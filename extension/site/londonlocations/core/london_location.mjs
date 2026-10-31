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

import { DateUtils } from "../../../base/core/date_utils.mjs";
import { greaterLondonLocations } from "./greater_london_locations.mjs";

const SEARCH_MENU_LABEL = "Search London Locations";

// County of London began on 21 March 1889. Greater London began on 1 April 1965.
// Space:Greater_London_Locations uses these dates for places and registration districts.
const COUNTY_OF_LONDON = 18890321;
const GREATER_LONDON = 19650401;

const PERIODS = [
  { id: "to1889", start: -Infinity, end: COUNTY_OF_LONDON - 1, label: "to 1888" },
  { id: "london", start: COUNTY_OF_LONDON, end: GREATER_LONDON - 1, label: "1889–1965" },
  { id: "greaterLondon", start: GREATER_LONDON, end: Infinity, label: "from 1965" },
];

// Ward category titles requested on Space:Greater_London_Locations.
// They are containers. The parish landing category is not in this table.
const WARD_CATEGORIES = {
  Bishopsgate: "Bishopsgate Ward, City of London",
  Cripplegate: "Cripplegate Ward, City of London",
  Farringdon: "Farringdon Ward, City of London",
};

const COUNTY_SUFFIXES = [
  "city of london",
  "greater london",
  "hertfordshire",
  "middlesex",
  "surrey",
  "essex",
  "kent",
  "london",
];

function toYmd(year, month, day) {
  return year * 10000 + month * 100 + day;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftDays(year, month, day, delta) {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function shiftYears(year, month, day, delta) {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(date.getUTCFullYear() + delta);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function normaliseName(value) {
  let text = String(value || "").toLowerCase();
  text = text.replace(/[\u2019\u2018\u02bc']/g, "");
  text = text.replace(/\./g, "");
  text = text.replace(/[-–—]/g, " ");
  text = text.replace(/\bsaint\b/g, "st");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function categoryPlaceName(name) {
  return name
    .replace(/\bSaint\b/g, "St")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asCountyList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function findRowByName(name) {
  const wanted = normaliseName(name);
  if (!wanted) {
    return undefined;
  }
  return greaterLondonLocations.places.find((row) => normaliseName(row.name) === wanted);
}

function filterRows(query) {
  const wanted = normaliseName(query);
  if (!wanted) {
    return [];
  }
  return greaterLondonLocations.places.filter((row) => {
    if (normaliseName(row.name).includes(wanted)) {
      return true;
    }
    if (row.note && normaliseName(row.note).includes(wanted)) {
      return true;
    }
    return false;
  });
}

function rowLabel(row) {
  if (row.note) {
    return row.name + " (" + row.note + ")";
  }
  return row.name;
}

function tidyPlace(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*$/, "")
    .trim();
}

function stripPlaceTail(text) {
  const candidates = [];
  const seen = new Set();
  let current = tidyPlace(text);

  function add(value) {
    const tidy = tidyPlace(value);
    const key = tidy.toLowerCase();
    if (tidy && !seen.has(key)) {
      seen.add(key);
      candidates.push(tidy);
    }
  }

  add(current);
  for (let guard = 0; guard < 6; guard++) {
    let next = current.replace(/,?\s*(united kingdom|england|uk)$/i, "").trim();
    next = next.replace(/,\s*$/, "").trim();
    for (const county of COUNTY_SUFFIXES) {
      const pattern = new RegExp(",\\s*" + county.replace(/ /g, "\\s+") + "$", "i");
      if (pattern.test(next)) {
        next = next.replace(pattern, "").trim();
        break;
      }
    }
    next = tidyPlace(next);
    if (next === current) {
      break;
    }
    current = next;
    add(current);
  }
  return candidates;
}

function matchPlaceString(input) {
  if (!input || !String(input).trim()) {
    return null;
  }
  const registrationInText = /registration\s+district/i.test(input);
  for (const candidate of stripPlaceTail(input)) {
    const direct = findRowByName(candidate);
    if (direct) {
      return {
        row: direct,
        registration: registrationInText || direct.kind === "registrationDistrict",
      };
    }
    const withoutDistrict = candidate.replace(/\s+registration\s+district\s*$/i, "").trim();
    if (withoutDistrict && withoutDistrict !== candidate) {
      const row = findRowByName(withoutDistrict);
      if (row) {
        return { row: row, registration: true };
      }
    }
  }
  return null;
}

function parseLocationDate(input) {
  if (!input || !String(input).trim()) {
    return { ok: false, message: "Enter a date." };
  }
  let text = String(input).trim().replace(/\s+/g, " ");
  let qualifier = "exact";
  const prefix = text.match(/^(about|abt|circa|before|bef|after|aft)\s+(.+)$/i);
  if (prefix) {
    const word = prefix[1].toLowerCase();
    text = prefix[2].trim();
    if (word === "about" || word === "abt" || word === "circa") {
      qualifier = "about";
    } else if (word === "before" || word === "bef") {
      qualifier = "before";
    } else {
      qualifier = "after";
    }
  }

  const parsed = DateUtils.parseDateString(text);
  if (!parsed.isValid || parsed.isRange || !parsed.yearNum) {
    return { ok: false, message: "Enter an exact date, or a year with abt, bef or aft." };
  }

  return {
    ok: true,
    qualifier: qualifier,
    label: text,
    year: parsed.yearNum,
    month: parsed.hasMonth ? parsed.monthNum : 0,
    day: parsed.hasDay ? parsed.dayNum : 0,
    hasMonth: Boolean(parsed.hasMonth),
    hasDay: Boolean(parsed.hasDay),
  };
}

function dateRange(parsed) {
  const year = parsed.year;
  const month = parsed.month;
  const day = parsed.day;
  if (parsed.qualifier === "exact") {
    if (parsed.hasDay && parsed.hasMonth) {
      const value = toYmd(year, month, day);
      return { start: value, end: value };
    }
    if (parsed.hasMonth) {
      return { start: toYmd(year, month, 1), end: toYmd(year, month, daysInMonth(year, month)) };
    }
    return { start: toYmd(year, 1, 1), end: toYmd(year, 12, 31) };
  }
  if (parsed.qualifier === "about") {
    if (parsed.hasDay && parsed.hasMonth) {
      const earlier = shiftYears(year, month, day, -1);
      const later = shiftYears(year, month, day, 1);
      return { start: toYmd(earlier.year, earlier.month, earlier.day), end: toYmd(later.year, later.month, later.day) };
    }
    if (parsed.hasMonth) {
      const earlier = shiftYears(year, month, 1, -1);
      const later = shiftYears(year, month, daysInMonth(year, month), 1);
      return { start: toYmd(earlier.year, earlier.month, earlier.day), end: toYmd(later.year, later.month, later.day) };
    }
    return { start: toYmd(year - 1, 1, 1), end: toYmd(year + 1, 12, 31) };
  }
  if (parsed.qualifier === "before") {
    let end;
    if (parsed.hasDay && parsed.hasMonth) {
      const previous = shiftDays(year, month, day, -1);
      end = toYmd(previous.year, previous.month, previous.day);
    } else if (parsed.hasMonth) {
      const previous = shiftDays(year, month, 1, -1);
      end = toYmd(previous.year, previous.month, previous.day);
    } else {
      end = toYmd(year - 1, 12, 31);
    }
    return { start: toYmd(1, 1, 1), end: end };
  }
  let start;
  if (parsed.hasDay && parsed.hasMonth) {
    const next = shiftDays(year, month, day, 1);
    start = toYmd(next.year, next.month, next.day);
  } else if (parsed.hasMonth) {
    const next = shiftDays(year, month, daysInMonth(year, month), 1);
    start = toYmd(next.year, next.month, next.day);
  } else {
    start = toYmd(year + 1, 1, 1);
  }
  return { start: start, end: toYmd(9999, 12, 31) };
}

function periodsInRange(start, end) {
  return PERIODS.filter((period) => start <= period.end && end >= period.start);
}

function periodReason(parsed, periodId) {
  const when = {
    to1889: "before 21 March 1889",
    london: "from 21 March 1889 to 31 March 1965",
    greaterLondon: "from 1 April 1965",
  }[periodId];
  if (parsed.qualifier === "about") {
    return "About " + parsed.label + " is one year either side, which includes dates " + when + ".";
  }
  if (parsed.qualifier === "before") {
    return "Before " + parsed.label + " includes dates " + when + ".";
  }
  if (parsed.qualifier === "after") {
    return "After " + parsed.label + " includes dates " + when + ".";
  }
  return parsed.label + " includes dates " + when + ".";
}

function placeLabel(row, registration) {
  if (row.kind === "registrationDistrict") {
    return row.name;
  }
  if (registration) {
    return row.name + " Registration District";
  }
  return row.name;
}

function historicCounty(row) {
  const counties = asCountyList(row.counties.to1889);
  return counties.find((county) => county !== "City of London") || null;
}

function categoryFor(row, county) {
  if (row.kind === "borough") {
    return {
      category: null,
      categoryNote: "London Borough of " + row.name + " is a container category. Do not add it to a profile.",
    };
  }
  if (row.kind === "registrationDistrict") {
    return {
      category: null,
      categoryNote: "A registration district is not a place category.",
    };
  }
  if (county === "City of London") {
    if (row.name === "City of London") {
      return {
        category: "City of London",
        categoryNote: "Top-level category, not a landing category.",
      };
    }
    if (WARD_CATEGORIES[row.name]) {
      return {
        category: WARD_CATEGORIES[row.name],
        categoryNote: "Ward container, not a parish landing category.",
      };
    }
    return {
      category: null,
      categoryNote: "The parish landing category is not in this table. Ward categories are containers.",
    };
  }
  const historic = historicCounty(row);
  if (!historic) {
    return { category: null, categoryNote: "No historic county is listed for this place." };
  }
  return {
    category: categoryPlaceName(row.name) + ", " + historic + " (London)",
    categoryNote: "",
  };
}

function formatLocation(label, county) {
  if (county === "City of London" && label === "City of London") {
    return "City of London, England";
  }
  return label + ", " + county + ", England";
}

function formatNarrative(label, county, includeUnitedKingdom) {
  if (county === "City of London") {
    let text = label === "City of London" ? "the City of London" : label + " in the City of London";
    if (includeUnitedKingdom) {
      text += ", England, United Kingdom";
    }
    return text;
  }
  let text = label + ", " + county;
  if (includeUnitedKingdom) {
    text += ", England, United Kingdom";
  }
  return text;
}

const UNITED_KINGDOM_START = 18010101;

function categoryWikiText(category) {
  if (!category) {
    return null;
  }
  return "[[Category: " + category + "]]";
}

function unitedKingdomStatus(range, includeUnitedKingdom) {
  if (!includeUnitedKingdom) {
    return { allowed: false, note: "" };
  }
  if (range.start >= UNITED_KINGDOM_START) {
    return { allowed: true, note: "" };
  }
  if (range.end < UNITED_KINGDOM_START) {
    return {
      allowed: false,
      note: "United Kingdom is only used from 1801, so it has not been added.",
    };
  }
  return {
    allowed: false,
    note: "This date could fall before 1801, so United Kingdom has not been added.",
  };
}

function locationPlaceName(row) {
  const stripped = row.name.replace(/\s+Registration District$/i, "").trim();
  return stripped || row.name;
}

function variantFor(row, county, registration, includeUnitedKingdom) {
  const narrativeLabel = placeLabel(row, registration);
  const category = categoryFor(row, county);
  let location = formatLocation(locationPlaceName(row), county);
  const narrative = formatNarrative(narrativeLabel, county, includeUnitedKingdom);
  if (includeUnitedKingdom) {
    location = location + ", United Kingdom";
  }
  return {
    county: county,
    location: location,
    narrative: narrative,
    category: category.category,
    categoryWiki: categoryWikiText(category.category),
    categoryNote: category.categoryNote,
  };
}

function buildOutputs(row, dateInput, registration, outputOptions) {
  const includeRequest = Boolean(outputOptions && outputOptions.includeUnitedKingdom);
  if (!row) {
    return { ok: false, message: "Choose a place from the list." };
  }
  const parsed = parseLocationDate(dateInput);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }
  const range = dateRange(parsed);
  const uk = unitedKingdomStatus(range, includeRequest);
  const periods = periodsInRange(range.start, range.end);
  const options = [];
  const missing = [];
  for (const period of periods) {
    const counties = asCountyList(row.counties[period.id]);
    if (!counties.length) {
      missing.push(period.label);
      continue;
    }
    options.push({
      period: period.id,
      periodLabel: period.label,
      reason: periods.length > 1 ? periodReason(parsed, period.id) : "",
      ukNote: uk.note,
      variants: counties.map((county) => variantFor(row, county, registration, uk.allowed)),
    });
  }
  let message = "";
  if (missing.length && options.length) {
    message = row.name + " is not listed for " + missing.join(" or ") + ".";
  } else if (!options.length) {
    message = row.name + " is not listed for " + (missing.join(" or ") || "that date") + ".";
  }
  return {
    ok: true,
    ambiguous: periods.length > 1,
    message: message,
    options: options,
  };
}

function dateTextFrom(date) {
  if (!date) {
    return "";
  }
  if (typeof date === "string") {
    return date;
  }
  const text = date.dateString || date.yearString || "";
  if (!text) {
    return "";
  }
  if (/^(abt|about|circa|bef|before|aft|after)\b/i.test(text)) {
    return text;
  }
  if (date.qualifier === 2) {
    return "abt " + text;
  }
  if (date.qualifier === 3) {
    return "bef " + text;
  }
  if (date.qualifier === 4) {
    return "aft " + text;
  }
  return text;
}

function placeTextFrom(place) {
  if (!place) {
    return "";
  }
  if (typeof place === "string") {
    return place;
  }
  return place.placeString || "";
}

function isRegistrationRecord(gd) {
  const recordType = gd && gd.recordType ? String(gd.recordType) : "";
  return /Registration/.test(recordType);
}

function spouseLabel(spouse, index) {
  let name = "";
  if (spouse && spouse.name) {
    if (typeof spouse.name === "string") {
      name = spouse.name;
    } else {
      name = [spouse.name.forenames, spouse.name.lastName].filter(Boolean).join(" ");
    }
  }
  if (!name && spouse && spouse.lastNameAtBirth) {
    name = spouse.lastNameAtBirth;
  }
  if (name) {
    return name;
  }
  return "Marriage " + (index + 1);
}

function packEvent(place, date, registration) {
  const rawPlace = placeTextFrom(place);
  const dateText = dateTextFrom(date);
  if (!rawPlace && !dateText) {
    return null;
  }
  const match = rawPlace ? matchPlaceString(rawPlace) : null;
  return {
    placeText: match ? match.row.name : rawPlace,
    dateText: dateText,
    registration: Boolean(registration || (match && match.registration)),
    matched: Boolean(match),
  };
}

function isBirthRecord(recordType) {
  return (
    recordType === "Birth" ||
    recordType === "BirthRegistration" ||
    recordType === "Baptism" ||
    recordType === "BirthOrBaptism"
  );
}

function isDeathRecord(recordType) {
  return (
    recordType === "Death" ||
    recordType === "DeathRegistration" ||
    recordType === "Burial" ||
    recordType === "Cremation" ||
    recordType === "DeathOrBurial"
  );
}

function isMarriageRecord(recordType) {
  return recordType === "Marriage" || recordType === "MarriageRegistration";
}

function profileEvents(gd) {
  const empty = { birth: null, death: null, marriages: [] };
  if (!gd) {
    return empty;
  }
  const registration = isRegistrationRecord(gd);
  const birth = packEvent(gd.birthPlace, gd.birthDate, registration && gd.birthPlace);
  const death = packEvent(gd.deathPlace, gd.deathDate, registration && gd.deathPlace);
  const marriages = [];
  if (Array.isArray(gd.spouses)) {
    gd.spouses.forEach(function (spouse, index) {
      const packed = packEvent(spouse.marriagePlace, spouse.marriageDate, registration && spouse.marriagePlace);
      if (packed) {
        packed.label = spouseLabel(spouse, index);
        marriages.push(packed);
      }
    });
  }

  const recordType = gd.recordType;
  const eventPlace = gd.eventPlace || (gd.registrationDistrict ? gd.registrationDistrict : "");
  const eventPacked = packEvent(eventPlace, gd.eventDate, registration || Boolean(gd.registrationDistrict));
  if (eventPacked && isBirthRecord(recordType) && !birth) {
    empty.birth = eventPacked;
  } else {
    empty.birth = birth;
  }
  if (eventPacked && isDeathRecord(recordType) && !death) {
    empty.death = eventPacked;
  } else {
    empty.death = death;
  }
  if (eventPacked && isMarriageRecord(recordType) && !marriages.length) {
    eventPacked.label = "Marriage";
    marriages.push(eventPacked);
  }
  empty.marriages = marriages;
  return empty;
}

function profileEventsFromPage(data) {
  const gd = (data && data.generalizedData) || {};
  const ed = (data && data.extractedData) || {};
  const merged = Object.assign({}, gd);
  if (!placeTextFrom(merged.birthPlace) && ed.birthLocation) {
    merged.birthPlace = ed.birthLocation;
    if (!merged.birthDate && ed.birthDate) {
      merged.birthDate = ed.birthDate;
    }
  }
  if (!placeTextFrom(merged.deathPlace) && ed.deathLocation) {
    merged.deathPlace = ed.deathLocation;
    if (!merged.deathDate && ed.deathDate) {
      merged.deathDate = ed.deathDate;
    }
  }
  if ((!merged.spouses || !merged.spouses.length) && ed.marriageLocation) {
    merged.spouses = [
      {
        marriagePlace: ed.marriageLocation,
        marriageDate: ed.marriageDate || "",
        name: "Marriage",
      },
    ];
  }
  return profileEvents(merged);
}

function hasProfileEvents(events) {
  if (!events) {
    return false;
  }
  return Boolean(events.birth || events.death || (events.marriages && events.marriages.length));
}

function canFillWikiTreeEdit(data) {
  const extracted = data && data.extractedData;
  const generalized = data && data.generalizedData;
  if (!extracted || !generalized) {
    return false;
  }
  if (generalized.sourceOfData !== "wikitree") {
    return false;
  }
  return extracted.pageType === "edit" || extracted.pageType === "editFamily";
}

export {
  SEARCH_MENU_LABEL,
  greaterLondonLocations,
  normaliseName,
  filterRows,
  rowLabel,
  findRowByName,
  matchPlaceString,
  parseLocationDate,
  buildOutputs,
  profileEvents,
  profileEventsFromPage,
  hasProfileEvents,
  canFillWikiTreeEdit,
};
