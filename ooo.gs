function sendEmail(s, a) {
  
  var myCalId = Session.getActiveUser().getEmail();
  var timezoneNote = "All dates and times are " + s.offset + ". ";

  var send = shouldSend(s, a.eDays);
  if (send != true) {
    return;
  } else {
    var startDateDD = s.startDate.getDate();
    var startDateMM = s.startDate.getMonth();
  
    // Gather events for next x days
    var endDateDD = addDays(s.startDate, a.window).getDate();
    var endDateMM = addDays(s.startDate, a.window).getMonth();
    var endDateYY = addDays(s.startDate, a.window).getYear();
    
    // Add 1 day to endDateDD to adjust for subtracting a minute in original calculation
    var endDate = new Date(endDateYY, endDateMM, endDateDD + 1);
  
    var prettyStartDateMM = startDateMM + 1;
    var prettyEndDateMM = endDateMM + 1;
  
    var cal = CalendarApp.getOwnedCalendarsByName(a.pCal)[0];
    var weeklyEvents = cal.getEvents(s.startDate, endDate);
  
    var eventTitle = [];
    var eventStartTime = [];
    var previousStartTime = new Date(1970);
    var eventEndTime = [];
    var eventDescription = [];
    var eventLocation = [];
    
    // Using a table to get consistent, basic formatting
    var message = '<table><tbody>';
  
    for (var i = 0; i < weeklyEvents.length; ++i) {
      eventTitle[i] = weeklyEvents[i].getTitle();
      eventStartTime[i] = weeklyEvents[i].getStartTime();
      eventEndTime[i] = weeklyEvents[i].getEndTime();
      eventDescription[i] = weeklyEvents[i].getDescription();
      eventLocation[i] = weeklyEvents[i].getLocation();
      
      // If there are multiple events on same day, dont print the date out more than once
      if (eventStartTime[i].getMonth() == previousStartTime.getMonth() && eventStartTime[i].getDate() == previousStartTime.getDate() && eventStartTime[i].getYear() == previousStartTime.getYear()) {
        message = message +
          '<tr><td>' + eventDescription[i] + '</td></tr>';
      } else {
        message = message +
          '<tr><td><h3>' + ((eventStartTime[i].toDateString()).slice(0, 10)) + '</h3></td></tr>' +
          '<tr><td>' + eventDescription[i] + '</td></tr>';
      }
      message = message + "<tr><td>&nbsp;</td></tr>";
      previousStartTime = eventStartTime[i];
    }
  
    if (weeklyEvents.length == 0) {
      message = 'There are no events.<br>';
      timezoneNote = '';
    }

    if (s.maintainer.length > 0) {
      var maintainerNote = '<br><br><br><span style="font-size:11px;">Questions? Email the <a href="mailto:' + s.maintainer + '">maintainer</a></span>';
    } else {
      var maintainerNote = "";
    }
    
    message = message + '</tbody></table><br>' + timezoneNote + 'Invite ' + myCalId + 
        ' to your event and it will be added to this digest automatically.' + maintainerNote;
    MailApp.sendEmail(a.recipients, a.prefix + 'Out of office: ' + 
    prettyStartDateMM + '/' + startDateDD + '-' + prettyEndDateMM + '/' + endDateDD, message, { htmlBody: message });
  }
}
// Deletes existing events from the shared calendars
function deleteEvents(s, a) {
  
  var from = s.startDate;
  var to = s.endDate;
  
  var pCal = a.pCal;
  var pCalendar = CalendarApp.getCalendarsByName(pCal)[0];
  var pEvents = pCalendar.getEvents(from, to);
  
  var sCal = a.sCal;
  var sCalendar = CalendarApp.getCalendarsByName(sCal)[0];
  var sEvents = sCalendar.getEvents(from, to);
  
  for (var d = 0; d < pEvents.length; d++) {
    var ev = pEvents[d];
    ev.deleteEvent();
  }
  
  for (var d = 0; d < sEvents.length; d++) {
    var ev = sEvents[d];
    ev.deleteEvent();
  }
}

