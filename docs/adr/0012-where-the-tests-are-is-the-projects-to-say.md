# 0012 Where the tests are is the project's to say

Status: accepted

## Context

The build fails when a scenario has no test naming it ([ADR 0006](0006-specs-are-openspec-changes.md)).
`tools/specs.mjs` found those tests by reading `test/*.test.js` for `test('[capability] Scenario name')`,
which is this repository's layout. `adopt.sh` copies the checker into other projects as it is, so a project
whose tests are xUnit, Go or pytest failed the check on its first build, and the only fix was editing a file
that the next `adopt.sh` would then list as differing. `/deliver` collected the reviewer's citations with a
`git grep` over `test/`, which has the same assumption.

## Decision

- **The project says where its tests are, in `scripts/test-citations.json`.** The folders (`dirs`), the
  endings of the file names (`suffixes`), and how a title is found: a named `style`, or a `pattern` of its
  own with the named groups `capability` and `scenario`. With no file, the checker reads this repository's
  layout, so a project that adopted it before keeps working.
- **Two styles, not one per framework.** `node-test` is a title given to `test()` or `it()`. `quoted` is any
  quoted string that starts with the citation, which covers xUnit's `DisplayName`, Go's `t.Run`, a pytest
  docstring and most others. A framework that needs more gets a `pattern`.
- **The config is refused rather than guessed at.** An unknown key or style, both a style and a pattern, a
  pattern without its groups, and a folder that does not exist each fail the build. Read as no tests, a
  missing folder would look like a project that tests nothing.
- **One reader of the tests.** `node tools/specs.mjs citations` lists each citation as
  `file:line: [capability] scenario`, and `/deliver` gives that to the reviewer, so the build and the review
  read the tests the same way.

## Consequences

- `adopt.sh` adds `scripts/test-citations.json` as a starting point and never replaces the project's own.
- `quoted` will count a quoted string that is not a test's title, such as one in a test of the checker
  itself. That shows as a test naming a scenario no spec has, which fails loudly; a project that hits it
  narrows `suffixes` or writes a `pattern`.
- A citation is still a title, not a check that the test exercises the scenario. The reviewer judges that
  ([ADR 0003](0003-the-reviewer-is-not-told-why.md)).
