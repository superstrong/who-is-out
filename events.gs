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
}