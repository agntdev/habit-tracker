# Habit Tracker Bot — Bot specification

**Archetype:** workflow

**Voice:** warm and encouraging — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that helps users build habits and maintain streaks by tracking daily check-ins, calculating streaks, celebrating milestones, and sending gentle reminders at scheduled times in the user's local timezone.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Individuals building personal habits
- People who want gentle habit tracking
- Users who value streaks and milestones

## Success criteria

- Users can create habits with configurable frequency and schedules
- Check-ins are recorded with timestamps and status
- Streaks are calculated and displayed correctly
- Milestones are celebrated with emoji messages
- Weekly recaps are generated and sent
- Reminders are delivered at scheduled times in user's local timezone
- Users can edit, skip, and pause habits
- Completion rates are calculated and displayed

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu and welcome message
- **/habits** (command, actor: user, command: /habits) — List all habits with current streaks
- **/add** (command, actor: user, command: /add) — Create a new habit with frequency/time settings
- **/edit** (command, actor: user, command: /edit) — Edit an existing habit's settings
- **/skip** (command, actor: user, command: /skip) — Mark today's habit check-in as skipped
- **/done** (command, actor: user, command: /done) — Mark today's habit check-in as done
- **/stats** (command, actor: user, command: /stats) — View completion rate and streak history
- **/recap** (command, actor: user, command: /recap) — View weekly summary of completed/skipped/missed days
- **Check in** (button, actor: user, callback: habit:checkin) — Mark today's habit check-in
  - inputs: habit_id
  - outputs: check-in status updated
- **Edit** (button, actor: user, callback: habit:edit) — Edit habit settings
  - inputs: habit_id
  - outputs: habit settings updated
- **Pause** (button, actor: user, callback: habit:pause) — Pause the habit
  - inputs: habit_id
  - outputs: habit paused
- **Unpause** (button, actor: user, callback: habit:unpause) — Unpause the habit
  - inputs: habit_id
  - outputs: habit unpaused
- **Delete** (button, actor: user, callback: habit:delete) — Delete the habit
  - inputs: habit_id
  - outputs: habit deleted

## Flows

### Create Habit
_Trigger:_ /add

1. User enters habit name
2. User selects frequency (daily/weekday-specific/times-per-week)
3. User sets scheduled time
4. User confirms habit creation
5. Habit is saved with default settings

_Data touched:_ Habit, User

### Check-in Habit
_Trigger:_ Inline button or /done

1. User selects habit
2. System records check-in with timestamp and status
3. Streak is recalculated
4. Milestone is checked and celebrated if reached

_Data touched:_ Check-in, Streak, Habit

### Edit Habit
_Trigger:_ /edit

1. User selects habit
2. User modifies frequency, time, or pause status
3. Habit is updated

_Data touched:_ Habit

### Weekly Recap
_Trigger:_ /recap

1. System calculates 7-day completion data
2. Recap is generated and sent to user

_Data touched:_ Check-in, Habit

### Reminder Delivery
_Trigger:_ Scheduled time in user's local timezone

1. System checks for habits scheduled at current time
2. Reminder message is sent to user
3. User can check-in directly from reminder

_Data touched:_ Habit, Check-in

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user with habit tracking preferences
  - fields: user_id, timezone, notification_settings, created_at
- **Habit** _(retention: persistent)_ — User-defined habit with frequency and schedule
  - fields: habit_id, user_id, name, frequency, scheduled_time, timezone, active, created_at, updated_at
- **Check-in** _(retention: persistent)_ — Daily habit completion record
  - fields: checkin_id, user_id, habit_id, date, status, timestamp
- **Streak** _(retention: persistent)_ — Current and longest streak counts for a habit
  - fields: streak_id, user_id, habit_id, current_streak, longest_streak, completion_rate, last_updated
- **Milestone** _(retention: persistent)_ — Celebrated streak milestones
  - fields: milestone_id, user_id, habit_id, days, celebrated_at

## Integrations

- **Telegram** (required) — Bot API messaging and notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Pause/unpause habits
- Edit habit frequency and schedule
- Delete habits
- View completion statistics
- Reset streaks (if needed)
- Configure notification settings

## Notifications

- Daily reminder at scheduled time in user's local timezone
- Milestone celebration messages (7/14/30/100+ day streaks)
- Weekly recap sent automatically

## Permissions & privacy

- User data stored locally per user
- No cross-user data sharing
- Timezone auto-detected from Telegram
- Check-in data private to user
- Streak calculations private to user
- No analytics or tracking beyond personal habit data

## Edge cases

- User changes timezone after habit creation
- User skips multiple days in a row
- User checks in multiple times on same day
- User creates habit with invalid frequency
- User tries to check-in before habit start date
- Reminder delivery fails due to Telegram issues
- User deletes habit with existing check-ins
- User pauses habit and resumes later
- Timezone change affects scheduled reminder time
- User creates habit with same name as existing habit

## Required tests

- Create habit with daily frequency
- Create habit with weekday-specific frequency
- Create habit with times-per-week frequency
- Check-in habit and verify streak calculation
- Skip habit and verify streak breaks
- Edit habit frequency and time
- Pause and unpause habit
- Delete habit
- Generate weekly recap
- Verify reminder delivery in user's timezone
- Test milestone celebration at 7/14/30/100+ days
- Test check-in deduplication (multiple taps same day)
- Test timezone handling when user changes timezone
- Test reminder delivery when user is in different timezone

## Assumptions

- Reminder delivery is via Telegram push notifications only
- Timezone is auto-detected from user's Telegram settings
- One check-in per habit per day with deduplication
- Streaks break on skipped days
- Milestones are celebrated with emoji messages
- All user data is stored locally per user
- Frequency options include daily, weekday-specific, and times-per-week
- Default frequency is daily
- Default reminder time is 9:00 AM in user's local timezone
- Default timezone is user's Telegram timezone
- Completion rate is calculated as completed / (completed + skipped + missed) × 100
- Weekly recaps show 7-day grid with done/skipped/missed status
