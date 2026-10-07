/*
MIT License

Copyright (c) 2020-2025 Robert M Pavey and the wikitree-sourcer contributors.

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

import { CitationBuilder } from "../../../base/core/citation_builder.mjs";
import { RT } from "../../../base/core/record_type.mjs";
import { NameUtils } from "../../../base/core/name_utils.mjs";
import { StringUtils } from "../../../base/core/string_utils.mjs";

function buildYorkshireburialsUrl(ed, builder) {
  if (ed.recordUrl) {
    return ed.recordUrl;
  }
  return ed.url;
}

function getFullName(ed, gd) {
  const fullName = gd.inferFullName();
  if (fullName) {
    return fullName;
  }
  return ed.name;
}

function getPlaceString(gd) {
  if (gd.eventPlace && gd.eventPlace.placeString) {
    return gd.eventPlace.placeString;
  }
  return "";
}

function getFullResidence(ed, gd) {
  if (gd.residencePlace && gd.residencePlace.placeString) {
    return gd.residencePlace.placeString;
  }
  return ed.residence ? ed.residence.replace(/[\s.,]+$/, "") : "";
}

function getAgeString(gd) {
  return gd.ageAtDeath ? gd.ageAtDeath : "";
}

function formatDate(gd, dateObj, format, highlight) {
  if (!dateObj) {
    return "";
  }
  return gd.getNarrativeDateFormat(dateObj, format, highlight, false);
}

function isCremation(gd) {
  return gd.recordType == RT.Cremation;
}

// e.g. "Felix John BATTERSBY" becomes "Felix John Battersby"
function getMixedCaseName(name) {
  if (!name) {
    return "";
  }
  return name
    .split(" ")
    .map((word) => {
      if (/^[A-Z][A-Z'’-]*[A-Z]$/.test(word)) {
        return NameUtils.convertNameFromAllCapsToMixedCase(word);
      }
      return word;
    })
    .join(" ");
}

function getSex(ed, gd) {
  let sex = ed.sex ? ed.sex.toLowerCase() : "";
  if (sex != "male" && sex != "female") {
    // Older registers have no sex column so predict it from the forenames
    let forenames = gd.inferForenames();
    if (forenames && StringUtils.isAllUppercase(forenames)) {
      forenames = NameUtils.convertNameFromAllCapsToMixedCase(forenames);
    }
    sex = NameUtils.predictGenderFromGivenNames(forenames);
    if (!sex && forenames) {
      // Registers often abbreviate names, e.g. "Wm" or "Thos."
      let expanded = forenames.split(" ").map((name) => {
        let base = name.replace(/\.$/, "");
        return NameUtils.convertEnglishGivenNameFromAbbrevationToFull(base) || base;
      });
      sex = NameUtils.predictGenderFromGivenNames(expanded.join(" "));
    }
  }
  return sex == "male" || sex == "female" ? sex : "";
}

function getPossessivePronoun(ed, gd) {
  const sex = getSex(ed, gd);
  if (sex == "male") {
    return "His";
  }
  if (sex == "female") {
    return "Her";
  }
  return "Their";
}

// The trade column often describes children and wives rather than giving an occupation,
// e.g. "Boy", "Infant" or "Daughter of John Smith"
function isOccupation(trade) {
  if (!trade) {
    return false;
  }
  return !/^(?:boy|girl|infant|child|son|daughter|wife|widow|widower|spinster|bachelor|none|male|female)\b/i.test(
    trade
  );
}

// e.g. "He was a widower." or "She was unmarried."
function getMaritalStatusSentence(ed, gd) {
  const sex = getSex(ed, gd);
  const status = ed.maritalStatus ? ed.maritalStatus.toLowerCase() : "";
  if (!sex || !status) {
    return "";
  }
  const pronoun = sex == "male" ? "He" : "She";
  if (/^(?:widower|widow|bachelor|spinster)$/.test(status)) {
    return pronoun + " was a " + status + ".";
  }
  if (/^(?:married|unmarried|single|widowed|divorced)$/.test(status)) {
    return pronoun + " was " + status + ".";
  }
  return "";
}

// e.g. "His ashes were removed to be interred at Penshaw church, Co. Durh."
function getAshesSentence(ed, gd) {
  const disposal = ed.ashesDisposal ? ed.ashesDisposal.replace(/[\s.]+$/, "") : "";
  if (!disposal) {
    return "";
  }
  if (/^[a-z]+ed\b/.test(disposal)) {
    return getPossessivePronoun(ed, gd) + " ashes were " + disposal + ".";
  }
  return "The disposal of the ashes was recorded as: " + disposal + ".";
}

// e.g. "Felix John Battersby (executor) of Watendlath, Tinshill Lane, Horsforth"
function getApplicantString(ed) {
  if (!ed.applicantName) {
    return "";
  }
  let applicant = getMixedCaseName(ed.applicantName);
  const details = [ed.applicantRelation, ed.applicantOccupation].filter(Boolean);
  if (details.length) {
    applicant += " (" + details.join(", ") + ")";
  }
  if (ed.applicantAddress) {
    applicant += " of " + ed.applicantAddress.replace(/[\s.,]+$/, "");
  }
  return applicant;
}

////////////////////////////////////////////////////////////////////////////////
// Citation parts
////////////////////////////////////////////////////////////////////////////////

function buildSourceTitle(ed, gd, builder) {
  builder.sourceTitle = "Yorkshire Burials";
}

function buildSourceReference(ed, gd, builder) {
  const options = builder.getOptions();

  let locationParts = [];
  for (let part of [ed.cemetery, ed.parish, ed.county]) {
    if (part) {
      locationParts.push(part);
    }
  }
  builder.addSourceReferenceText(locationParts.join(", "));

  if (options.citation_yorkshireburials_includeGraveReference) {
    builder.addSourceReferenceField("Grave", ed.graveReference);
  }
  if (options.citation_yorkshireburials_includeRegisterReference) {
    builder.addSourceReferenceField("Register", ed.registerReference);
  }
}

function buildRecordLink(ed, gd, builder) {
  const yorkshireburialsUrl = buildYorkshireburialsUrl(ed, builder);

  let linkText = "Yorkshire Burials Record";
  if (!ed.recordUrl) {
    linkText = "Yorkshire Burials Search";
  }
  builder.recordLinkOrTemplate = "[" + yorkshireburialsUrl + " " + linkText + "]";
}

// e.g. "Alan Smith burial (died age 41) on 20 Apr 1875 in Beckett Street Cemetery, Leeds, Yorkshire, England."
function buildDataSentence(ed, gd, builder) {
  const options = builder.getOptions();
  const dateFormat = options.citation_general_dataStringDateFormat;

  let dataString = getFullName(ed, gd) + (isCremation(gd) ? " cremation" : " burial");

  const age = getAgeString(gd);
  const burialDate = formatDate(gd, gd.eventDate, dateFormat, false);
  const deathDate = formatDate(gd, gd.deathDate, dateFormat, false);

  if (burialDate) {
    if (deathDate) {
      dataString += " (died on " + deathDate;
      if (age) {
        dataString += " at age " + age;
      }
      dataString += ")";
    } else if (age) {
      dataString += " (died age " + age + ")";
    }
    dataString += " on " + burialDate;
  } else if (deathDate) {
    dataString += " (died on " + deathDate;
    if (age) {
      dataString += " at age " + age;
    }
    dataString += ")";
  } else if (age) {
    dataString += " (died age " + age + ")";
  }

  const place = getPlaceString(gd);
  if (place) {
    dataString += (isCremation(gd) ? " at " : " in ") + place;
  }
  dataString += ".";

  if (options.citation_yorkshireburials_includeAdditionalDetails) {
    const details = getAdditionalDetails(ed, gd);
    if (details.length) {
      const useBreaks = options.citation_general_target == "wikitree" && options.citation_general_addBreaksWithinBody;
      let separator = useBreaks ? "<br/>" : "; ";
      if (useBreaks && builder.type != "source" && options.citation_general_addNewlinesWithinBody) {
        separator += "\n";
      }
      dataString += (useBreaks ? separator : " ") + details.join(separator);
    }
  }

  builder.dataString = dataString;
}

function getParentsString(ed) {
  if (!ed.parentsNames) {
    return "";
  }
  let parents = getMixedCaseName(ed.parentsNames);
  if (ed.parentsOccupation) {
    parents += " (" + ed.parentsOccupation + ")";
  }
  return parents;
}

// e.g. ["Parents' names: James & Jane Ellen Holmes (Iron Founder)", "Where born: Leeds"]
function getAdditionalDetails(ed, gd) {
  const fields = [
    { label: "Parents' names", value: getParentsString(ed) },
    { label: "Where born", value: ed.whereBorn },
    { label: "Residence", value: getFullResidence(ed, gd) },
    { label: "Disease", value: ed.disease },
    { label: "Rank/Profession", value: ed.trade },
    { label: "Marital status", value: ed.maritalStatus },
    { label: "Death registered in", value: ed.deathRegistrationDistrict },
    { label: "Ashes", value: ed.ashesDisposal },
    { label: "Applicant", value: getApplicantString(ed) },
    { label: "Informant", value: getMixedCaseName(ed.informant) },
    { label: "Minister", value: ed.minister },
  ];
  return fields.filter((field) => field.value).map((field) => field.label + ": " + field.value);
}

function buildDataList(ed, gd, builder) {
  const fields = [
    { key: "Name", value: ed.name },
    { key: "Sex", value: ed.sex },
    { key: "Age", value: ed.age },
    { key: "Date of Death", value: ed.deathDate },
    { key: "Date of Burial", value: ed.burialDate },
    { key: "Date of Cremation", value: ed.cremationDate },
    { key: "District where Death Registered", value: ed.deathRegistrationDistrict },
    { key: "Disease", value: ed.disease },
    { key: "Occupation", value: ed.trade },
    { key: "Marital Status", value: ed.maritalStatus },
    { key: "Residence", value: getFullResidence(ed, gd) },
    { key: "Where Born", value: ed.whereBorn },
    { key: "Parents", value: ed.parentsNames },
    { key: "Addition of Father or Mother", value: ed.parentsOccupation },
    { key: "Informant", value: ed.informant },
    { key: "Officiating Minister", value: ed.minister },
    { key: "Applicant for Cremation", value: getApplicantString(ed) },
    { key: "How Ashes were Disposed of", value: ed.ashesDisposal },
    { key: "Receipt No.", value: ed.receiptNumber },
  ];
  builder.addListDataString(fields.filter((field) => field.value));
}

function buildDataString(ed, gd, builder) {
  const dataStyle = builder.getOptions().citation_yorkshireburials_dataStyle;

  if (dataStyle == "string") {
    buildDataSentence(ed, gd, builder);
  } else if (dataStyle == "list") {
    buildDataList(ed, gd, builder);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Narrative
////////////////////////////////////////////////////////////////////////////////

// e.g. "Alan Smith (age 41) died on 16 April 1875 and was buried on 20 April 1875 in
// Beckett Street Cemetery, Leeds, Yorkshire, England. His last residence was Cavalier Street."
function buildNarrativeText(ed, gd, options) {
  const dateFormat = options.narrative_general_dateFormat;
  const highlight = options.narrative_general_dateHighlight;

  const burialDate = formatDate(gd, gd.eventDate, dateFormat, highlight);
  const deathDate = formatDate(gd, gd.deathDate, dateFormat, highlight);
  if (!burialDate && !deathDate) {
    return "";
  }

  let narrative = getFullName(ed, gd);

  const age = getAgeString(gd);
  if (age) {
    narrative += " (age " + age + ")";
  }

  const cremation = isCremation(gd);
  const eventVerb = cremation ? "was cremated" : "was buried";
  const place = getPlaceString(gd);
  const placePreposition = cremation ? " at " : " in ";

  let deathClause = "";
  if (deathDate) {
    deathClause = " died on " + deathDate;
    if (ed.deathRegistrationDistrict) {
      deathClause += " in the " + ed.deathRegistrationDistrict + " registration district";
    }
  }

  if (deathDate && burialDate) {
    narrative += deathClause + " and " + eventVerb + " on " + burialDate;
  } else if (burialDate) {
    narrative += " " + eventVerb + " on " + burialDate;
  } else if (cremation) {
    narrative += deathClause + " and " + eventVerb;
  } else {
    narrative += deathClause;
  }

  if (place) {
    narrative += placePreposition + place;
  }
  narrative += ".";

  let sentences = [];
  const residence = getFullResidence(ed, gd);
  if (residence) {
    sentences.push(getPossessivePronoun(ed, gd) + " last residence was " + residence + ".");
  }
  if (isOccupation(ed.trade)) {
    sentences.push(getPossessivePronoun(ed, gd) + " occupation was " + ed.trade.replace(/[\s.]+$/, "") + ".");
  }
  sentences.push(getMaritalStatusSentence(ed, gd));
  sentences.push(getAshesSentence(ed, gd));
  const applicant = getApplicantString(ed);
  if (applicant) {
    sentences.push("The cremation was applied for by " + applicant + ".");
  }

  for (let sentence of sentences) {
    if (sentence) {
      narrative += " " + sentence;
    }
  }

  return narrative;
}

function addNarrative(ed, gd, builder, dataCache) {
  const options = builder.getOptions();

  // A narrative the user has edited in the popup takes priority
  if (!(gd.userOverrideForNarrative && gd.userOverrideForNarrative.trim())) {
    const narrative = buildNarrativeText(ed, gd, options);
    if (narrative) {
      builder.narrative = narrative;
      return;
    }
  }

  builder.addNarrative(gd, dataCache, options);
}

////////////////////////////////////////////////////////////////////////////////
// Main entry point
////////////////////////////////////////////////////////////////////////////////

function buildCoreCitation(ed, gd, builder) {
  buildSourceTitle(ed, gd, builder);
  buildSourceReference(ed, gd, builder);
  buildRecordLink(ed, gd, builder);
  buildDataString(ed, gd, builder);
}

function buildCitation(input) {
  const ed = input.extractedData;
  const gd = input.generalizedData;
  const type = input.type; // "inline", "narrative" or "source"

  let builder = new CitationBuilder(type, input.runDate, input.options);
  if (input.householdTableString) {
    builder.householdTableString = input.householdTableString;
  }

  buildCoreCitation(ed, gd, builder);
  builder.meaningfulTitle = gd.getRefTitle();

  if (type == "narrative") {
    addNarrative(ed, gd, builder, input.dataCache);
  }

  return builder.getCitationObject(gd, ed.url);
}

export { buildCitation };
