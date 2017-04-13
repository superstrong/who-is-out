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
