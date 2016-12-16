/*
Functions:
 hourly: runs automateGone to update next 7 days of Who is Out
 daily: runs automateGoneDaily to update next 90 days of Who is Out, then runs dailyReminder to send email digest

Triggers:
 hourly: run once an hour
 daily: run once a day
*/

// name of the calendar used to view Who is Out
// e.g., "Out and Away"
var destinationCalName = "[[name of calendar]]";

// Send the digest to this address
var recipient = "[[everyone@yourdomain]]";

function hourly() {
  automateGone(destinationCalName);
}

function daily() {
  automateGoneDaily(destinationCalName);
  reminderDaily(destinationCalName, recipient);
}
