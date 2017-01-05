/*
Functions:
 hourly: runs automateGone to update next 7 days of Who is Out
 daily: runs automateGoneDaily to update next 90 days of Who is Out, then runs dailyReminder to send email digest

Triggers:
 hourly: run once an hour
 daily: run once a day
*/

var destinationCalName = "Out and Away"; // name of the calendar used to view Who is Out
var recipient = "everyone@yourdomain"; // send the digest to this address
var webhook = "https://hooks.zapier.com/foo/bar"; // send notification message to this endpoint

function hourly() {
  automateGone(destinationCalName);
}

function daily() {
  automateGoneDaily(destinationCalName);
  reminderDaily(destinationCalName, recipient);
  notificationDaily(destinationCalName, webhook);
}
