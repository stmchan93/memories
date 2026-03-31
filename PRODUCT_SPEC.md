# Runway Product Spec

## Summary

**Working title:** Runway

**One-sentence vision:** A personal dashboard for navigating unemployment with more clarity, structure, and self-trust.

Runway is a personal tool for a single user managing a period of unemployment, sabbatical, or transition. It combines financial awareness, career exploration, lightweight habit tracking, and reflection into one daily-use product.

The product should answer one core question:

**Am I using this period well?**

Not by tracking everything, but by combining:

- objective metrics
- emotional signals
- reflection
- decision support

## Problem

Unemployment can feel ambiguous and slippery. Days blur together, financial anxiety spikes, job search activity becomes hard to evaluate, and personal experiments lose momentum without visible structure.

Most tools only solve one slice of the problem:

- budgeting apps show money, but not meaning
- habit trackers show streaks, but not direction
- job trackers show applications, but not fit or energy
- journals capture thoughts, but not momentum

Runway should bridge those gaps without turning into life-admin software.

## Product Principles

1. **Grounding first**
   The most important job is reducing uncertainty. Time and runway should be visible immediately.

2. **Low-friction daily use**
   Daily check-in must take under 2 minutes.

3. **Reflection with structure**
   The product should help the user notice patterns, not just collect numbers.

4. **Single-user by design**
   This is a personal tool first. No auth, no sharing, no collaboration in v1.

5. **Manual over integrated**
   Manual entry is acceptable for MVP if it keeps the product simple and reliable.

## Target User

The initial user is one person who:

- is unemployed, on sabbatical, or between roles
- wants visibility into money and time
- wants to treat the period as intentional exploration, not drift
- is testing whether building, product thinking, and self-directed work feel energizing

## Jobs To Be Done

When I am in a transition period, I want to:

- know how much time and financial runway I have left
- see whether I am making progress on career exploration
- track whether building and other experiments are energizing me
- reflect on what is giving or draining energy
- make weekly decisions with more clarity instead of reacting day to day

## MVP Goals

The MVP should let the user:

- understand current runway at a glance
- complete a daily check-in quickly
- review weekly patterns and make an intentional next-step decision
- track a small number of meaningful career and personal metrics
- maintain a lightweight record of notes and reflections

## Non-Goals

Do not build these in v1:

- account system or multi-user support
- social sharing
- bank integrations
- complex charts or analytics
- AI coaching
- heavy customization
- broad life tracking across too many categories

## MVP Scope

### Core Buckets

The MVP covers five buckets, with uneven depth by design:

1. **Time / countdown**
2. **Money / runway**
3. **Job / career exploration**
4. **Personal experiments**
5. **Reflection / meaning**

### What Matters Most In v1

The first version should emphasize:

- awareness
- momentum
- clarity
- self-trust

It should not try to become a full operating system for life.

## Information Architecture

The 1-week build should ship with five routes.

### 1. Home

Purpose: one-screen dashboard for the current state.

Sections:

- **Header status**
  - days unemployed
  - weeks since leaving
  - optional target decision countdown
- **Runway**
  - current cash
  - monthly burn
  - projected runway in months
  - optional panic threshold date
- **Career**
  - applications this week
  - interviews this week
  - networking conversations this week
  - roles explored this week
- **Experiments**
  - build streak
  - workout streak
  - hours built this week
  - hours job-searching this week
- **Signals**
  - 7-day average mood
  - latest self-trust score
  - number of check-ins in the last 7 days
- **Reflection**
  - today’s short note
  - latest weekly focus

Actions:

- start daily check-in
- add career entry
- update money snapshot
- start weekly review

### 2. Daily Check-In

Purpose: very lightweight daily entry.

Fields:

- date
- mood (1-10)
- self-trust (1-10)
- hours building
- hours job-searching
- did I exercise? (yes/no)
- did I do one meaningful thing? (yes/no)
- short note

Nice-to-have only if still simple:

- what gave me energy today?
- what drained me today?

Rules:

- one entry per day
- optimized for mobile and repeat use
- completion target under 2 minutes

### 3. Weekly Review

Purpose: force reflection and next-week intent.

Fields:

- week ending date
- what gave me energy this week?
- what drained me?
- what did I avoid?
- did building feel good?
- do I want more job search or more experimentation next week?
- what is this week’s focus?
- runway update note

Outputs shown on Home:

- latest weekly focus
- latest reflection snippet

### 4. Career Log

Purpose: keep job exploration intentional rather than vague.

Entry types:

- application
- interview
- networking conversation
- role explored
- company of interest

Fields:

- date
- type
- company
- role title
- energy after call or interaction (1-10, optional)
- aligned notes
- misaligned notes
- freeform note

Views:

- totals this week
- recent entries

### 5. Money

Purpose: keep financial reality visible without becoming budgeting software.

Fields:

- current liquid cash
- monthly burn
- optional target monthly spend
- optional major fixed costs
- panic threshold cash or date
- optional note

Actions:

- add money snapshot
- edit baseline assumptions

Outputs:

- current runway in months
- estimated panic threshold date
- spending vs target

## Core User Flows

### First-Time Setup

User enters:

- unemployment start date
- current liquid cash
- monthly burn
- optional panic threshold
- optional target decision date
- optional target monthly spend
- optional fixed costs
- optional note or snapshot date

