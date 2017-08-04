/**
 * See full documentation at github.com/superstrong/who-is-out
 *
 * Refer to triggers.gs. Create three triggers (Edit -> Current project's triggers):
 * 1. updateGroups: trigger once/day when there's minimal activity. e.g., 2-3am
 * 2. updateCalendars: trigger as often as you want to update the shared calendars. e.g., every hour
 * 3. notify: trigger once/day to attempt email and webhook notifications.
 *    Note: The default settings and group overrides decide whether to actually send the notifications
 */