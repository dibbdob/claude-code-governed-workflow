# 0007 A team delivers the way Git works

Status: accepted

## Context

Until now the workflow assumed one person on one machine. Only one delivery could run at a time, anywhere in
the repository. Everything compared against the `main` on that machine, however old. Specification numbers
were "one more than the highest", and nothing was shared: no remote, no pull requests, no build anywhere
but the author's laptop.

With a team, several people deliver at once, and they need to know who is doing what. The first idea was
to claim a specification by creating its branch on the shared repository, which refuses a second claim.
That works, but it means nobody can start without a connection, and a branch quietly acting as a lock is
hard to explain. Git itself works the other way: do the work where you are, and settle disagreements when
you share it.

## Decision

- **Each delivery gets a folder of its own** (a Git worktree), made by `scripts/start-delivery.sh`. Several
  deliveries can run at once, by one person or many, without sharing half-finished files. Starting works
  offline.
- **The specification says what to build; its GitHub issue says who is building it.** A person marking a
  specification ready opens one issue for it and records it in the specification as `Issue: #<number>`.
  Whoever the issue is assigned to has the work.
- **One step assigns, and everything else only looks.** `scripts/claim-delivery.sh` is the only thing that
  puts a name on an issue. It assigns you if nobody has the issue, warns you and changes nothing if someone
  else does, says who to ask if you may not assign, and says so if GitHub cannot be reached. If two people
  claim in the same second and both land on the issue, claim says so and decides nothing; the pull
  request check refuses to merge until one person is left. Starting runs it when it can.
- **The checks are at the end, where Git checks everything.** `scripts/finish-delivery.sh` refuses to open
  the pull request unless the issue is the deliverer's alone. On GitHub, the `claimed` check refuses to let
  a delivery's pull request merge on the same terms, and the `build` check runs `./build.sh`. Branch
  protection on `main` requires both, and one approval from a person.
- **Comparisons use the team's main**: `origin/main` where there is a remote, as last fetched when offline,
  and the local `main` in a repository with no remote.
- **Clashing specification numbers are caught, not prevented.** The build fails when two specifications
  share a number, so whichever is merged second is renumbered.
- **Claude never pushes.** `git push` stays denied to it. The finish script pushes, after the build passes.
- **An unattended run can happen on GitHub.** Putting the label `deliver` on an issue runs the same delivery
  on GitHub's machines for the one person the issue is assigned to.

## Consequences

- Work can start anywhere, including offline. The price is that two people can, rarely, start the same
  specification, and one of them wastes some work. They find out at the latest when one tries to finish.
- People already understand "it's assigned to me". Nothing needs explaining.
- On GitHub, anyone who can push code can also assign issues; GitHub does not separate the two. A team that
  wants only leads to hand out work can make that its rule, and claim handles being refused, but GitHub
  will not enforce the rule by itself.
- A pull request opened with GitHub's own token starts no workflows, so unattended runs need a token for a
  bot account (the `DELIVERY_TOKEN` secret), and the `claimed` check needs that account's name (the
  `DELIVERY_BOT` variable) to accept pull requests it opens for someone else.
- Whoever can add the `deliver` label can spend API credit.
- The scripts are tested against a stand-in team: a shared repository on disk and a pretend `gh`. The real
  GitHub, the workflows and the branch protection have not yet been run.
