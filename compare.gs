function containedGroups(group) {
  var parent = group;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetData = ss.getSheetByName("Flattened Groups")
  var Avals = ss.getRange("A1:A").getValues();
  var Alast = Avals.filter(String).length;
  var endRow = Alast - 1;
  var fullRange = "A2:B" + Alast;
  var allGroups = ss.getRange(fullRange).getValues();
  var matchedGroups = [];
  for (var i = 0; i < allGroups.length; i++) {
    if (allGroups[i][0] === parent) {
      matchedGroups.push(allGroups[i][1]);
    }
  }
  return matchedGroups;
}

function getUserGroups(user) {
    var userKey = user;
    var rows = [];
    var pageToken, page;
    do {
        page = AdminDirectory.Groups.list(
        {
            domainName: domainName,
            pageToken: pageToken,
            userKey: userKey
        });
        var groups = page.groups;
        if (groups)
        {
            for (var i = 0; i < groups.length; i++)
            {
                var group = groups[i];
                  var row = [group.email];
                  rows.push(row);
            }
        }
        pageToken = page.nextPageToken;
    } while (pageToken);
    return rows;
}

function compareArrays(target, toMatch) {
    var found, targetMap, i, j, cur;

    found = false;
    targetMap = {};

    // Put all values in the `target` array into a map, where
    //  the keys are the values from the array
    for (i = 0, j = target.length; i < j; i++) {
        cur = target[i];
        targetMap[cur] = true;
    }

    // Loop over all items in the `toMatch` array and see if any of
    //  their values are in the map from before
    for (i = 0, j = toMatch.length; !found && (i < j); i++) {
        cur = toMatch[i];
        found = !!targetMap[cur];
        // If found, `targetMap[cur]` will return true, otherwise it
        //  will return `undefined`...that's what the `!!` is for
    }
    return found;
};

function compare(parents, user) {
  var userGroups = [];
  userGroups = getUserGroups(user);
  var match = compareArrays(parents, userGroups);
  return match;
}