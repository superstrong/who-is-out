/*
Functions:
 update: updates Out of office calendars
 updateAndNotify: updates Out of office calendars, then sends the email digest and chat notification (if applicable)
*/

function update() {
  var groups = init();
  var count = groups.count;
  var backward = 0; // update the calendar starting this many days ago (default: 0)
  var calUpdate = 7; // update the calendar for this many days, starting from today or the past as determined by `backward`.
  
  for (var i = 0; i < groups.count; i++) {
    var static = setStatic(groups, calUpdate, backward);
    var active = setActive(groups, i);
    
    if (active.skip != true) {
      active.targetGroups = containedGroups(active.group);
    }
    
    updateCalendars(static, active);
    
    for (var sc = 0; sc < active.share.length; sc++) {
      var calId = CalendarApp.getCalendarsByName(active.sCal)[0].getId();
      shareCalendar(calId, active.share[sc], "reader");
    }
  }
}

function updateAndNotify() {
  var groups = init();
  var backward = 0;
  var calUpdate = 28;
  
  for (var i = 0; i < groups.count; i++) {
    var static = setStatic(groups, calUpdate, backward);
    var active = setActive(groups, i);
    
    active.window = (active.window <= calUpdate) ? active.window : calUpdate;
    
    if (active.skip != true) {
      active.targetGroups = containedGroups(active.group);
    }
    
    updateCalendars(static, active);
    sendEmail(static, active);
    
    if (active.webhook.length > 0) {
      sendWebhook(static, active);
    }
    
    for (var j = 0; j < active.share.length; j++) {
      var calId = CalendarApp.getCalendarsByName(active.sCal)[0].getId();
      shareCalendar(calId, active.share[j], "reader");
    }
  }
}

// Rebuild the list of Groups displayed in the spreadsheet
function updateGroups() {
  var groups = init();
  var static = setStatic(groups);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetData = ss.getSheetByName("Flattened Groups")
  var header = ['Parent Group', 'Contained Groups'];
  sheetData.clear();
  sheetData.appendRow(header).setFrozenRows(1);
  for (var i = 0; i < groups.count; i++) {
    var active = setActive(groups, i);
    rows = generateGroupTree(active.group, static);
      for (j = 0; j < rows.length; j++) {
        rows[j] = [active.group, rows[j]];
      }
    if (rows.length > 0) {
      var lastRow = sheetData.getLastRow();
      var startRow = lastRow + 1;
      sheetData.getRange(startRow, 1, rows.length, header.length).setValues(rows);
    }
  }
}