Result:

- dashboard becomes immediately useful with calculated countdowns and runway

### Daily Use

1. User opens Home.
2. User sees runway, streaks, and today’s status.
3. User completes Daily Check-In in under 2 minutes.
4. User optionally logs a career event.

### Weekly Use

1. User opens Weekly Review at end of week.
2. User reviews trends from recent daily entries.
3. User answers prompts.
4. User sets next week’s focus.

## Data Model

The MVP data model should stay small and explicit.

### `profile`

Single-row table or document for app-level settings.

Fields:

- `id`
- `unemployment_start_date`
- `target_decision_date`
- `target_monthly_spend`
- `panic_threshold_cash`
- `created_at`
- `updated_at`

### `money_snapshots`

Used for current runway and future trend features.

Fields:

- `id`
- `snapshot_date`
- `liquid_cash`
- `monthly_burn`
- `fixed_costs`
- `note`
- `created_at`

Rule:

- latest snapshot is the source of truth for Home

### `daily_checkins`

Fields:

- `id`
- `date`
- `mood`
- `self_trust`
- `hours_building`
- `hours_job_searching`
- `did_exercise`
- `did_meaningful_thing`
- `note`
- `gave_energy_note` (optional)
- `drained_energy_note` (optional)
- `created_at`
- `updated_at`

Rule:

- one row per date

### `career_entries`

Fields:

- `id`
- `date`
- `type`
- `company`
- `role_title`
- `energy_after_call`
- `aligned_note`
- `misaligned_note`
- `note`
- `created_at`

### `weekly_reviews`

Fields:

- `id`
- `week_ending_date`
- `gave_energy`
- `drained_energy`
- `avoided`
- `did_building_feel_good`
- `next_week_balance`
- `weekly_focus`
- `runway_update_note`
- `created_at`

## Derived Metrics

These should be calculated, not manually entered.

### Time

- `days_unemployed = today - unemployment_start_date`
- `weeks_since_leaving = floor(days_unemployed / 7)`
- `days_until_target_decision = target_decision_date - today`

### Money

- `runway_months = liquid_cash / monthly_burn`
- `panic_threshold_date = date when cash reaches threshold based on latest snapshot`
- `spending_vs_target = monthly_burn - target_monthly_spend`

### Career

- `applications_this_week`
- `interviews_this_week`
- `networking_conversations_this_week`
- `roles_explored_this_week`

### Experiments

- `build_streak = consecutive days where hours_building > 0`
- `workout_streak = consecutive days where did_exercise = true`
- `hours_built_this_week = sum(hours_building over current week)`
- `hours_job_searching_this_week = sum(hours_job_searching over current week)`

### Signals

- `mood_7d_avg`
- `latest_self_trust`
- `checkins_last_7_days`

## Dashboard Content Spec

The Home page should answer these questions in order:

1. How long have I been in this period?
2. How much financial runway do I have?
3. Am I taking meaningful action?
4. How do I feel lately?
5. What am I trying to do this week?

If a module does not help answer one of those questions quickly, it should not be on the Home page.

## UX Requirements

- Mobile-first layout
- Dashboard must be useful without scrolling excessively on a laptop
- Daily check-in should be accessible in one tap from Home
- Data entry should prefer sliders, toggles, and short text over long forms
- Empty states should encourage entry rather than feel broken

## Visual/Product Direction

The tone should feel:

- calm
- clear
- grounded
- reflective

This is not a hustle app and not a finance terminal. It should balance utility with emotional honesty.

## Success Criteria For v1

The MVP is successful if it does these things well:

- user can complete first-time setup in under 5 minutes
- user can complete a daily check-in in under 2 minutes
- Home gives a clear answer on runway and momentum at a glance
- weekly review helps produce one concrete focus for the next week
- user wants to open the product daily for at least 2 consecutive weeks

## 1-Week Build Plan

### Day 1

- set up app shell
- implement data model
- create setup flow for profile and first money snapshot

### Day 2

- build Home page layout
- wire up derived metrics for time and money

### Day 3

- implement Daily Check-In form
- calculate streaks and 7-day averages

### Day 4

- implement Career Log
- add quick-add flows from Home

### Day 5

- implement Weekly Review
- surface weekly focus and reflection on Home

### Day 6

- add Money page
- handle empty states and editing flows

### Day 7

- polish UX
- test mobile and desktop
- seed realistic sample data
- fix edge cases around calculations and missing data

## Out Of Scope For MVP But Good Next Steps

- runway forecast chart
- habit streak history
- timeline or experiment log
- project tracker for builder mode
- richer recurring theme analysis
- weekly summary generation
- AI recap of patterns

## Risks

The biggest risk is over-building and turning this into a heavy personal admin tool.

Guardrails:

- keep the number of required daily fields small
- avoid category explosion
- prefer summaries over dashboards full of widgets
- add depth only after 2 weeks of real use

## Build Recommendation

This is a good personal product because it tests:

- whether the user enjoys building something for themselves
- whether they care about product and design decisions
- whether they actually use what they build
- whether the problem is compelling enough to keep iterating

Even if no one else uses it, the project succeeds if it improves awareness, momentum, clarity, and self-trust.
