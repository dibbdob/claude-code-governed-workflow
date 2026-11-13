# Proposal

## Why

The desk is closed on public holidays, but the deadline rules count them as business hours, so a ticket
opened before a holiday is shown as overdue when nobody could have answered it.

## What Changes

- Deadline calculations accept a list of public holidays and skip them like weekends.
- With no list of holidays, deadlines are computed exactly as before.

## Capabilities

### New Capabilities

### Modified Capabilities
- `response-deadline`: public holidays stop counting as business hours.

## Impact

`src/sla.js` and its tests. Callers that pass no holidays see no change.

## Risk

Medium. It changes when customers are told a reply is due: a holiday skipped on the wrong day would show
tickets as on time when they are late, or late when they are on time.
