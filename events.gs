/*
Functions:
 automateGone: creates/updates the next x days Who is Out events on official calendar
 getUserName: retrieves full names from email addresses
 getEventType: replaces the original title with an out-of-office category
*/

var d = new Date();
var timezone = "GMT-" + d.getTimezoneOffset() / 60;
var todayShort = Utilities.formatDate(d, timezone, "M/d/yyyy");

// Update the calendar(s)
function automateGone(targetCalendar, targetGroup, days) {

    var myDate = new Date();
    myDate.setHours(0);
    myDate.setMinutes(0);
    myDate.setSeconds(0);

    var goneListArray = whoIsOut(myDate);
    myDate.setDate(myDate.getDate() - 1);
  
    //update calendar for next x days, starting with today
    for (i = -1; i < days; i++) {
        myDate.setDate(myDate.getDate() + 1);

        if (myDate.getDay() !== 0 && myDate.getDay() != 6) //not a weekend
        {
            var goneListArray = whoIsOut(myDate, targetGroup);
            createGoneEvent(goneListArray, myDate, targetCalendar);
        }
    }
}

function whoIsOut(theDate) {
    var peopleOut = new Array();
    var myCal = CalendarApp.getDefaultCalendar();
    var events = myCal.getEventsForDay(theDate);

    for (var e in events) {
        var event = events[e];
        var duration = (event.getEndTime() - event.getStartTime()) / 86400000;
        var groupMember;
      
        if ((theDate >= event.getStartTime()) || duration < 1)
        /*weed out future all-day events mistakenly pulled by broken 
        getEventsForDay function*/
        {
            var onbehalf = "";
            var personEmail = (onbehalf == "") ? event.getOriginalCalendarId() : onbehalf;
            var groupMember = null;
            try {
                groupMember = AdminDirectory.Members.get(targetGroup, personEmail);
            }
            catch (e) {
                groupMember = null;
            }
          
            if (groupMember != null) {
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
              
                var personName = getUserName(personEmail);
                // Note: this hardcodes table HTML formatting into the daily event
                peopleOut.push("<tr><td>" + personName + " is " + getEventType(event.getTitle()) + " " + durDisplay + "</td></tr>");
            }
        }
    }
    peopleOut.sort();
    return peopleOut;
}

// Requires Calendar API and Admin SDK be activated in G Suite
// Requires the Admin SDK be activated for this project
// Requires current user have user and calendar read privileges
function getUserName(email) {
    var result = AdminDirectory.Users.get(email, { fields: 'name' });
    var fullname = result.name.fullName;
    return fullname;
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

// deletes existing Who is Out event and adds updated one
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

    var officialCal = CalendarApp.getOwnedCalendarsByName(targetCalendar)[0];
    var events = officialCal.getEventsForDay(theDate);
  
    for (var e in events) {
        var event = events[e];
        var startDate = Utilities.formatDate(event.getStartTime(),
            (event.isAllDayEvent() === true ? "GMT" : timezone), "M/d/yyyy");
        var theDateshort = Utilities.formatDate(theDate, "GMT", "M/d/yyyy");

        if (e == 0) {
          var outToday = (theDateshort == todayShort ? true : false);
        }

        if (event.getTitle() == "Who is Out") {
            event.deleteEvent(); //delete existing event before recreating
        }
    }

    var advancedArgs = { description: goneList };
    officialCal.createAllDayEvent("Who is Out", theDate, advancedArgs);
}
