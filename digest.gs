/*
Functions:
 reminderDaily: aggregates the next 3 weeks of events on the calendar into a message
 addDays: simplifies add days from the start date
 formatTime: converts 24 hour based time to 12 hour
*/

var myCal = CalendarApp.getDefaultCalendar();
var myCalId = myCal.getId();

function reminderDaily(destinationCalName, recipient) {
  
    var myDate = new Date();

    // Don't send the email on Saturdays
    if (myDate.getDay() == 6) {
        return;
    } else {
        var startDate = new Date();
        var startDateDD = startDate.getDate();
        var startDateMM = startDate.getMonth();
    
        // Gather events for next 3 weeks
        var endDateDD = addDays(startDate, 21).getDate();
        var endDateMM = addDays(startDate, 21).getMonth();
        var endDateYY = addDays(startDate, 21).getYear();
        var endDate = new Date(endDateYY, endDateMM, endDateDD);
    
        var prettyStartDateMM = startDateMM + 1;
        var prettyEndDateMM = endDateMM + 1;
    
        var cal = CalendarApp.getOwnedCalendarsByName(destinationCalName)[0];
        var weeklyEvents = cal.getEvents(startDate, endDate);
    
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
            message = 'There are no events in the calendar.';
        }
        message = message + '</tbody></table><br>All dates and times are US Eastern. Invite ' + myCalId + ' to your event and it will be added to this digest automatically.';
        MailApp.sendEmail(recipient, prefix + 'Out and Away: ' + prettyStartDateMM + '/' + startDateDD + '-' + prettyEndDateMM + '/' + endDateDD, message, { htmlBody: message });
    }
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatTime(date) {
    var dd = new Date(date);
    var hh = dd.getHours();
    var mm = dd.getMinutes();
    var mod = "AM";

    if (hh >= 12) {
        hh = hh - 12;
        mod = "PM";
    }

    if (hh == 0) {
        hh = 12;
    }

    mm = mm < 10 ? "0" + mm : mm;

    return (hh + ":" + mm + " " + mod);
}
