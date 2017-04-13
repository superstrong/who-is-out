// Remove the table tags that were hardcoded into the daily summaries by events.gs
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
