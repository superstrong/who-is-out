/*
Functions:
 automateGone: creates/updates the next x days Who is Out events on official calendar
 deleteSharedEvents: clears the shared calendar before replication
 replicate: copies events to shared calendars
 getUserName: retrieves full names from email addresses
 getEventType: replaces the original title with an out-of-office category
*/

var d = new Date();
var timezone = "GMT-" + d.getTimezoneOffset() / 60;
var todayShort = Utilities.formatDate(d, timezone, "M/d/yyyy");

// Update the calendar(s)
function automateGone(pCal, targetGroup, sCal, daysUpdate) {
  
    Date.prototype.addDays = function(days) {
      var dat = new Date(this.valueOf());
      dat.setTime(dat.getTime() + (days * 86400000));
      return dat;
    }
  
    var myDate = new Date();
    myDate.setHours(0);
    myDate.setMinutes(0);
    myDate.setSeconds(0);

    // Delete existing events on the shared calendars
    deleteSharedEvents(pCal);
    deleteSharedEvents(sCal);

    myDate.setDate(myDate.getDate() - 1);
  
    //update calendars for next x days, starting with today
    for (i = -1; i < daysUpdate; i++) {
        myDate.setDate(myDate.getDate() + 1);

        if (myDate.getDay() !== 0 && myDate.getDay() != 6) //not a weekend
        {
            var goneListArray = whoIsOut(myDate, targetGroup, sCal);
            createGoneEvent(goneListArray, myDate, pCal);
        }
    }
}

function whoIsOut(theDate, targetGroup, sCal) {
    var peopleOut = new Array();
    var myCal = CalendarApp.getDefaultCalendar();
    var events = myCal.getEventsForDay(theDate);
    sCal = sCal;

    for (var e = 0; e < events.length; e++) {
        var event = events[e];
        var duration = (event.getEndTime() - event.getStartTime()) / 86400000;
        var groupMember;
      
        if ((theDate >= event.getStartTime()) || duration < 1)
        /*weed out future all-day events mistakenly pulled by broken 
        getEventsForDay function*/
        {
            var onbehalf = "";
            var personEmail = (onbehalf == "") ? event.getOriginalCalendarId() : onbehalf;

            var groupMember = false;
            groupMember = compare(targetGroups, personEmail);
          
            if (groupMember != false) {
              
                var personName = getUserName(personEmail);
              
                // Copy event to the shared calendars
                replicate(event, duration, theDate, personName);
              
                if (duration > 1) //multi-day event - delete one day from end time
                {
                    var endDate = event.getEndTime();
                    endDate.setDate(endDate.getDate() - 1);
                    var durDisplay = Utilities.formatDate(event.getStartTime(),
                        (event.isAllDayEvent() === true ? "GMT" : timezone),
                        "M/d") + " - " + Utilities.formatDate(endDate,
                        (event.isAllDayEvent() === true ? "GMT" : timezone), "M/d");
                } else if (duration < 1) //part day
                {
                    var durDisplay = Utilities.formatDate(event.getStartTime(),
                        (event.isAllDayEvent() === true ? "GMT" : timezone),
                        "h:mm a") + " - " + Utilities.formatDate(event.getEndTime(),
                        (event.isAllDayEvent() === true ? "GMT" : timezone),
                        "h:mm a");
                } else //all day
                {
                    var durDisplay = "all day";
                }

                // Note: this hardcodes table HTML formatting into the daily event
                peopleOut.push("<tr><td>" + personName + " is " + getEventType(event.getTitle()) + " " + durDisplay + "</td></tr>");
            }
        }
    }
    peopleOut.sort();
    return peopleOut;
}

// Deletes existing events from the shared calendars
function deleteSharedEvents(cal) {
  var fromDate = new Date();
  var toDate = fromDate.addDays(daysUpdate)
  var dCal = cal;
  var dCalendar = CalendarApp.getCalendarsByName(dCal)[0];
  var dEvents = dCalendar.getEvents(fromDate, toDate);
  
  for (var i = 0; i < dEvents.length; i++) {
    var ev = dEvents[i];
    ev.deleteEvent();
  }
}

// Turn email address into full name
function getUserName(email) {
    var result = AdminDirectory.Users.get(email, { fields: 'name' });
    var fullname = result.name.fullName;
    return fullname;
}

// Copy events from the invited user to group shared calendars
function replicate(event, duration, theDate, name) {
  var rEvent = event;
  var rCal = CalendarApp.getCalendarsByName(sCal)[0];
  var rTitle = name + ' - ' + rEvent.getTitle();
  var allDay = rEvent.isAllDayEvent();
  if (allDay === true) {
    // If it's all-day event, check whether it's more than one day
    if (duration > 1) {
      // If more than one day, requires a hacky creation method (see createMultiDayEvent)
      var start = rEvent.getAllDayStartDate();
      var end = start.addDays(duration);
      end = new Date(end - 1);
      var startGap = new Date(theDate) - new Date(start);
      
      // Don't create another multi-day event if the event started on a previous day
      if (startGap > 0) {
      } else {
        createMultiDayEvent(rCal, rTitle, start, end);
      }
    } else {
      var newEvent = rCal.createAllDayEvent(rTitle, rEvent.getAllDayStartDate());
    }
  } else {
    var newEvent = rCal.createEvent(rTitle, rEvent.getStartTime(), rEvent.getEndTime());
  }
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
function createGoneEvent(goneListArray, theDate) {
    if (goneListArray.length === 0) //do not post if nobody is out
    {
        return false;
    }

    var goneList = goneListArray.join("\n");
    theDate.setDate(theDate.getDate());
    if (goneList.length === 0) {
        return false;
    }

    var officialCal = CalendarApp.getOwnedCalendarsByName(pCal)[0];
    var events = officialCal.getEventsForDay(theDate);
  
    for (var e in events) {
        var event = events[e];
        var startDate = Utilities.formatDate(event.getStartTime(),
            (event.isAllDayEvent() === true ? "GMT" : timezone), "M/d/yyyy");
        var theDateshort = Utilities.formatDate(theDate, "GMT", "M/d/yyyy");

        if (e == 0) {
          var outToday = (theDateshort == todayShort ? true : false);
        }
    }

    var advancedArgs = { description: goneList };
    officialCal.createAllDayEvent("Out of office", theDate, advancedArgs);
}

// Use a specific Gcal method to create multi-day events
function createMultiDayEvent(calendar, title, startDate, endDate) {
 var timeZone = calendar.getTimeZone();
 var description = Utilities.formatString( '%s from %s to %s', title, dateString_( startDate, timeZone ), dateString_( endDate, timeZone ));
 return calendar.createEventFromDescription(description);
}

// Format the date as a string for the createEventFromDescription method
function dateString_(date, timeZone) {
 // format like Apr 21 2013
 var format = ' MMM dd yyyy';
 var str = Utilities.formatDate(date, timeZone, format);
 return str;
}