// Use a specific Gcal method to create multi-day events
function createMultiDayEvent(cal, title, start, end) {
  
  function dateString_(date, timeZone) {
   // format like Apr 21 2013
   var format = ' MMM dd yyyy';
   var str = Utilities.formatDate(date, timeZone, format);
   return str;
  }
  
  var zone = cal.getTimeZone();
  var description = Utilities.formatString( '%s from %s to %s', title, dateString_( start, zone ), dateString_( end, zone ));
  return cal.createEventFromDescription(description);
}

// Copy events from the invited user to group shared calendars
function replicate(event, duration, today, name, a) {
  var rEvent = event;
  var cal = CalendarApp.getCalendarsByName(a.sCal)[0];
  var title = name + ' - ' + rEvent.getTitle();
  var allDay = event.isAllDayEvent();
  if (allDay === true) {
    // If it's all-day event, check whether it's more than one day
    if (duration > 1) {
      // If more than one day, requires a hacky creation method (see createMultiDayEvent)
      var start = rEvent.getAllDayStartDate();
      var end = addDays(start, duration);
      
      // Don't create another multi-day event if the event started on a previous day
      if (today > start) {
        return;
      } else {
        createMultiDayEvent(cal, title, start, end);
      }
    } else {
      cal.createAllDayEvent(title, rEvent.getAllDayStartDate());
    }
  } else {
    var endOfToday = addDays(today, .9999); // 11:59 PM
    if ((today < rEvent.getStartTime()) && (endOfToday > rEvent.getStartTime())) {
      cal.createEvent(title, rEvent.getStartTime(), rEvent.getEndTime());
    } else {
      return;
    }
  }
}

// Turn email address into full name
function getUserName(email) {
  var result = AdminDirectory.Users.get(email, { fields: 'name' });
  var fullname = result.name.fullName;
  return fullname;
}

function formatTheDate (event, duration, s) {
  if (duration > 1) {
    var endDate = event.getEndTime();
    
    //multi-day all-day event - delete one day from end time
    if (event.isAllDayEvent() === true) {
      endDate.setDate(endDate.getDate() - 1);
    }
    
    var durDisplay =
      Utilities.formatDate(event.getStartTime(),
        (event.isAllDayEvent() === true ? "GMT" : s.offset), "M/d")
          + " - " 
          + Utilities.formatDate(endDate, (event.isAllDayEvent() === true ? "GMT" : s.offset), "M/d");
  } else if (duration < 1) {
    var durDisplay = 
      Utilities.formatDate(event.getStartTime(),
        (event.isAllDayEvent() === true ? "GMT" : s.offset), "h:mm a")
          + " - " + Utilities.formatDate(event.getEndTime(), (event.isAllDayEvent() === true ? "GMT" : s.offset), "h:mm a");
  } else //all day
  {
    var durDisplay = "all day";
  }
  return durDisplay;
}

// keywords to decide whether to list person as sick, vacaction, conference, or just out (default)
function getEventType(theTitle) {
  eventType = "";

  if (theTitle.search(/wfh|wfr/i) > -1) {
    eventType = "working remote";
  } else if (theTitle.search(/sick|doctor|dr\.|dentist|medical/i) > -1) {
    eventType = "sick / has doctor appointment";
  } else if (theTitle.search(/vacation|vaca|vac|holiday/i) > -1) {
    eventType = "on vacation";
  } else if (theTitle.search(/conference|training|seminar|workshop|conf|session|meeting/i) > -1) {
    eventType = "at a meeting/conference/training";
  } else {
    eventType = "out";
  }
  return eventType;
}

// Adds aggregated "all day" event to private calendar used for email digest and notification
function createGoneEvent(gone, today, a) {
  if (gone.length === 0) //do not post if nobody is out
  {
    return false;
  }

  var goneList = gone.join("\n");
  today.setDate(today.getDate());
  if (goneList.length === 0) {
    return false;
  }

  var cal = CalendarApp.getOwnedCalendarsByName(a.pCal)[0];
  var events = cal.getEventsForDay(today);
  
  for (var e in events) {
    var event = events[e];
    var startDateEvent = Utilities.formatDate(event.getStartTime(),
      (event.isAllDayEvent() === true ? "GMT" : a.offset), "M/d/yyyy");
    var tempDate = new Date(startDateEvent);
    var theDateshort = Utilities.formatDate(tempDate, "GMT", "M/d/yyyy");

    if (e === 0) {
      var outToday = (theDateshort === a.todayShort ? true : false);
    }
  }

  var advancedArgs = { description: goneList };
  cal.createAllDayEvent("Out of office", today, advancedArgs);
}

