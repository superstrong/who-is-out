function getGroupMembers(group) {
    var groupKey = group;
    var rows = [];
    var pageToken, page;
    do {
        page = AdminDirectory.Members.list(groupKey,
        {
            domainName: domainName,
            maxResults: 500,
            pageToken: pageToken,
        });
        var members = page.members;
        if (members)
        {
            for (var i = 0; i < members.length; i++)
            {
                var member = members[i];
                if (member.type === "GROUP") {
                    var row = [member.email];
                    rows.push(row);
                }
            }
        }
        pageToken = page.nextPageToken;
    } while (pageToken);
    return rows;
}

function generateGroupTree(group) {
    var containedGroups = {};
    var toVisit = [group];
    while (toVisit.length > 0) {
        group = toVisit.pop();
        containedGroups[group] = true;

        groupMembers = getGroupMembers(group);
        for (i = 0; i < groupMembers.length; ++i) {
            email = groupMembers[i];
            toVisit.push(toVisit.length, 0, email);
        }
    }

    var groups = [];
    for (var k in containedGroups) {
        if (containedGroups.hasOwnProperty(k)) {
            groups.push(groups.length, 0, k);
        }
    }
    return groups;
}
