function shouldSend(s, d) {
  var send = true;
  var today = [];
  today.push(s.startDate.getDay());
  send = compareArrays(today,d);
  return send;
}

/**
 * Writes a description of the event for any notification.
 *
 * @param {object} activeEvent   The calendar event
 * @param {object} activeDate  The date currently being written to the digest
 * @param {object} s   Static script properties
 *
 * @returns {string} The text to insert into the email digest
 */

function describeEvent(activeEvent, activeDate, s) {
  
  function resetDate(timestamp, s) {
    var reset = new Date(timestamp).toLocaleString("en-US", {timeZone: s.timezone});
    reset = new Date(reset);
    reset.setHours(0);
    reset.setMinutes(0);
    reset.setSeconds(0);
    reset.setMilliseconds(0);
    return reset;
  }
  
  function prettyDate(uglyDate, s) {
    var pretty = Utilities.formatDate(uglyDate, s.timezone, "M/d");
    return pretty;
  }
  
  function prettyTime(uglyDate, s) {
    var hours = Utilities.formatDate(uglyDate, s.timezone, "h");
    var minutes = Utilities.formatDate(uglyDate, s.timezone, "mm").toString();
    if (minutes === "00") {
      minutes = "";
    } else {
      minutes = ":" + minutes;
    }
    var ap = Utilities.formatDate(uglyDate, s.timezone, "a").toString().toLowerCase();
    var pretty = hours + minutes + ap;
    return pretty;
  }
  
  var eventStartDate = resetDate(activeEvent.getStartTime(), s);
  var eventEndDate = resetDate(activeEvent.getEndTime(), s);  
  var eventEndDateMultiDayAllDay = addDays(eventEndDate, 0 - .0001);
  
  // If it's an all-day event, it "ends" on midnight the next day and needs 1 second subtracted to end on its "real" day
  var eventEndTimeAdjusted = (activeEvent.isAllDayEvent() === true) ? addDays(activeEvent.getEndTime(), 1 - 0.0001) : activeEvent.getEndTime();
  var eventEndDateAdjusted = (activeEvent.isAllDayEvent() === true) ? eventEndDateMultiDayAllDay : eventEndDate;
  
  var emailRow = activeEvent.getTitle() + " " + prettyTime(activeEvent.getStartTime(), s) + "-" + prettyTime(activeEvent.getEndTime(), s); // show just the times
  if ((eventEndDate > eventStartDate) === true) { // spans more than one day
    emailRow = activeEvent.getTitle() + " " + prettyDate(eventStartDate, s) + "-" + prettyDate(eventEndDateAdjusted, s); // show just the dates dates
    if (activeDate.toString() === eventStartDate.toString() && activeEvent.getStartTime() > eventStartDate) { // if event starts this day, show time
      emailRow = activeEvent.getTitle() + " " + prettyTime(activeEvent.getStartTime(), s) + " " + prettyDate(activeEvent.getStartTime(), s) + "-" + prettyDate(eventEndDateAdjusted, s);
    }
    if (activeDate.toString() === eventEndDate.toString() && activeEvent.getEndTime() > eventEndDate) { // if event ends this day, show time
      emailRow = activeEvent.getTitle() + " " + prettyDate(activeEvent.getStartTime(), s) + "-" + prettyDate(eventEndDateAdjusted, s) + " " + prettyTime(eventEndTimeAdjusted, s);
    }
  }
  return emailRow;
}

/**
 * Generates and sends an email digest for each group from the sheet.
 *
 * @param {object} s   Static script properties
 * @param {object} a  Active script properties (i.e., groups)
 *
 */