function whoIsOut(today, s, a) {
  var peopleOut = [];
  var myCal = CalendarApp.getDefaultCalendar();
  var events = myCal.getEventsForDay(today);

  for (var e = 0; e < events.length; e++) {
    var event = events[e];
    var duration = (event.getEndTime() - event.getStartTime()) / 86400000;

    // Weed out future all-day events mistakenly pulled by broken getEventsForDay function    
    var endOfToday = addDays(today, .9999); // 11:59 PM
    if ((endOfToday >= event.getStartTime()) || duration < 1) {
      var personEmail = event.getOriginalCalendarId();

      // If membership check is skipped, events from anyone will be included on this calendar.
      // This is only relevant for org-wide calendars.
      if (a.skip != true) {
        var groupMember = false;
        groupMember = compare(a.targetGroups, personEmail, s);
      } else {
        var groupMember = true
      }

      if (groupMember != false) {
        var personName = getUserName(personEmail);
        replicate(event, duration, today, personName, a);
        var durDisplay = formatTheDate(event, duration, s);
        
        // This hardcodes table HTML formatting into the daily event
        peopleOut.push("<tr><td>" +
            personName + " is " +
            getEventType(event.getTitle()) +
            " " + durDisplay +
            "</td></tr>");
      }
    } else {
    }
  }
  peopleOut.sort();
  return peopleOut;
}

// Update the calendar
function updateCalendars(s, a) {
  deleteEvents(s, a);
  for (u = 0; u < s.calUpdate; u++) {
    var activeDate = new Date(s.startDate);
    activeDate.setDate(activeDate.getDate() + u);
    
    if (activeDate.getDay() !== 0 && activeDate.getDay() != 6) { //not a weekend
      var goneListArray = whoIsOut(activeDate, s, a);
      createGoneEvent(goneListArray, activeDate, a);
    }
  }
}

/**
 * Set up calendar sharing for a single user or group. Refer to 
 * https://developers.google.com/google-apps/calendar/v3/reference/acl/insert.
 *
 * @param {string} calId   Calendar ID
 * @param {string} user    Email address to share with
 * @param {string} role    Optional permissions, default = "reader":
 *                         "none, "freeBusyReader", "reader", "writer", "owner"
 *
 * @returns {aclResource}  See https://developers.google.com/google-apps/calendar/v3/reference/acl#resource
 */

function shareCalendar(calId, user, role) {
  role = role || "reader";

  var acl = null;
  
  // Figure out whether this is a person or a group
  try {
    var userObject = AdminDirectory.Users.get(user);
  }
  catch (e) {
    var userType = "group";
  }
  
  if (userObject) {
    var userType = "user";
  }

  // Check whether there is already a rule for this user
  try {
    var acl = Calendar.Acl.get(calId, userType + ":" + user);
    var aclRole = acl.role;
  }
  catch (e) {
    // No existing acl record for this user
  }

  if (!acl || aclRole.match(/^(reader|writer|owner)$/) === null) {
    // No existing rule - insert one.
    acl = {
      "scope": {
        "type": userType,
        "value": user
      },
      "role": role
    };
    var newRule = Calendar.Acl.insert(acl, calId);
  }
  else {
    // There was a rule for this user - do nothing.
    return;
  }

  return newRule;
}/*
Functions:
 update: updates Out of office calendars
 updateAndNotify: updates Out of office calendars, then sends the email digest and chat notification (if applicable)
*/

function update() {
  var groups = init();
  var count = groups.count;
  var backward = 0; // update the calendar starting this many days ago (default: 0)
  var calUpdate = 7; // update the calendar for this many days, starting from today or the past as determined by `backward`.
  
  for (var i = 0; i < groups.count; i++) {
    var static = setStatic(groups, calUpdate, backward);
    var active = setActive(groups, i);
    
    if (active.skip != true) {
      active.targetGroups = containedGroups(active.group);
    }
    
    updateCalendars(static, active);
    
    for (var sc = 0; sc < active.share.length; sc++) {
      var calId = CalendarApp.getCalendarsByName(active.sCal)[0].getId();
      shareCalendar(calId, active.share[sc], "reader");
    }
  }
}

