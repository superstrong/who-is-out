/*
Functions:
 hourly: updates Out of office calendars
 daily: updates Out of office calendars, then sends the email digest and chat notification (if applicable)
*/

/*
"Groups" JSON below
1. group: For every event, check whether the user belongs to this group
2. privateCal: A secondary calendar used to aggregate events. Used for emails and notifications.
3. sharedCal: A shareable calendar that replicates every relevant event
4. recipients: The email digest recipient(s). Separate multiple addresses with a comma.
5. label: The subject-line prefix for the email digest
6. (optional) webhook: for notifying today's human outages
*/

var groups = 
{
  "data":[
    {
      "group":"everyone@yourdomain.com",
      "privateCal":"ooo - <group>",
      "sharedCal":"Out of office (Group)",
      "recipients":"everyone@yourdomain.com,someone@personaldomain.com",
      "label":null,
      "webhook":"https://hooks.zapier.com/hooks/catch/foobar"
    },
    {
      "group":"management@yourdomain.com",
      "privateCal":"ooo - mgmt",
      "sharedCal":"Out of office (Mgmt)",
      "recipients":"management@yourdomain.com",
      "label":"Management"
    }
  ]
};

var domainName = "yourdomain.com";
var daysUpdate;
var emailDuration;
var groupsCount = Object.keys(groups.data).length;
var targetGroup;
var targetGroups;
var pCal;
var sCal;
var targetList;
var label;

function hourly() {
  daysUpdate = 14; // update the calendar for next 14 days
  for (var i = 0; i < groupsCount; i++) {
    targetGroup = groups.data[i].group;
    pCal = groups.data[i].privateCal;
    sCal = groups.data[i].sharedCal;
    
    targetGroups = containedGroups(targetGroup);
    automateGone(pCal, targetGroup, sCal, daysUpdate);
  }
}

function daily() {
  daysUpdate = 30; // update the calendar for next 30 days
  emailDuration = 14; // include 14 days in the email digest
  for (var i = 0; i < groupsCount; i++) {
    targetGroup = groups.data[i].group;
    pCal = groups.data[i].privateCal;
    sCal = groups.data[i].sharedCal;
    targetList = groups.data[i].recipients;
    label = groups.data[i].label;
    prefix = labeler(label);
    targetWebhook = groups.data[i].webhook;

    targetGroups = containedGroups(targetGroup);
    automateGone(pCal, targetGroup, sCal, daysUpdate);
    reminderDaily(pCal, targetList, prefix, emailDuration);
    //notificationDaily(destinationCalName, targetWebhook);
  }
}

function labeler(label) {
  label != null ? label = label + " - " : label = "";
  return label;
}

// Rebuild the list of Groups displayed in the spreadsheet
function updateGroups() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetData = ss.getSheetByName("Sheet1")
    var header = ['Parent Group', 'Contained Groups'];
    sheetData.clear();
    sheetData.appendRow(header).setFrozenRows(1);
    for (var i = 0; i < groupsCount; i++) {
        targetGroup = groups.data[i].group;
        rows = generateGroupTree(targetGroup);
        for (j = 0; j < rows.length; j++) {
            rows[j] = [targetGroup, rows[j]];
        }
        if (rows.length > 0)
        {
            var Avals = ss.getRange("A1:A").getValues();
            var Alast = Avals.filter(String).length;
            var startRow = Alast + 1;
            sheetData.getRange(startRow, 1, rows.length, header.length).setValues(rows);
        }
    }
}
