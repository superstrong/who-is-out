# Who is Out

No more pestering your coworkers repeatedly about an upcoming vacation or forgetting to tell people about a doctor appointment because you "added it to your calendar" and forgot about it.

This set of Google Apps Scripts:

- Automatically creates an shared calendar of who and when everyone will be out of office
- Emails your team a daily digest aggregating out-of-office time for the next few weeks
- Sends a daily notification to a webhook of your choice with today's scheduled out-of-office time -- e.g., ping a [Zapier](https://zapier.com) webhook, relay it to [Slack](https://slack.com)
- Does this **for as many distinct groups as you want.** Use one for the whole company, or break things out into functional groups.
    - Matches users who are indirect/nested group members of the parent group (e.g., "group" -> "subgroup" -> "user")

## Usage

Just invite the new `out@<yourdomain.com>` user to your event and it will show up on the shared calendar and in the digest. For the digest, the title of the event will be replaced by a generic description based on keywords in the title, such as `working remote`, `sick/doctor`, `event/conference/meeting`, etc. -- whatever you want.

![Screenshot](http://dropshare-superstrong.s3.amazonaws.com/XfBD5oLxNGgcJR/Screen-Shot-2016-12-16-at-9.55.43-PM.png)

## Installation

### As a G Suite admin
- Go to the [developer console](https://console.developers.google.com) and enable the following APIs: **Admin SDK**, **Google Calendar API**
- Log in to the [admin console](https://admin.google.com) and create a new user, such as `out@<yourdomain>`
- Give the user elevated privileges. Create a new role (e.g., `Calendar Reader`) and give it **Read** access to `users`, `organization units`, and `groups`. Apply this role to the new user.

### As the new user
- For each group that wants to use this, create two secondary calendars: one to aggregate events, used only for the email digest and not shared (e.g., "ooo - eng", "ooo - mgmt"), and a friendly looking one that will have a copy of everyone's specific OOO events and can be shared back with the group (e.g., "Out and Away", "Out and Away (Eng)", "Out and Away (Mgmt)", etc.
- Create a new Google Sheet (name doesn't matter), then open Tools -> Script editor...
- In your script project, open Resources -> Cloud Platform Project...
- An overlay will say "This script is currently associated with project:" ... click the link. If there is no link, give the project a name first, then click the resulting link.
- Enable the following API: **Admin SDK**

Close out of this to return to your script project.

- Open Resources -> Advanced Google services...
- Enable Admin Directory API and Calendar API
- Click OK

Now we can create the scripts.

- Create each of these empty scripts (File -> New -> Script file): `events.gs`, `digest.gs`, `trigger.gs`, `groups.gs`, `compare.gs`, and (optionally) `notification.gs`. Copy/paste the contents from here to there, completely overwriting the default myFunction code.
- In `trigger.gs`, update the `data` configuration and `domainName` variable. Optionally, change the defaults on `daysUpdate` and `emailDuration`.
    - Note: Set the `list` value to something you can test with, such as your own email address
    - Note: Set the webhook to something you can test with. If you are not using the webhook, comment out `notificationDaily` from `daily()`

#### Configuration data format
    1. Group the user must belong to
    2. Secondary calendar used to aggregate outage events for this group
    3. Distribution list for emailing the outage digest
    4. Prefix for email digest subject line
    5. (optional) Webhook for notifying today's human outages

- In `digest.gs`, replace the `maintainer` and `timezone` variables with your desired values.
- In `trigger.gs`, run `hourly()` and `daily()` manually. This will cause them to prompt you for permission, which you should approve.
- Make sure a `Sheet1` exists in your Sheet, or change the relevant value for `sheetData` in `trigger.gs`.

Once you feel like everything is working, you can set it loose.

### Set to autopilot
- Replace the `list` values in `trigger.gs` with your desired distribution addresses.
- Create an hourly trigger for `hourly()`
- Create a daily trigger for `daily()`. Even if you trigger it every day, by default the digest will not run on Saturdays, and the chat notification will not run on Saturdays or Sundays.
- Create a daily trigger for `updateGroups()`. This will aggregate all the subgroups contained by the target groups in the `Sheet1` tab, which will then be used by `compare()` to match users with the target group even if they are indirect members (members of subgroups).

## TODO
- Refactor the config so the user-defined variables are by themselves in a script
- Consider using more of the spreadsheet itself for config values
- Refactor the code everywhere to be less awful now that I am learning about how JS should be written
- Refactor the syntax to be consistent (clean up the copy/paste sloppiness)

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :)

## History

Inspired by a daily digest we had at Cover in NYC (RIP). Upgraded through experience at [frame.ai](https://frame.ai) and discussions with other startup employees.

## Credits

The foundation for this project was two old scripts cobbled together:

- events.gs is based on [Google Apps Script Vacation Calendar](https://github.com/sobodda/Google-Apps-Script-Vacation-Calendar) by Stephanie Obodda
- digest.gs is based on [Daily Digest](https://ctrlq.org/code/19961-google-calendar-agenda-email) by [Amit Agarwal](https://github.com/labnol)

## License

[MIT License](https://opensource.org/licenses/MIT)
