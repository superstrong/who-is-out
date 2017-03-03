/*
Functions:
 hourly: runs automateGone to update next 7 days of Who is Out
 daily: runs automateGone to update next 30 days of Who is Out,
   then runs reminderDaily (email digest),
   then runs notificationDaily (chat notification)

Triggers:
 hourly: run once an hour
 daily: run once a day
*/

/*
"Groups" data format:
1. Group user belongs to
2. Secondary calendar used to aggregate events for this group
3. Distribution list for emailing the outage digest
4. Prefix for email digest subject line
5. (optional) Webhook for notifying today's human outages
*/
var groups = 
{"data":[
  {"group":"everyone@yourdomain","calendar":"Out and Away","list":"everyone+out@yourdomain","label":null,"webhook":"https://hooks.zapier.com/hooks/catch/foobar"},
  {"group":"management@yourdomain","calendar":"Out and Away (Management)","list":"management+out@yourdomain","label":"Mgmt"}
 ]};

var days;
var groupsCount = Object.keys(groups.data).length;
var targetGroup;
var targetCalendar;
var targetList;
var label;

function hourly() {
  days = 7; // update the calendar for next 7 days
  for (var i = 0; i < groupsCount; i++) {
    targetGroup = groups.data[i].group;
    targetCalendar = groups.data[i].calendar;
    
    automateGone(targetCalendar, targetGroup, days);
  }
}

function daily() {
  days = 30; // update the calendar for next month
  for (var i = 0; i < groupsCount; i++) {
    targetGroup = groups.data[i].group;
    targetCalendar = groups.data[i].calendar;
    targetList = groups.data[i].list;
    label = groups.data[i].label;
    prefix = labeler(label);
    targetWebhook = groups.data[i].webhook;

    automateGone(targetCalendar, targetGroup, days);
    reminderDaily(targetCalendar, targetList, prefix);
    notificationDaily(destinationCalName, targetWebhook);
  }
}

function labeler(label) {
  label != null ? label = label + " - " : label = "";
  return label;
}
