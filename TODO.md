# Runway Todo List

## Current Build Order

### Day 1

Status: complete on 2026-03-30

- set up `Vite + React + TypeScript` app shell
- add base layout, typography, and core design tokens
- define MVP data model types for `profile`, `money_snapshots`, `daily_checkins`, `career_entries`, and `weekly_reviews`
- implement local persistence layer for MVP data
- create first-time setup flow
- collect required setup fields:
  - unemployment start date
  - liquid cash
  - monthly burn
- collect optional setup fields:
  - panic threshold cash
  - target decision date
  - target monthly spend
  - snapshot date
  - fixed costs
  - note
- validate required setup inputs
- save setup state and route user into the app shell

### Day 2

Status: complete on 2026-03-30

- build Home page route
- implement dashboard sections:
  - header status
  - runway
  - career summary
  - experiments summary
  - signals
  - reflection
- calculate derived metrics for:
  - days unemployed
  - weeks since leaving
  - days until target decision date
  - runway months
  - panic threshold date
  - spending vs target
- create useful empty states for missing daily, career, and weekly data

### Day 3

Status: complete on 2026-03-30

- build Daily Check-In route
- add form for:
  - mood
  - self-trust
  - hours building
  - hours job-searching
  - exercise
  - meaningful thing
  - note
- enforce one entry per day
- calculate:
  - build streak
  - workout streak
  - 7-day mood average
  - latest self-trust
  - hours built this week
  - hours job-searching this week

### Day 4

Status: complete on 2026-03-30

- build Career Log route
- add career entry creation flow
- support entry types:
  - application
  - interview
  - networking conversation
  - role explored
  - company of interest
- show recent entries and weekly totals
- add quick-add entry action from Home

### Day 5

Status: complete on 2026-03-30

- build Weekly Review route
- add weekly review form
- surface:
  - latest weekly focus
  - latest reflection snippet
- connect weekly review data back into Home

### Day 6

Status: complete on 2026-03-30

- build Money route
- show latest money snapshot and baseline assumptions
- add edit flow for profile assumptions
- add new money snapshot flow
- improve empty states and inline editing

### Day 7

Status: complete on 2026-03-30

- polish layout and responsive behavior
- add seeded demo data for development
- harden calculations against missing data and edge cases
- review copy and form friction
- run final build verification

## Cross-Cutting Tasks

- define a date utility layer for week boundaries and countdown math
- define selectors for derived dashboard metrics
- keep forms lightweight and mobile-friendly
- keep required daily fields minimal
- avoid adding charts before the product proves useful

## Nice Next Features

- runway forecast chart
- habit streak history
- timeline / experiment log
- builder mode project tracker
- recurring theme summaries
- AI weekly recap

## Guardrails

- no auth in MVP
- no social features
- no bank integrations
- no complex analytics
- no AI coach in v1
- no category explosion
