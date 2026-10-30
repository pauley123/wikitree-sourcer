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
  prefillFromGeneralizedData,
  canFillWikiTreeEdit,
} from "../../extension/site/londonlocations/core/london_location.mjs";

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
    single(reg1965).location === "Battersea Registration District, Greater London, England",
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
    single(east).location === "East London Registration District, City of London, England" &&
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
    single(hackney).location === "Hackney Registration District, Middlesex, England" &&
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

  const prefill = prefillFromGeneralizedData({
    birthPlace: { placeString: "Leeds, Yorkshire, England" },
    birthDate: { dateString: "1 Jan 1840" },
    deathPlace: { placeString: "Battersea, Surrey, England" },
    deathDate: { dateString: "1 Jan 1880" },
    recordType: "Death",
  });
  check(
    testManager,
    "prefill prefers a table place",
    prefill &&
      prefill.placeText === "Battersea" &&
      prefill.dateText === "1 Jan 1880" &&
      prefill.fillField === "deathLocation",
    JSON.stringify(prefill)
  );

  const regPrefill = prefillFromGeneralizedData({
    eventPlace: { placeString: "Hackney, Middlesex, England" },
    eventDate: { dateString: "1870" },
    recordType: "BirthRegistration",
    registrationDistrict: "Hackney",
  });
  check(
    testManager,
    "prefill registration",
    regPrefill && regPrefill.placeText === "Hackney" && regPrefill.registration === true,
    JSON.stringify(regPrefill)
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
