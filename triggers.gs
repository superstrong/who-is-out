/*
Functions:
updateCalendars: updates out of office calendars
notify: Sends the email digest and webhook event (if applicable)
updateGroups: Builds the flattened array of nested groups
*/

function updateCalendars() {
  var runStartTime = new Date();
  var groups = init();
  var count = groups.count;
  var backward = 0; // update the calendar starting this many days ago (default: 0)
  var calUpdate = 56; // update the calendar for this many days, starting from today or the past as determined by `backward`.
  var static = setStatic(groups, calUpdate, backward);
  
  for (var i = 0; i < groups.count; i++) {
    try {
      var active = setActive(groups, i);
      if (active.skip != true) {
        active.targetGroups = containedGroups(active.group);
      }
    
      updateSharedCalendars(static, active);
    
      for (var sc = 0; sc < active.share.length; sc++) {
        var calId = CalendarApp.getCalendarsByName(active.sCal)[0].getId();
        shareCalendar(calId, active.share[sc], "reader");
      }
    } catch (e) {
      MailApp.sendEmail(static.maintainer, "Error: Out of office failed on updateCalendars for " + active.group, e.message);
    }
  }
  var runEndTime = new Date();
  var runLength = (runEndTime - runStartTime) / 1000;
  var logMessage = "start: " + runStartTime + "\nend: " + runEndTime + "\nduration: " + runLength + " seconds.";
}

function notify() {
var groups = init();
var backward = 0;
var calUpdate = 14;
var static = setStatic(groups, calUpdate, backward);

for (var i = 0; i < groups.count; i++) {
  try {
    var active = setActive(groups, i);
    active.window = (active.window <= calUpdate) ? active.window : calUpdate;
    if (active.skip != true) {
      active.targetGroups = containedGroups(active.group);
    }
    
    sendEmails(static, active);
    
    if (active.webhook.length > 0) {
      sendWebhooks(static, active);
    }

  } catch (e) {
    MailApp.sendEmail(static.maintainer, "Error: Out of office failed on notify for " + active.group, e.message);
  }
}
}

function updateGroups() {
  
  try {
  
    /**
     * Builds a flattened array of a target group and all the groups and members it contains.
     * Necessary because the Admin Directory API only returns membership of a specific group,
     * not any groups contained by the target group.
     *
     * @param {string} group   The target group (email address)
     * @param {object} s  Static script properties
     *
     * @returns {aclResource}  See https://developers.google.com/google-apps/calendar/v3/reference/acl#resource
     */
    
    function generateGroupTree(group, s) {
      
      // Write the group membership data to script properties as a cache
      function putMemberTree(memberTree) {
        var scriptProperties = PropertiesService.getScriptProperties();
        scriptProperties.setProperties(memberTree);
      }
      
      function getGroupMembers(group, s) {
        var groupKey = group;
        var queryRows = [];
        var memberTree = {};
        var pageToken, page;
        do {
          page = AdminDirectory.Members.list(groupKey,
          {
            domainName: s.domainName,
            maxResults: 500,
            pageToken: pageToken,
          });
          var members = [];
          members = page.members;
          if (members)
          {
            for (var t = 0; t < members.length; t++)
            {
              var member = members[t];
              if (member.type === "GROUP") {
                var row = [];
                row = [member.email];
                queryRows.push(row);
              } else {
                // For each member, create a "[member]__[group] = true" key/value to be used as a cache
                // This is used by events.gs to check whether an event creator is a member of the active group
                memberTree[member.email+"__"+groupKey] = {};
                memberTree[member.email+"__"+groupKey] = true;
              }
            }
          }
          pageToken = page.nextPageToken;
        } while (pageToken);
        putMemberTree(memberTree);
        return queryRows;
      }
      
      var parent = group;
      var containedGroups = {};
      var toVisit = [group];
      while (toVisit.length > 0) {
        group = toVisit.pop();
        containedGroups[group] = true;
    
        groupMembers = getGroupMembers(group, s);
        for (w = 0; w < groupMembers.length; w++) { 
          email = groupMembers[w];
          toVisit.splice(toVisit.length, 0, email);
        }
      }
    
      var groups = [];
      for (var k in containedGroups) {
        if (containedGroups.hasOwnProperty(k)) {
          groups.splice(groups.length, 0, k);
        }
      }
      return groups;
    }
    
    var groups = init();
    var static = setStatic(groups);
    var memberCache = PropertiesService.getScriptProperties();
    memberCache.deleteAllProperties();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetData = ss.getSheetByName("Flattened Groups")
    var header = ['Parent Group', 'Contained Groups'];
    var rows = [];
    sheetData.clear();
    sheetData.appendRow(header).setFrozenRows(1);
    for (var i = 0; i < groups.count; i++) {
      var active = setActive(groups, i);
      if (active.skip !== true) {
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
  } catch (e) {
    MailApp.sendEmail(static.maintainer, "Error: Out of office failed on updateGroups", e.message);
  }
}