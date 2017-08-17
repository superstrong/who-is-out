/**
 * Initializes the script using data from the Google sheet.
 *
 * @returns {object}  The sheet data: setup, defaults, and specific group info
 */

function init() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetData = ss.getSheetByName("Groups")
  var lastRow = sheetData.getLastRow();
  var rangeBoundaries = "A2:K" + lastRow;
  var range = sheetData.getRange(rangeBoundaries);
  var allGroups = range.getValues();
  var groups = {};
  var data = [];
  
  function stringToArray(s) {
    if (s) {
      var array = [];
      array = s.split(',');
    } else {
      array = "";
    }
    return array;
  }
  
  for (var j = 0; j < allGroups.length; j++) {
    var set = {
      group: allGroups[j][0],
      pCal: "",
      sCal: allGroups[j][2],
      recipients: allGroups[j][3],
      share: stringToArray(allGroups[j][4]),
      label: allGroups[j][5],
      eDays: stringToArray(allGroups[j][6]),
      window: allGroups[j][7],
      webhook: allGroups[j][8],
      wDays: stringToArray(allGroups[j][9]),
      skip: allGroups[j][10]
    };
    data.push(set);
  }
  
  groups["data"] = data;

  sheetData = ss.getSheetByName("Setup");
  var setupValues = sheetData.getRange("A2:F2").getValues();
  groups.maintainer = setupValues[0][0];
  groups.eDaysDefault = stringToArray(setupValues[0][1]);
  groups.windowDefault = setupValues[0][2];
  groups.wDaysDefault = stringToArray(setupValues[0][3]);
  
  var d = new Date();
  groups.updateTime = setupValues[0][4];
  groups.updateTime.setFullYear(d.getFullYear());
  groups.updateTime.setMonth(d.getMonth());
  groups.updateTime.setDate(d.getDate());
  
  groups.timezone = setupValues[0][5];
  
  groups.domain = Session.getActiveUser().getEmail().split("@")[1];
  groups.count = Object.keys(groups.data).length;
  return groups;
}

/**
 * Creates the static object used for all groups' calendar updates and notifications.
 *
 * @param {object} g   (groups) The groups object creates at initialization
 * @param {integer} c  (calendar update) The number of days to loop over
 * @param {integer} b  (backward) Start the calendar update from this many days in the past
 *
 * @returns {object}  Properties that apply to all groups
 */

function setStatic(g, c, b) {
  var startDate = new Date().toLocaleString("en-US", {timeZone: g.timezone})
  startDate = new Date(startDate);
  startDate.setHours(0);
  startDate.setMinutes(0);
  startDate.setSeconds(0);
  startDate.setMilliseconds(0);
  startDate.setDate(startDate.getDate() - b);
  
  var a = {};
  a.startDate = startDate;
  a.endDate = addDays(startDate, (c - .0001));
  a.calUpdate = c;
  a.offset = "GMT-" + startDate.getTimezoneOffset() / 60;
  a.timezone = g.timezone;
  a.todayShort = Utilities.formatDate(startDate, a.offset, "M/d/yyyy");
  a.domainName = g.domain;
  a.maintainer = g.maintainer;
  return a;
}

/**
 * Creates the active object used for a specific group's calendar update and notifications.
 *
 * @param {object} g   (groups) The groups object creates at initialization
 * @param {integer} i  (increment) The iterator from the parent function's loop, refers to a specific group
 *
 * @returns {object}  Properties that apply to the specific group
 */

function setActive(g, i) {

  function createIfNeeded(c) {
    var cal = CalendarApp.getCalendarsByName(c)[0];
    cal = (cal === undefined) ? CalendarApp.createCalendar(c, {timeZone: g.timezone}) : cal;
    return c;
  }
  
  function labeler(label) {
    label != "" ? label = label + " - " : label = "";
    return label;
  }
  
  var a = {};
  a.group = g.data[i].group;
  a.pCal = "";
  a.sCal = createIfNeeded(g.data[i].sCal);
  a.recipients = g.data[i].recipients;
  a.share = g.data[i].share;
  a.prefix = (g.data[i].label === "") ? "" : labeler(g.data[i].label);
  a.eDays = (g.data[i].eDays === "") ? g.eDaysDefault : g.data[i].eDays;
  a.window = (g.data[i].window === "") ? g.windowDefault : g.data[i].window;
  a.webhook = g.data[i].webhook;
  a.wDays = (g.data[i].wDays === "") ? g.wDaysDefault : g.data[i].wDays;
  a.skip = g.data[i].skip;
  return a;
}

function containedGroups(group) {
  var parent = group;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetData = ss.getSheetByName("Flattened Groups")
  var lastRow = sheetData.getLastRow();
  var fullRange = "A2:B" + lastRow;
  var groupPairs = sheetData.getRange(fullRange).getValues();
  var matchedGroups = [];
  for (var i = 0; i < groupPairs.length; i++) {
    if (groupPairs[i][0] === parent) {
      matchedGroups.push(groupPairs[i][1]);
    }
  }
  return matchedGroups;
}

/**
 * Adds or subtracts days from a starting date. 
 *
 * @param {object} date   The starting date
 * @param {integer} days  The number of days to count forward. 1 = 24 hours.
 *
 * @returns {object}  The new date
 */

function addDays(date, days) {
  var dat = new Date(date);
  dat.setTime(dat.getTime() + (days * 86400000));
  return dat;
}

/**
 * Checks whether any values in one array are found in another array.
 *
 * @param {array} target   The source array of values to look for
 * @param {array} toMatch  The target array to search through
 *
 * @returns {boolean}  True if any value from the source is found in the target
 */

function compareArrays(target, toMatch) {
  var found, targetMap, i, j, cur;

  found = false;
  targetMap = {};

  // Put all values in the `target` array into a map, where
  //  the keys are the values from the array
  for (i = 0, j = target.length; i < j; i++) {
    cur = target[i];
    targetMap[cur] = true;
  }

  // Loop over all items in the `toMatch` array and see if any of
  //  their values are in the map from before
  for (i = 0, j = toMatch.length; !found && (i < j); i++) {
    cur = toMatch[i];
    found = !!targetMap[cur];
    // If found, `targetMap[cur]` will return true, otherwise it
    //  will return `undefined`...that's what the `!!` is for
  }
  return found;
}