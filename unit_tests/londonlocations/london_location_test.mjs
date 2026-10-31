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
  SEARCH_MENU_LABEL,
  greaterLondonLocations,
  filterRows,
  findRowByName,
  matchPlaceString,
  buildOutputs,
  profileEvents,
  profileEventsFromPage,
  canFillWikiTreeEdit,
} from "../../extension/site/londonlocations/core/london_location.mjs";
import {
  MEMORY_LIMIT,
  blankForm,
  emptyMemory,
  rememberPerson,
  resolveForm,
  wikiIdFromPage,
} from "../../extension/site/londonlocations/core/londonlocations_state.mjs";

function check(testManager, name, condition, cause) {
  testManager.results.totalTestsRun++;
  if (!condition) {
    testManager.results.numFailedTests++;
    testManager.results.allTests.push({
      testSuite: "londonlocations",
      test: name,
      succeeded: false,
      cause: cause || name,
    });
  }
}

function row(name) {
  return findRowByName(name);
}

function outputs(name, date, registration) {
  return buildOutputs(row(name), date, Boolean(registration));
}

function locationsOf(result) {
  const locations = [];
  for (const option of result.options || []) {
    for (const variant of option.variants) {
      locations.push(variant.location);
    }
  }
  return locations;
}

function narrativesOf(result) {
  const narratives = [];
  for (const option of result.options || []) {
    for (const variant of option.variants) {
      narratives.push(variant.narrative);
    }
  }
  return narratives;
}

function categoriesOf(result) {
  const categories = [];
  for (const option of result.options || []) {
    for (const variant of option.variants) {
      categories.push(variant.category);
    }
  }
  return categories;
}

function single(result) {
  return result.options[0].variants[0];
}

