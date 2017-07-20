function init() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetData = ss.getSheetByName("Groups")
  var lastRow = sheetData.getLastRow();
  var rangeBoundaries = "A2:K" + lastRow;
  var range = sheetData.getRange(rangeBoundaries);
  var allGroups = range.getValues();
  var groups = {};
  var data = [];
  
  for (var i = 0; i < allGroups.length; i++) {
    function stringToArray(s) {
      if (s.length > 0) {
      var array = [];
      array = s.split(',');
      } else {
      array = "";
      }
    return array;
  } 

  set = {
    group: allGroups[i][0],
    pCal: allGroups[i][1],
    sCal: allGroups[i][2],
    recipients: allGroups[i][3],
    share: stringToArray(allGroups[i][4]),
    label: allGroups[i][5],
    eDays: stringToArray(allGroups[i][6]),
    window: allGroups[i][7],
    webhook: allGroups[i][8],
    wDays: stringToArray(allGroups[i][9]),
    skip: allGroups[i][10]
  };
  data.push(set);
  }
  groups["data"] = data;
  
  sheetData = ss.getSheetByName("Setup");
  var setupValues = sheetData.getRange("A2:D2").getValues();
  groups.maintainer = setupValues[0][0];
  groups.eDaysDefault = stringToArray(setupValues[0][1]);
  groups.windowDefault = setupValues[0][2];
  groups.wDaysDefault = stringToArray(setupValues[0][3]);
  groups.domain = Session.getActiveUser().getEmail().split("@")[1];
  groups.count = Object.keys(groups.data).length;
  return groups;
}

function setStatic(g, c, b) {
  var startDate = new Date();
  startDate.setHours(0);
  startDate.setMinutes(0);
  startDate.setSeconds(0);
  startDate.setUTCMilliseconds(0);
  startDate.setDate(startDate.getDate() - b);
  
  var a = {};
  a.startDate = startDate;
  a.endDate = addDays(startDate, c);
  a.calUpdate = c;
  a.offset = "GMT-" + startDate.getTimezoneOffset() / 60;
  a.todayShort = Utilities.formatDate(startDate, a.offset, "M/d/yyyy");
  a.domainName = g.domain;
  a.maintainer = g.maintainer;
  return a;
}

// pCal is the OOO user's calendar used to create the digest and notification. It is private.
// sCal is the OOO user's shared calendar, which replicates everyone's events.
function setActive(g, i) {

  function createIfNeeded(c) {
    var cal = CalendarApp.getCalendarsByName(c)[0];
    cal = (cal === undefined) ? CalendarApp.createCalendar(c) : cal;
    return c;
  }
  
  function labeler(label) {
    label != "" ? label = label + " - " : label = "";
    return label;
  }
  
  var a = {};
  a.group = g.data[i].group;
  a.pCal = createIfNeeded(g.data[i].pCal);
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

function getGroupMembers(group, s) {
  var groupKey = group;
  var rows = [];
  var pageToken, page;
  do {
    page = AdminDirectory.Members.list(groupKey,
    {
      domainName: s.domainName,
      maxResults: 500,
      pageToken: pageToken,
    });
    var members = page.members;
    if (members)
    {
      for (var i = 0; i < members.length; i++)
      {
        var member = members[i];
        if (member.type === "GROUP") {
          var row = [member.email];
          rows.push(row);
        }
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return rows;
}

function generateGroupTree(group, s) {
  var containedGroups = {};
  var toVisit = [group];
  while (toVisit.length > 0) {
    group = toVisit.pop();
    containedGroups[group] = true;

    groupMembers = getGroupMembers(group, s);
    for (i = 0; i < groupMembers.length; ++i) { 
      email = groupMembers[i];
      toVisit.splice(toVisit.length, 0, email);
    }
  }

  var groups = [];
  for (var k in containedGroups) {
    if (containedGroups.hasOwnProperty(k)) {
      groups.splice(groups.length, 0, k);
    }
  }
  return groups;
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

function getUserGroups(user, s) {
  var userKey = user;
  var rows = [];
  var pageToken, page;
  do {
    page = AdminDirectory.Groups.list(
    {
      domainName: s.domainName,
      pageToken: pageToken,
      userKey: userKey
    });
    var groups = page.groups;
    if (groups)
    {
      for (var i = 0; i < groups.length; i++)
      {
        var group = groups[i];
        var row = [group.email];
        rows.push(row);
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return rows;
}

function shouldSend(s, d) {
  var send = true;
  var today = [];
  today.push(s.startDate.getDay());
  send = compareArrays(today,d);
  return send;
}

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
};

function compare(parents, user, s) {
  var userGroups = [];
  userGroups = getUserGroups(user, s);
  var match = compareArrays(parents, userGroups);
  return match;
}

function addDays(date, days) {
  var dat = new Date(date);
  dat.setTime(dat.getTime() + (days * 86400000) - 60000);
  return dat;
}