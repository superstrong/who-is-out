/*
Functions:
 automateGone: creates/updates the next 7 days Who is Out events on official calendar
 automateGoneDaily: creates/updates next 90 days Who is Out events on the official calendar
 getUserName: retrieves full names from email addresses
 getEventType: replaces the original title with an out-of-office category
*/

var d = new Date();
var timezone = "GMT-" + d.getTimezoneOffset() / 60;

// triggered every hour to update the official calendar
function automateGone(destinationCalName) {

    var myDate = new Date();
    myDate.setHours(0);
    myDate.setMinutes(0);
    myDate.setSeconds(0);
    myDate.setDate(myDate.getDate() - 1);

    for (i = 0; i < 7; i++) //update next 7 days
    {
        myDate.setDate(myDate.getDate() + 1);

        if (myDate.getDay() !== 0 && myDate.getDay() != 6) //not a weekend
        {
            var goneListArray = whoIsOut(myDate);
            createGoneEvent(goneListArray, myDate);
        }
    }
}

// triggered once/day to update the official calendar further out
function automateGoneDaily(destinationCalName) {

    var myDate = new Date();
    myDate.setHours(0);
    myDate.setMinutes(0);
    myDate.setSeconds(0);

    var goneListArray = whoIsOut(myDate);
    myDate.setDate(myDate.getDate() - 1);
  
    //update calendar for next 90 days, starting with today
    for (i = -1; i < 91; i++) {
        myDate.setDate(myDate.getDate() + 1);

        if (myDate.getDay() !== 0 && myDate.getDay() != 6) {
            var goneListArray = whoIsOut(myDate);
            /*goneListArray also declared in func(automateGone), required
                in this function as well*/
            createGoneEvent(goneListArray, myDate);
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

        if ((theDate >= event.getStartTime()) || duration < 1)
        /*weed out future all-day events mistakenly pulled by broken 
        getEventsForDay function*/
        {

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

            var onbehalf = "";
            var personEmail = (onbehalf == "") ? event.getOriginalCalendarId() : onbehalf;
            var personName = getUserName(personEmail);
            peopleOut.push("<tr><td>" + personName + " is " + getEventType(event.getTitle()) + " " + durDisplay + "</td></tr>");

        }
    }
    peopleOut.sort();
    return peopleOut;
}

// Requires Calendar API and Admin SDK be activated in G Suite
// Requires the Admin SDK be activated for this project
// Requires current user have User Management Admin privileges
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

    var officialCal = CalendarApp.getOwnedCalendarsByName(destinationCalName)[0];
    var events = officialCal.getEventsForDay(theDate);

    for (var e in events) {
        var event = events[e];
        var startDate = Utilities.formatDate(event.getStartTime(),
            (event.isAllDayEvent() === true ? "GMT" : timezone), "M/d/yyyy");
        var theDateshort = Utilities.formatDate(theDate, "GMT", "M/d/yyyy");

        if (event.getTitle() == "Who is Out") {
            event.deleteEvent(); //delete existing event before recreating
        }
    }

    var advancedArgs = { description: goneList };
    officialCal.createAllDayEvent("Who is Out", theDate, advancedArgs);
}
