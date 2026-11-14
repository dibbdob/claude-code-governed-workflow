# Proposal

## Why

A customer who reports a security problem (a leaked password, someone else's data on their screen, a login
they did not make) gets the same priority as any other ticket, so the desk may not reply for three business
days while the problem goes on. Only an outage on the enterprise plan is urgent today; a security report
is not, on any plan.

## What Changes

- A ticket reported as a security problem is urgent, on every plan, and with no plan recorded.
- A security report that is also an outage is urgent too, on every plan. Until now an outage on a plan
  other than enterprise was high; it stays high when it is not a security report.
- Tickets that are not security reports keep the priority they have now.

## Capabilities

### New Capabilities

### Modified Capabilities
- `response-deadline`: the requirement "Priority follows what the customer reported" gains security
  reports as urgent, and its outage scenarios say that a security report takes precedence.

## Impact

`priorityOf` in `src/sla.js` and its tests. A security report is a ticket whose `category` is `security`,
alongside the categories `billing` and `question` the code already reads. Deciding that a ticket is a
security report from what the customer wrote is not part of this change. `responseDueAt` does not change:
an urgent ticket already has four business hours.

## Risk

Medium. It changes a priority, and so a deadline: if security reports are missed, a customer whose account
is compromised still waits days for a reply; if the rule is too wide, urgent tickets that are not urgent
push real ones back in the queue.
