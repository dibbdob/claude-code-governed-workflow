# Refining a change

`/refine` turns an issue into an approved specification with the person who raised it. They need to know
nothing of OpenSpec, git or the code: they answer questions about the product and give worked examples. The
result is the specification's own pull request, and merging it is the approval.

## Run it

**In a session**, on the author's own Claude plan:

```text
/refine 57
```

The author answers as they go, and nothing is published until they are happy. Publishing is one script,
`scripts/refinement.sh publish 57`, which pushes the `refine/57-…` branch and opens the pull request. To
answer review comments, run `/refine 57` again.

**On GitHub**, with nothing but a browser:

1. Write the issue in plain words and add the `refine` label.
2. Claude drafts the change from the issue alone, writing down each assumption and numbering its questions.
   Claude's comment has the questions, and a second comment links to the spec pull request. **The author
   opens it** from that link, with the title and description already filled in.
3. The author answers on the pull request, mentioning `@claude`:
   *"@claude Q1 yes. Q2 bank holidays count as closed days."* Each comment is another run, which revises the
   change and replies. Each run spends API credit, capped at $1.00 and 40 turns.
4. The developer reviews in the same thread, then approves and merges.

A refinement started one way can be carried on the other.

## Before you approve

- *In plain terms* says what will be true afterwards, in words the product's users would recognise.
- The risk is stated, with a reason. Medium or high has a design and a task for it.
- The examples are the author's own. Claude flags any it added itself, so check the author agreed to each.
- The awkward case has its own row: the boundary that is easiest to get wrong.
- *Open questions* says "None". A question left open is decided by whoever delivers it.
- The `build` check passes.

## After the merge

The issue is labelled `ready` and a summary of the change is written below the brief, taken from the change
itself. From here the developer builds to the specification and does not renegotiate it. A requirement may be
reworded during delivery only while its intent holds, and each rewording is listed first in the code pull
request: **the author should read that section** before it merges. If the intent would change, delivery stops
and a new issue is refined.