function sendEmails(s, a) {
  var send = shouldSend(s, a.eDays);
  if (send !== true) {
    return;
  } else {
    var message = '<table><tbody>'; // Using a table to get consistent, basic formatting
    var cal = CalendarApp.getOwnedCalendarsByName(a.sCal)[0];
    var startDate = s.startDate;
    var endDate = addDays(startDate, a.window - 0.0001);
    var windowEvents = [];
    var windowEvents = cal.getEvents(startDate, endDate);
    
    var startDateDD = startDate.getDate();
    var startDateMM = startDate.getMonth();
    var prettyStartDateMM = startDateMM + 1;
    var endDateDD = endDate.getDate();
    var endDateMM = endDate.getMonth();
    var prettyEndDateMM = endDateMM + 1;
    
    if (windowEvents.length === 0) {
      message = 'There are no events.<br>';
      timezoneNote = '';
    } else {
      for (e = 0; e < a.window; e++) {
        var activeDate = addDays(startDate, e);
        if (activeDate.getDay() !== 0 && activeDate.getDay() != 6) {
          var activeDateEvents = [];
          activeDateEvents = cal.getEventsForDay(activeDate);
          if (activeDateEvents.length > 0) {
            var dateHeader = Utilities.formatDate(activeDate, s.timezone, 'EEE, MMM dd');
            message = message + "<tr><td><h3>" + dateHeader + "</h3></td></tr>"
          
            for (var u = 0; u < activeDateEvents.length; u++) {
              var activeEvent = activeDateEvents[u];
              var activeEventText = describeEvent(activeEvent, activeDate, s);
    
              message = message + "<tr><td>" + activeEventText + "</td></tr>";
            }
          }
          message = message + "<tr><td>&nbsp;</td></tr>";
        }
      }
      var timezoneNote = "All dates and times are " + s.timezone + ". ";
    }

    if (s.maintainer.length > 0) {
      var maintainerNote = '<br><br><br><span style="font-size:11px;">Questions? Email the <a href="mailto:' + s.maintainer + '">maintainer</a></span>';
    } else {
      var maintainerNote = "";
    }
    
    message = message + '</tbody></table><br>' + timezoneNote + 'Invite ' + Session.getActiveUser().getEmail() + 
        ' to your event and it will be added to this digest automatically.' + maintainerNote;
    MailApp.sendEmail(a.recipients, a.prefix + 'Out of office: ' + 
    prettyStartDateMM + '/' + startDateDD + '-' + prettyEndDateMM + '/' + endDateDD, message, { htmlBody: message });
  }
}

/**
 * Generates and sends a webhook event for each group from the sheet (only if a URL is present).
 *
 * @param {object} s   Static script properties
 * @param {object} a  Active script properties (i.e., groups)
 *
 */

function sendWebhooks(s, a) {
  
  function postEvent(n, w) {
    var formData = {
     'message': n
    };
    var options = {
     'method' : 'post',
     'payload' : formData
    };
    UrlFetchApp.fetch(w, options);
  }
  
  var send = shouldSend(s, a.wDays);
  if (send !== true) {
    return;
  } else {
    var daysCovered = 2; // Hard coded: number of days to include in webhook event digest
    var notification = '';
    var cal = CalendarApp.getOwnedCalendarsByName(a.sCal)[0];
    var startDate = s.startDate;
    var endDate = addDays(startDate, daysCovered - 0.0001);
    var windowEvents = [];
    var windowEvents = cal.getEvents(startDate, addDays(startDate, 2));
    
    if (windowEvents.length === 0) {
      notification = 'No events today.';
      timezoneNote = '';
    } else {
      for (e = 0; e < daysCovered; e++) {
        var activeDate = addDays(startDate, e);
        if (activeDate.getDay() !== 0 && activeDate.getDay() != 6) {
          var activeDateEvents = [];
          activeDateEvents = cal.getEventsForDay(activeDate);
          if (activeDateEvents.length > 0) {
            var dateHeader = Utilities.formatDate(activeDate, s.timezone, 'EEE, MMM dd');
            notification = notification + "*" + dateHeader + "*\n";
          
            for (var u = 0; u < activeDateEvents.length; u++) {
              var activeEvent = activeDateEvents[u];
              var activeEventText = describeEvent(activeEvent, activeDate, s);
              notification = notification + activeEventText + "\n";
            }
          }
        }
      }
      var timezoneNote = "All dates and times are " + s.timezone + ". ";
    }
    postEvent(notification, a.webhook);
  }
}