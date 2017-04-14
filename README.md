# Who is Out

Invite out@yourdomain.com to your out-of-office calendar event (sick, vacation, off-site, etc.) to easily, automatically roll it to a shared calendar, email digest, and chat notification.

No more pestering your coworkers repeatedly about an upcoming vacation or forgetting to tell people about a doctor appointment because you "added it to your calendar" and forgot about it.

This Google Apps Script:

- Creates a shared calendar of who and when everyone will be out of office
- Emails your team a daily digest aggregating out-of-office time for the next few weeks
- Sends a daily notification to a webhook (i.e., Slack) of your choice with today's scheduled out-of-office time
- Does this **for as many distinct groups as you want.** Use one for a small company, or break things out into teams and functional groups.
    - Matches users who are indirect/nested group members of the parent group (e.g., "group" -> "subgroup" -> "user")

## Usage

Just invite the new `out@<yourdomain.com>` user to your event and it will show up on the shared calendar and in the digest. For the digest, the title of the event will be replaced by a generic description based on keywords in the title, such as `working remote`, `sick/doctor`, `event/conference/meeting`, etc. -- whatever you want.

![Email example](http://dropshare-superstrong.s3.amazonaws.com/0PeLfQHoqf8e8z/Screen-Shot-2017-04-12-at-9.44.30-PM.png)

![Webhook example](http://dropshare-superstrong.s3.amazonaws.com/dv4d7WdWZSm8j8/Screen-Shot-2017-04-12-at-9.45.51-PM.png)

## Installation

### As a G Suite admin
- Go to the [developer console](https://console.developers.google.com) and enable the following APIs: **Admin SDK**, **Google Calendar API**
- Log in to the [admin console](https://admin.google.com) and create a new user, such as `out@<yourdomain>`
- Give the user elevated privileges. Create a new role (e.g., `Calendar Reader`) and give it **Read** access to `users`, `organization units`, and `groups`. Apply this role to the new user.

### As the new user
- Copy [this Sheet](https://docs.google.com/spreadsheets/d/17jFYPIpLOCNBJOKdDi1ej9i7ZkUhdYcvEq_eBqFZ6NU/edit?usp=sharing) and save to `My Drive`
- Share it with yourself (your real email address) with full write access so you can access it easily in the future
- Recommended: Protect the `Instructions`, `Setup`, and `Flattened Groups` tabs so others don't mistakenly overwrite them
- Add your email address to `A1` in the `Setup` tab
- For each group that wants to use this, fill out the rows in the `Groups` tab. You can do it yourself or share with others.
    - Recommended: For testing purposes, set the `Email Recipients` and `Share Calendar With` values in the `Groups` tab (columns D and E) to your own email address until you are ready to set it loose.

- Open Tools -> Script editor...
- In your script project, open Resources -> Cloud Platform Project...
- An overlay will say "This script is currently associated with project:" ... click the link. If there is no link, give the project a name first, then click the resulting link.
- Search for and enable the following API: **Admin SDK**

Close out of this to return to your script project. 

- Open Resources -> Advanced Google services...
- Enable `Admin Directory API` and `Calendar API`
- Click OK

*Now we can create the script.*

- Create this empty script (File -> New -> Script file): `ooo.gs`. Copy/paste the contents from that file in this repo to your new script, completely overwriting the default `myFunction` code in your new script.

#### Run the triggers
- Run `updateGroups` (Run -> updateGroups). This will aggregate all the subgroups contained by the desired (parent) groups, which will then be used to match users with the parent group even if they are indirect members (members of subgroups). If you are prompted for permission to execute the script, you should approve.
- Run `update`. This will update all private and shared calendars. Approve any requested permissions.
- Run `updateAndNotify`. This will update all calendars, send the email digest(s), and trigger the webhook(s) if applicable. Approve any requested permissions.

Once you feel like everything is working, you can set it loose.

### Set to autopilot
- Create an hourly trigger for `update`
- Create a daily trigger for `updateAndNotify`. This is commonly set to first thing on a weekday, such as between 7-8am. Even if you trigger it every day, default values in the `Setup` tab and group-specific overrides in the `Groups` tab will actually control whether the emails and webhooks are sent.
- Create a daily trigger for `updateGroups`. It makes sense to set this for after close of business but before the daily `updateAndNotify` job runs -- such as 3-4am.

## TODO
- Make multiday partialday events work properly. Currently an event such as 12:30pm Monday to 10:30am Tuesday will show up on both Monday and Tuesday stating that it runs from 12:30pm-10:30am (huh?)

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :)

Currently, `ooo.gs` is a concatenation of separate scripts generated by executing the following terminal command locally from the root of project folder:
- `cat scripts/*.gs >> tmp; mv tmp ooo.gs`

## History

Inspired by a daily digest we had at Cover in NYC (RIP). Upgraded through experience at [frame.ai](https://frame.ai) and discussions with other startup employees who use it.

## Credits

The foundation for this project was two old scripts cobbled together:

- events.gs is based on [Google Apps Script Vacation Calendar](https://github.com/sobodda/Google-Apps-Script-Vacation-Calendar) by Stephanie Obodda
- digest.gs is based on [Daily Digest](https://ctrlq.org/code/19961-google-calendar-agenda-email) by [Amit Agarwal](https://github.com/labnol)

## License

[MIT License](https://opensource.org/licenses/MIT)
