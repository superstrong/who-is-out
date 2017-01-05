/*
Functions:
 notificationDaily: aggregates today's events on the calendar (if any) into Markdown-formatted text
 notify: sends the message body to the webhook
*/

var myCal = CalendarApp.getDefaultCalendar();
var myCalId = myCal.getId();

function notificationDaily(destinationCalName, webhook) {
  
    var myDate = new Date();

    // Don't notify on Saturdays
    if (myDate.getDay() == 6) {
        return;
    } else {
        var startDate = new Date();
        var startDateDD = startDate.getDate();
        var startDateMM = startDate.getMonth();

        var endDateDD = addDays(startDate, 1).getDate();
        var endDateMM = addDays(startDate, 1).getMonth();
        var endDateYY = addDays(startDate, 1).getYear();
        var endDate = new Date(endDateYY, endDateMM, endDateDD);
    
        var cal = CalendarApp.getOwnedCalendarsByName(destinationCalName)[0];
        var weeklyEvents = cal.getEvents(startDate, endDate);
    
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
                // Add Markdown-flavored formatting
                notification = notification +
                    '*' + ((eventStartTime[i].toDateString()).slice(0, 10)) + '*\n' +
                    '' + eventDescription[i] + '\n';
            }
            previousStartTime = eventStartTime[i];
        }
    
        if (weeklyEvents.length > 0) {
            notification = notification + '\nAll dates and times are US Eastern. Invite ' + myCalId + ' to your event and it will be added to this notification automatically.';
            notification = reformat(notification);
        } else {
            notification = 'I see no human outages scheduled for today. Invite ' + myCalId + ' to your event and it will be added to this notification automatically.';
        }
        notify(notification, webhook);
    }
}

// Remove the table tags that were hardcoded into the daily summaries by events.gs
function reformat(s) {
    s = s.replace("<tr>", "").replace("</tr>", "").trim();
    s = s.replace("<td>", "").replace("</td>", "").trim();
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