async function runTests(testManager) {
  const places = greaterLondonLocations.places;
  check(testManager, "table size", places.length === 192, "expected 192 places, got " + places.length);
  check(testManager, "menu label", SEARCH_MENU_LABEL === "Search London Locations", SEARCH_MENU_LABEL);

  const battersea = row("Battersea");
  check(
    testManager,
    "battersea counties",
    battersea &&
      battersea.counties.to1889 === "Surrey" &&
      battersea.counties.london === "London" &&
      battersea.counties.greaterLondon === "Greater London",
    JSON.stringify(battersea && battersea.counties)
  );
  const isleworth = row("Isleworth");
  check(
    testManager,
    "isleworth middle period",
    isleworth && isleworth.counties.london === "Middlesex",
    JSON.stringify(isleworth && isleworth.counties)
  );

  const early = outputs("Battersea", "20 Mar 1889");
  check(testManager, "20 Mar 1889", single(early).location === "Battersea, Surrey, England", single(early).location);
  check(testManager, "20 Mar narrative", single(early).narrative === "Battersea, Surrey", single(early).narrative);
  check(
    testManager,
    "20 Mar category",
    single(early).category === "Battersea, Surrey (London)",
    single(early).category
  );

  const londonStart = outputs("Battersea", "21 Mar 1889");
  check(
    testManager,
    "21 Mar 1889",
    single(londonStart).location === "Battersea, London, England",
    single(londonStart).location
  );
  check(
    testManager,
    "21 Mar narrative",
    single(londonStart).narrative === "Battersea, London",
    single(londonStart).narrative
  );

  const londonEnd = outputs("Battersea", "31 Mar 1965");
  check(
    testManager,
    "31 Mar 1965",
    single(londonEnd).location === "Battersea, London, England",
    single(londonEnd).location
  );

  const greater = outputs("Battersea", "1 Apr 1965");
  check(
    testManager,
    "1 Apr 1965",
    single(greater).location === "Battersea, Greater London, England",
    single(greater).location
  );
  check(
    testManager,
    "1 Apr narrative",
    single(greater).narrative === "Battersea, Greater London",
    single(greater).narrative
  );
  check(testManager, "category stable", single(early).category === single(greater).category, single(greater).category);

  const jan1889 = outputs("Battersea", "1 Jan 1889");
  check(
    testManager,
    "1 Jan 1889 still Surrey",
    single(jan1889).location === "Battersea, Surrey, England",
    single(jan1889).location
  );

  const reg1965 = outputs("Battersea", "30 Apr 1965", true);
  check(
    testManager,
    "30 Apr 1965 registration",
    single(reg1965).location === "Battersea, Greater London, England" &&
      single(reg1965).narrative === "Battersea Registration District, Greater London",
    single(reg1965).location
  );

  function periodCount(name, date) {
    const result = outputs(name, date);
    return result.options.length;
  }
  check(testManager, "year 1888", periodCount("Battersea", "1888") === 1, String(periodCount("Battersea", "1888")));
  check(testManager, "year 1889", periodCount("Battersea", "1889") === 2, String(periodCount("Battersea", "1889")));
  check(testManager, "year 1964", periodCount("Battersea", "1964") === 1, String(periodCount("Battersea", "1964")));
  check(testManager, "year 1965", periodCount("Battersea", "1965") === 2, String(periodCount("Battersea", "1965")));
  check(testManager, "year 1966", periodCount("Battersea", "1966") === 1, String(periodCount("Battersea", "1966")));
  check(
    testManager,
    "abt 1887",
    periodCount("Battersea", "abt 1887") === 1,
    String(periodCount("Battersea", "abt 1887"))
  );
  check(
    testManager,
    "abt 1888",
    periodCount("Battersea", "abt 1888") === 2,
    String(periodCount("Battersea", "abt 1888"))
  );
  check(
    testManager,
    "abt 1890",
    periodCount("Battersea", "abt 1890") === 2,
    String(periodCount("Battersea", "abt 1890"))
  );
  check(
    testManager,
    "abt 1967",
    periodCount("Battersea", "abt 1967") === 1,
    String(periodCount("Battersea", "abt 1967"))
  );
  check(
    testManager,
    "bef 1800",
    periodCount("Battersea", "bef 1800") === 1,
    String(periodCount("Battersea", "bef 1800"))
  );
  check(
    testManager,
    "aft 1800",
    periodCount("Battersea", "aft 1800") === 3,
    String(periodCount("Battersea", "aft 1800"))
  );

  const year1889 = outputs("Battersea", "1889");
  check(
    testManager,
    "1889 reason",
    year1889.options[0].reason.includes("21 March 1889") && year1889.options[1].reason.includes("21 March 1889"),
    year1889.options.map((option) => option.reason).join(" | ")
  );

  const hampstead = outputs("Hampstead", "1 Jun 1920");
  check(
    testManager,
    "hampstead 1920 location",
    single(hampstead).location === "Hampstead, London, England",
    single(hampstead).location
  );
  check(
    testManager,
    "hampstead 1920 category",
    single(hampstead).category === "Hampstead, Middlesex (London)",
    single(hampstead).category
  );
  check(
    testManager,
    "hampstead 1920 narrative",
    single(hampstead).narrative === "Hampstead, London" && !/borough/i.test(single(hampstead).narrative),
    single(hampstead).narrative
  );

  const isleworth1950 = outputs("Isleworth", "1 Jan 1950");
  check(
    testManager,
    "isleworth 1950",
    single(isleworth1950).location === "Isleworth, Middlesex, England",
    single(isleworth1950).location
  );

  const camdenTown = outputs("Camden Town", "1 Jun 1970");
  check(
    testManager,
    "camden town 1970",
    single(camdenTown).location === "Camden Town, Greater London, England" &&
      single(camdenTown).category === "Camden Town, Middlesex (London)" &&
      single(camdenTown).narrative === "Camden Town, Greater London",
    JSON.stringify(single(camdenTown))
  );

  const borough = outputs("Camden", "1 Apr 1965");
  check(
    testManager,
    "camden borough location",
    single(borough).location === "Camden, Greater London, England" && single(borough).category === null,
    JSON.stringify(single(borough))
  );
  check(
    testManager,
    "camden borough narrative",
    single(borough).narrative === "Camden, Greater London" && /container/i.test(single(borough).categoryNote),
    single(borough).narrative + " / " + single(borough).categoryNote
  );
  const boroughEarly = outputs("Camden", "1 Jan 1920");
  check(
    testManager,
    "camden borough 1920",
    boroughEarly.ok && boroughEarly.options.length === 0 && /not listed/i.test(boroughEarly.message),
    boroughEarly.message
  );

  const bishopsgate = outputs("Bishopsgate", "1 Jan 1700");
  check(
    testManager,
    "bishopsgate",
    single(bishopsgate).location === "Bishopsgate, City of London, England" &&
      single(bishopsgate).category === "Bishopsgate Ward, City of London" &&
      single(bishopsgate).narrative === "Bishopsgate in the City of London",
    JSON.stringify(single(bishopsgate))
  );

  const city = outputs("City of London", "1 Jan 1900");
  check(
    testManager,
    "city of london",
    single(city).location === "City of London, England" &&
      single(city).narrative === "the City of London" &&
      single(city).category === "City of London",
    JSON.stringify(single(city))
  );

  const stPauls = outputs("St Pauls Churchyard", "1 Jan 1800");
  check(
    testManager,
    "st pauls category",
    single(stPauls).location === "St Pauls Churchyard, City of London, England" &&
      single(stPauls).category === null &&
      single(stPauls).narrative === "St Pauls Churchyard in the City of London",
    JSON.stringify(single(stPauls))
  );

  const east = outputs("East London Registration District", "1 Jan 1870");
  check(
    testManager,
    "east london rd",
    single(east).location === "East London, City of London, England" &&
      single(east).category === null &&
      single(east).narrative === "East London Registration District in the City of London",
    JSON.stringify(single(east))
  );
  const eastLater = outputs("East London Registration District", "1 Jan 1900");
  check(testManager, "east london rd 1900", eastLater.options.length === 0, eastLater.message);

  const hackney = outputs("Hackney", "1 Jan 1870", true);
  check(
    testManager,
    "hackney registration",
    single(hackney).location === "Hackney, Middlesex, England" &&
      single(hackney).category === "Hackney, Middlesex (London)" &&
      single(hackney).narrative === "Hackney Registration District, Middlesex",
    JSON.stringify(single(hackney))
  );

  const holborn = outputs("Holborn", "1 Jan 1870");
  check(
    testManager,
    "holborn locations",
    locationsOf(holborn).join(" | ") === "Holborn, Middlesex, England | Holborn, City of London, England",
    locationsOf(holborn).join(" | ")
  );
  check(
    testManager,
    "holborn narratives",
    narrativesOf(holborn).join(" | ") === "Holborn, Middlesex | Holborn in the City of London",
    narrativesOf(holborn).join(" | ")
  );
  check(
    testManager,
    "holborn categories",
    categoriesOf(holborn).join(" | ") === "Holborn, Middlesex (London) | ",
    categoriesOf(holborn).join(" | ")
  );

  check(testManager, "shepherds bush", matchPlaceString("Shepherd's Bush").row.name === "Shepherds Bush", "no match");
  check(testManager, "st giles", matchPlaceString("St. Giles").row.name === "St Giles", "no match");
  check(testManager, "saint pancras", matchPlaceString("Saint Pancras").row.name === "St Pancras", "no match");
  check(
    testManager,
    "kingston hyphen",
    matchPlaceString("Kingston-upon-Thames").row.name === "Kingston upon Thames",
    "no match"
  );
  check(
    testManager,
    "pasted location",
    matchPlaceString("Battersea, Surrey, England").row.name === "Battersea",
    "no match"
  );
  check(testManager, "bare london", matchPlaceString("London") === null, "matched London");
  check(testManager, "ham exact", matchPlaceString("Ham").row.name === "Ham", matchPlaceString("Ham").row.name);
  const camdenNames = filterRows("camden").map((item) => item.name);
  check(
    testManager,
    "camden list",
    camdenNames.includes("Camden") && camdenNames.includes("Camden Town"),
    camdenNames.join(", ")
  );

  const mapped = profileEvents({
    birthPlace: { placeString: "Leeds, Yorkshire, England" },
    birthDate: { dateString: "1 Jan 1840" },
    deathPlace: { placeString: "Battersea, Surrey, England" },
    deathDate: { dateString: "1 Jan 1880" },
    spouses: [
      {
        name: { forenames: "Ann", lastName: "Smith" },
        marriagePlace: { placeString: "Hackney, Middlesex, England" },
        marriageDate: { dateString: "2 Jun 1860" },
      },
      {
        name: "Mary Jones",
        marriagePlace: { placeString: "Battersea, Surrey, England" },
        marriageDate: { dateString: "8 Apr 1815" },
      },
    ],
  });
  check(
    testManager,
    "prefill birth stays with birth",
    mapped.birth && mapped.birth.placeText === "Leeds, Yorkshire, England" && mapped.birth.dateText === "1 Jan 1840",
    JSON.stringify(mapped.birth)
  );
  check(
    testManager,
    "prefill death stays with death",
    mapped.death && mapped.death.placeText === "Battersea" && mapped.death.dateText === "1 Jan 1880",
    JSON.stringify(mapped.death)
  );
  check(
    testManager,
    "prefill marriages",
    mapped.marriages.length === 2 &&
      mapped.marriages[0].label === "Ann Smith" &&
      mapped.marriages[0].placeText === "Hackney" &&
      mapped.marriages[0].dateText === "2 Jun 1860" &&
      mapped.marriages[1].label === "Mary Jones" &&
      mapped.marriages[1].placeText === "Battersea" &&
      mapped.marriages[1].dateText === "8 Apr 1815",
    JSON.stringify(mapped.marriages)
  );

  const regPrefill = profileEvents({
    eventPlace: { placeString: "Hackney, Middlesex, England" },
    eventDate: { dateString: "1870" },
    recordType: "BirthRegistration",
    registrationDistrict: "Hackney",
  });
  check(
    testManager,
    "prefill registration",
    regPrefill.birth &&
      regPrefill.birth.placeText === "Hackney" &&
      regPrefill.birth.dateText === "1870" &&
      regPrefill.birth.registration === true &&
      !regPrefill.death,
    JSON.stringify(regPrefill)
  );

  const stPancras = outputs("St Pancras", "8 Apr 1815");
  check(
    testManager,
    "st pancras 1815",
    single(stPancras).location === "St Pancras, Middlesex, England" &&
      single(stPancras).narrative === "St Pancras, Middlesex" &&
      !single(stPancras).location.includes("United Kingdom"),
    JSON.stringify(single(stPancras))
  );
  check(
    testManager,
    "category wiki",
    single(stPancras).categoryWiki === "[[Category: St Pancras, Middlesex (London)]]",
    single(stPancras).categoryWiki
  );

  const withUk = buildOutputs(row("St Pancras"), "8 Apr 1815", false, { includeUnitedKingdom: true });
  check(
    testManager,
    "uk on location",
    single(withUk).location === "St Pancras, Middlesex, England, United Kingdom",
    single(withUk).location
  );
  check(
    testManager,
    "uk on biography",
    single(withUk).narrative === "St Pancras, Middlesex, England, United Kingdom",
    single(withUk).narrative
  );
  const deptford = buildOutputs(row("Deptford"), "1 Jan 1900", false, { includeUnitedKingdom: true });
  check(
    testManager,
    "deptford narrative with uk",
    single(deptford).narrative === "Deptford, London, England, United Kingdom" &&
      single(outputs("Deptford", "1 Jan 1900")).narrative === "Deptford, London",
    single(deptford).narrative
  );
  const bishopsgateUk = buildOutputs(row("Bishopsgate"), "1 Jan 1815", false, { includeUnitedKingdom: true });
  check(
    testManager,
    "city narrative with uk",
    single(bishopsgateUk).narrative === "Bishopsgate in the City of London, England, United Kingdom" &&
      single(outputs("Bishopsgate", "1 Jan 1815")).narrative === "Bishopsgate in the City of London",
    single(bishopsgateUk).narrative
  );
  check(testManager, "uk on has no warning", !withUk.options[0].ukNote, withUk.options[0].ukNote);

  const beforeUk = buildOutputs(row("St Pancras"), "8 Apr 1790", false, { includeUnitedKingdom: true });
  check(
    testManager,
    "uk before 1801 omitted",
    single(beforeUk).location === "St Pancras, Middlesex, England" &&
      !single(beforeUk).narrative.includes("United Kingdom") &&
      beforeUk.options[0].ukNote.includes("1801"),
    single(beforeUk).location + " / " + beforeUk.options[0].ukNote
  );
  check(
    testManager,
    "uk off",
    single(outputs("St Pancras", "8 Apr 1815")).location === "St Pancras, Middlesex, England",
    single(outputs("St Pancras", "8 Apr 1815")).location
  );

  const hampsteadReg = buildOutputs(row("Hampstead"), "3 Dec 1904", true, { includeUnitedKingdom: true });
  check(
    testManager,
    "hampstead registration location omits district",
    single(hampsteadReg).location === "Hampstead, London, England, United Kingdom" &&
      !single(hampsteadReg).location.includes("Registration District") &&
      single(hampsteadReg).narrative === "Hampstead Registration District, London, England, United Kingdom",
    single(hampsteadReg).location + " / " + single(hampsteadReg).narrative
  );

  const parramatta = profileEventsFromPage({
    extractedData: {
      wikiId: "Oakes-12",
      birthLocation: "Parramatta, Colony of New South Wales",
      birthDate: "9 Apr 1815",
    },
    generalizedData: { personRepoRef: "Oakes-12" },
  });
  check(
    testManager,
    "non-london birth is kept",
    parramatta.birth &&
      parramatta.birth.placeText === "Parramatta, Colony of New South Wales" &&
      parramatta.birth.dateText === "9 Apr 1815" &&
      parramatta.birth.matched === false,
    JSON.stringify(parramatta.birth)
  );
  check(
    testManager,
    "oakes wiki id",
    wikiIdFromPage({
      extractedData: { url: "https://www.wikitree.com/wiki/Oakes-12" },
      generalizedData: {},
    }) === "Oakes-12",
    "wiki id"
  );

  let memory = emptyMemory();
  memory = rememberPerson(
    memory,
    "A-1",
    Object.assign(blankForm("A-1"), { ticks: { birth: true, marriage: false, death: false } })
  );
  const firstVisit = resolveForm(memory, 10, "Oakes-12");
  check(
    testManager,
    "new profile starts blank",
    firstVisit.form.wikiId === "Oakes-12" && !firstVisit.form.ticks.birth,
    JSON.stringify(firstVisit.form.ticks)
  );
  const withBirth = Object.assign(blankForm("Oakes-12"), {
    edits: {
      birth: {
        place: "Parramatta, Colony of New South Wales",
        date: "9 Apr 1815",
        registration: false,
        fillField: "birthLocation",
      },
    },
  });
  memory = firstVisit.memory;
  memory = resolveForm(memory, 10, "Oakes-12").memory;
  memory.tabs["10"] = withBirth;
  memory = rememberPerson(memory, "Oakes-12", withBirth);
  const otherTab = resolveForm(memory, 11, "Smith-1");
  check(
    testManager,
    "tabs do not share entries",
    otherTab.form.wikiId === "Smith-1" && !(otherTab.form.edits && otherTab.form.edits.birth),
    JSON.stringify(otherTab.form)
  );
  const back = resolveForm(memory, 10, "A-1");
  check(
    testManager,
    "back restores earlier person",
    back.form.wikiId === "A-1" && back.form.ticks.birth === true && !back.mismatch,
    JSON.stringify(back.form)
  );
  const stranger = resolveForm(memory, 10, "New-9");
  check(
    testManager,
    "unknown person warns",
    stranger.mismatch === true && stranger.form.wikiId === "Oakes-12",
    JSON.stringify(stranger)
  );
  for (let index = 0; index < MEMORY_LIMIT + 1; index++) {
    memory = rememberPerson(memory, "Person-" + index, blankForm("Person-" + index));
  }
  check(
    testManager,
    "memory keeps 40",
    memory.people.length === MEMORY_LIMIT && memory.people[0].wikiId !== "Person-0",
    String(memory.people.length) + " " + memory.people[0].wikiId
  );

  check(
    testManager,
    "fill on edit",
    canFillWikiTreeEdit({
      extractedData: { pageType: "edit" },
      generalizedData: { sourceOfData: "wikitree" },
    }) === true
  );
  check(
    testManager,
    "no fill on ancestry",
    canFillWikiTreeEdit({
      extractedData: { pageType: "record" },
      generalizedData: { sourceOfData: "ancestry" },
    }) === false
  );
  check(
    testManager,
    "no fill on wikitree profile",
    canFillWikiTreeEdit({
      extractedData: { pageType: "read" },
      generalizedData: { sourceOfData: "wikitree" },
    }) === false
  );
}

export { runTests };
