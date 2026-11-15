# Delivering a change

`/deliver` builds an approved change on a branch of its own and stops at a pull request description. A person
opens and merges the pull request.

## On GitHub

Before adding the label, check the issue is labelled `ready`. Nothing stops two deliveries of the same
change, so assign the issue to yourself first.

1. Add `deliver` to the issue. If there is no approved change for it, the run fails at once, in the Actions
   tab.
2. Claude builds the change on a `deliver/…` branch and keeps a progress comment on the issue.
3. When it finishes, **you open the pull request** from the *Create PR* link in the comment. The link fills in
   only the start of the description, so paste the full one from the comment as the body.
4. The `build` check runs, and a person reviews and merges.

A run stops at $1.50 or 60 turns, and its branch keeps whatever it committed. Remove and re-add the label,
or finish it on your machine.

## On your machine

This runs under your Claude login, so a subscription's own limits apply instead of a dollar cap. A set
`ANTHROPIC_API_KEY` takes precedence and bills the API, so check it is not:

```bash
echo ${ANTHROPIC_API_KEY:+"API key set: this run will bill the API"}   # prints nothing on a subscription
```

**Unattended**, from a clean, up-to-date `main`:

```bash
./scripts/agent.sh 57                              # the change for issue 57
./scripts/agent.sh 57 --model claude-opus-5-5      # the same, on another model, for one run
```

It makes the branch, runs the delivery, then checks what it left: nothing uncommitted, the change archived,
the build passing. You push the branch and open the pull request.

**Attended**, to watch or steer:

```bash
git switch -c deliver/57-bank-holidays
claude                                             # then: /deliver 57-bank-holidays
```

You are asked to confirm the intent of any reworded requirement. Sessions are denied `git push`, so it tells
you when the branch is ready.

## What to check in the pull request

- **Changed since approval:** requirements the delivery reworded. Ask the spec author to confirm the intent is
  the same before merging.
- **Archive:** nothing checks this on a GitHub run. Confirm `openspec/changes/<change>` moved to `archive/`.
- **Review findings:** points the reviewer left for a person to judge.
- **Tasks:** the Delivery group's four tasks, each ticked with what it found.

## After the merge

Completed work stays in the project. The change itself, with its proposal, tasks and the record of each
step, is kept in `openspec/changes/archive/`, in a folder dated the day it was delivered. Its requirements
are folded into `openspec/specs/`, which always says how the system works now.

What the delivery does, step by step, is in [How it works](../how-it-works.md).
