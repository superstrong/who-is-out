/**
 * Updates all the shared calendars from the source sheet.
 * Compares the unified OOO calendar to the shared calendar for a specific group,
 * then uses the diff to delete/create events as needed.
 *
 * @param {object} s   Static script properties
 * @param {object} a  Active script properties (i.e., groups)
 *
 */

function updateSharedCalendars(s, a) {

  // *** HELPER FUNCTIONS *** //
  
  // Use a specific Gcal method to create multi-day events
  function createMultiDayEvent(cal, title, start, end, s) {
  
    function dateString_(date, timeZone) {
      // format like Apr 21 2013
      var format = ' MMM dd yyyy';
      var str = Utilities.formatDate(date, timeZone, format);
      return str;
    }
  
    var zone = s.timezone;
    var description = Utilities.formatString('%s from %s to %s', title, dateString_(start, zone), dateString_(end, zone));
    return cal.createEventFromDescription(description);
  }
  
  // Turn email address into full name
  function getUserName(email) {
    var result = AdminDirectory.Users.get(email, { fields: 'name' });
    var fullname = result.name.fullName;
    return fullname;
  }

  function matchEvent(sharedEvents, outEventId) {
    var eventMatches = false;
    try {
      if (sharedEvents.hasOwnProperty(outEventId) === true) {
        eventMatches = true;
      }
    } catch (e) {}
    return eventMatches;
  }

  function matchHash(sharedEvents, outEventId, outEventHash) {
    var match = {};
    match.answer = false;
    try {
      match.originalEventId = sharedEvents[outEventId]["originalEventId"];
      if (sharedEvents[outEventId]["hash"] === outEventHash) {
        match.answer = true;
      }
    } catch (e) {}
    return match;
  }

  function checkMembership(event, email, s, a) {
    
    function findMembership(targetGroups, email) {
      var found, f;
      var targetMap = {};
      targetMap = PropertiesService.getScriptProperties();

      found = false;
    
      // Loop over all items in the `toMatch` array and see if any of
      //  their values are in the map from before
      for (f = 0; !found && (f < targetGroups.length); f++) {
        var targetGroup = targetGroups[f];
        var joined = email + "__" + targetGroup;
        found = !!targetMap.getProperty(joined);
        // If found, `targetMap[joined]` will return true, otherwise it
        //  will return `undefined`...that's what the `!!` is for
      }
      return found;
    };
        
    
    // If membership check is skipped, events from anyone will be included on this calendar.
    // This is only relevant for org-wide calendars.
    try {
      var personEmail = email;
      if (a.skip === true) {
        var groupMember = true;
      } else {
        var groupMember = false;
        groupMember = findMembership(a.targetGroups, personEmail);
      }

      if (groupMember === true) {
        var personName = getUserName(personEmail);
      }
      return personName;
    } catch (e) {
      return null;
    }
  }

  function deleteSharedEvents(toDelete, a) {
    try {
      if (!toDelete) {
        return;
      }
      var sCal = CalendarApp.getCalendarsByName(a.sCal)[0];
      if (toDelete.length > 0) {
        for (var td = 0; td < toDelete.length; td++) {
          var dEventId = toDelete[td];
          var dEvent = sCal.getEventSeriesById(dEventId);
          if (dEvent) {
            try {
              dEvent.deleteEventSeries();
            } catch (e) {
              dEvent.deleteEvent();
            }
          }
        }
      } else {
        return;
      }
    } catch (e) {
      return;
    }
  }

  function findOrphans(outEvents, sArr) {
    var eventsToDelete = [];
    if (!outEvents) {
      return;
    } else {
      if (sArr.length > 0) {
        for (var fo = 0; fo < sArr.length; fo++) {
          var sharedEvent = sArr[fo];
          var sharedEventId = sharedEvent.getId();
          if (sharedEvent.getTag("id")) {
            var sharedEventTagId = sharedEvent.getTag("id");
            if (outEvents.hasOwnProperty(sharedEventTagId) !== true) {
              eventsToDelete.push(sharedEventId);
            }
          } else {
            eventsToDelete.push(sharedEventId);
          }
        }
      }
    }
    return eventsToDelete;
  }

  function cleanEvent(clone, original) {
    clone.setTag("id", original.getId());
    clone.setTag("hash", original.getLastUpdated().toUTCString());
    clone.removeAllReminders();
    return clone;
  }

  function createSharedEvents(toCreate, s, a) {
    if (toCreate.length > 0) {
      for (var tc = 0; tc < toCreate.length; tc += 2) {
        var event = toCreate[tc];
        var duration = (event.getEndTime() - event.getStartTime()) / 86400000;
        var name = toCreate[tc + 1];
        var cal = CalendarApp.getCalendarsByName(a.sCal)[0];
        var title = name + ' - ' + event.getTitle();
        var allDay = event.isAllDayEvent();

        // It's an "all-day" event, no times provided
        if (allDay === true) {

          // Check whether it's more than one day
          if (duration > 1) {
            // If more than one day, requires a hacky creation method (see createMultiDayEvent)
            var start = event.getAllDayStartDate();
            var end = addDays(start, (duration - .0001));
            var clone = createMultiDayEvent(cal, title, start, end, s);
            clone = cleanEvent(clone, event);

          } else {
            var clone = cal.createAllDayEvent(title, event.getAllDayStartDate());
            clone = cleanEvent(clone, event)
          }

        } else {
          var clone = cal.createEvent(title, event.getStartTime(), event.getEndTime());
          clone = cleanEvent(clone, event);
        }
      }
    } else {
      return;
    }
  }

  function buildSharedEvents(sArr) {
    if (sArr.length > 0) {
      var builtEvents = {};
      for (var bs = 0; bs < sArr.length; bs++) {
        var sharedEvent = sArr[bs];
        var sharedEventId = sharedEvent.getId();
        if (sharedEvent.getTag("id")) {
          var sharedEventTagId = sharedEvent.getTag("id");
          builtEvents[sharedEventTagId] = {};
          builtEvents[sharedEventTagId]["originalEventId"] = sharedEventId;
          builtEvents[sharedEventTagId]["event"] = sharedEvent;

          if (sharedEvent.getTag("hash")) {
            builtEvents[sharedEventTagId]["hash"] = sharedEvent.getTag("hash");
          }
        }
      }
      return builtEvents;
    } else {
      var builtEvents = {};
    }
  }

  // *** INSTRUCTIONS *** //

  var sCal = CalendarApp.getCalendarsByName(a.sCal)[0]; // the shared calendar for the current group
  var sArr = [];
  sArr = sCal.getEvents(s.startDate, s.endDate);
  var sharedEvents = {};
  sharedEvents = buildSharedEvents(sArr);

  var oCal = CalendarApp.getDefaultCalendar(); // the primary calendar for this user
  var outArr = [];
  outArr = oCal.getEvents(s.startDate, s.endDate);
  var outEvents = {};

  // compare calendars, build arrays of diffs
  var toDelete = [];
  var toCreate = [];
  for (var oa = 0; oa < outArr.length; oa++) {
    var outEvent = outArr[oa];
    var outEventId = outEvent.getId();
    var outEventHash = outEvent.getLastUpdated().toUTCString();

    outEvents[outEventId] = {};
    outEvents[outEventId]["hash"] = outEventHash;
    outEvents[outEventId]["event"] = outEvent;

    if (matchEvent(sharedEvents, outEventId) === true) {
      var matched = matchHash(sharedEvents, outEventId, outEventHash);
      if (matched.answer === true) {
      } else {
        toDelete.push(matched.originalEventId);

        var personEmail = outEvent.getOriginalCalendarId();
        var creatorName = getUserName(personEmail);
        var eventToCreate = [];
        var eventToCreate = [outEvent, creatorName];
        toCreate.push.apply(toCreate, eventToCreate);
      }
    } else {
      var personEmail = outEvent.getOriginalCalendarId();
      var creatorName = checkMembership(outEvent, personEmail, s, a);
      if (creatorName) {
        var eventToCreate = [];
        eventToCreate.push(outEvent, creatorName);
        toCreate.push.apply(toCreate, eventToCreate);
      }
    }
  }

  deleteSharedEvents(toDelete, a); // delete events from the shared calendar
  var orphansToDelete = [];
  orphansToDelete = findOrphans(outEvents, sArr); // find shared calendar events that are no longer on the ooo calendar
  deleteSharedEvents(orphansToDelete, a); // delete events from the shared calendar
  createSharedEvents(toCreate, s, a); // create events on the shared calendar
}

/**
 * Set up calendar sharing for a single user or group. Refer to 
 * https://developers.google.com/google-apps/calendar/v3/reference/acl/insert.
 *
 * @param {string} calId   Calendar ID
 * @param {string} user  Email address to share with
 * @param {string} role  Optional permissions, default = "reader":
 *             "none, "freeBusyReader", "reader", "writer", "owner"
 *
 * @returns {aclResource}  See https://developers.google.com/google-apps/calendar/v3/reference/acl#resource
 */

function shareCalendar(calId, user, role) {
  role = role || "reader";

  var acl = null;

  // Figure out whether this is a person or a group
  try {
    var userObject = AdminDirectory.Users.get(user);
  } catch (e) {
    var userType = "group";
  }

  if (userObject) {
    var userType = "user";
  }

  // Check whether there is already a rule for this user
  try {
    var acl = Calendar.Acl.get(calId, userType + ":" + user);
    var aclRole = acl.role;
  } catch (e) {
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
  } else {
    // There was a rule for this user - do nothing.
    return;
  }

  return newRule;
}