function updateAndNotify() {
  var groups = init();
  var backward = 0;
  var calUpdate = 28;
  
  for (var i = 0; i < groups.count; i++) {
    var static = setStatic(groups, calUpdate, backward);
    var active = setActive(groups, i);
    
    active.window = (active.window <= calUpdate) ? active.window : calUpdate;
    
    if (active.skip != true) {
      active.targetGroups = containedGroups(active.group);
    }
    
    updateCalendars(static, active);
    sendEmail(static, active);
    
    if (active.webhook.length > 0) {
      sendWebhook(static, active);
    }
    
    for (var j = 0; j < active.share.length; j++) {
      var calId = CalendarApp.getCalendarsByName(active.sCal)[0].getId();
      shareCalendar(calId, active.share[j], "reader");
    }
  }
}

// Rebuild the list of Groups displayed in the spreadsheet
function updateGroups() {
  var groups = init();
  var static = setStatic(groups);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetData = ss.getSheetByName("Flattened Groups")
  var header = ['Parent Group', 'Contained Groups'];
  sheetData.clear();
  sheetData.appendRow(header).setFrozenRows(1);
  for (var i = 0; i < groups.count; i++) {
    var active = setActive(groups, i);
    rows = generateGroupTree(active.group, static);
      for (j = 0; j < rows.length; j++) {
        rows[j] = [active.group, rows[j]];
      }
    if (rows.length > 0) {
      var lastRow = sheetData.getLastRow();
      var startRow = lastRow + 1;
      sheetData.getRange(startRow, 1, rows.length, header.length).setValues(rows);
    }
  }
}
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
}// Remove the table tags that were hardcoded into the daily summaries by events.gs
function reformat(s) {
  s = s.replace(/<tr>/g, "").replace(/<\/tr>/g, "").trim();
  s = s.replace(/<td>/g, "").replace(/<\/td>/g, "").trim();
  return s;
}

function notify(n, w) {
  var formData = {
   'message': n
  };
  var options = {
   'method' : 'post',
   'payload' : formData
  };
  UrlFetchApp.fetch(w, options);
}

function sendWebhook(s, a) {

  var send = shouldSend(s, a.wDays);
  if (send != true) {
    return;
  } else {
    var startDateDD = s.startDate.getDate();
    var startDateMM = s.startDate.getMonth();

    var endDateDD = addDays(s.startDate, 2).getDate();
    var endDateMM = addDays(s.startDate, 2).getMonth();
    var endDateYY = addDays(s.startDate, 2).getYear();
    var endDate = new Date(endDateYY, endDateMM, endDateDD);
  
    var cal = CalendarApp.getOwnedCalendarsByName(a.pCal)[0];
    var weeklyEvents = cal.getEvents(s.startDate, endDate);
  
    var eventTitle = [];
    var eventStartTime = [];
    var previousStartTime = new Date(1970);
    var eventEndTime = [];
    var eventDescription = [];
    var eventLocation = [];
    
    var notification = '';
  
    for (var i = 0; i < weeklyEvents.length; ++i) {
      eventTitle[i] = weeklyEvents[i].getTitle();
      eventStartTime[i] = weeklyEvents[i].getStartTime();
      eventEndTime[i] = weeklyEvents[i].getEndTime();
      eventDescription[i] = weeklyEvents[i].getDescription();
      eventLocation[i] = weeklyEvents[i].getLocation();
      
      // If there are multiple events on same day, dont print the date out more than once
      if (eventStartTime[i].getMonth() == previousStartTime.getMonth() && eventStartTime[i].getDate() == previousStartTime.getDate() && eventStartTime[i].getYear() == previousStartTime.getYear()) {
        notification = notification +
          '\n' + eventDescription[i] + '\n';
      } else {
        // Add Slack-flavored Markdown formatting
        notification = notification +
          '*' + ((eventStartTime[i].toDateString()).slice(0, 10)) + '*\n' +
          '' + eventDescription[i] + '\n';
      }
      previousStartTime = eventStartTime[i];
    }
  
    if (weeklyEvents.length > 0) {
      notification = notification + '\nAll dates and times are ' + s.offset + '.';
      notification = reformat(notification);
    } else {
      notification = 'No events today.';
    }
    notify(notification, a.webhook);
  }
}
