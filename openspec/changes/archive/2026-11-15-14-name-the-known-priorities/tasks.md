# Tasks

## 1. Name the known priorities

- [x] 1.1 Add a test named `[response-deadline] Refusing a priority the desk does not know` covering every row
  of the scenario's examples, and see it fail on the unknown rows because the message does not list the
  known priorities
- [x] 1.2 Make the refusal in `responseDueAt` name the priority given and the known priorities, from most to
  least urgent, taken from the same table the deadlines use, and update its doc comment; verify the test
  from 1.1 passes and `./build.sh` passes as a whole

## Workflow follow-up

- Archive the change once its build passes and the reviewer has seen it.
