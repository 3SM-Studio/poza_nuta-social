# Identity model

Status: implementation contract. This supersedes approved decision 34 only where analytics consent exists.

## Levels

### Anonymous visitor

`pn_visitor` is a random UUID stored only after explicit analytics consent. It is a pseudonymous browser-context identifier, not a person, account, fingerprint, or device identifier. Proposed technical lifetime is 180 days and remains subject to human privacy/legal approval. A returning visitor is a valid visitor ID observed in a later session.

### Session

`pn_session` is a random UUID with approximately 30 minutes of inactivity semantics. It is created early by the server proxy so the page view and an immediate `/go` click share identity. Without analytics consent it remains session-scoped and is not linked across sessions. Each session has independent acquisition even when linked to a returning visitor.

### Event

An event has an immutable UUID, session UUID, optional visitor UUID, server timestamp, per-session sequence, schema version, environment, traffic class, consent snapshot, observed context, attributed context, and event-specific properties.

## Token integrity

Visitor, session, exclusion, and test markers use server-issued HMAC tokens. A syntactically valid unsigned UUID is not sufficient to claim an existing identity or internal/test status. Invalid signatures create a fresh external session and are recorded only as an aggregate quality reason, never with the forged value.

## Transitions

| Situation | Visitor | Session |
| --- | --- | --- |
| analytics denied | none | new/reused signed 30-minute session |
| analytics granted first time | create visitor | attach current session at next ingest |
| return within 10 minutes | reuse visitor | reuse session |
| return after 45 minutes | reuse visitor | new session |
| next day/month within visitor lifetime | reuse visitor | new session |
| consent withdrawn | delete browser visitor token; future sessions unlinked | current session may continue without visitor link |
| cookie deleted/incognito/new device | new or no visitor | new session |

Withdrawal stops future identity linking and external sinks immediately. Deletion/anonymization of already retained first-party data requires a separate reviewed policy and cannot be promised solely from a cookie UI.

## Limitations

- One human on two devices can be two visitors.
- Two humans sharing a browser can be one visitor.
- Cookie deletion/incognito creates a new context.
- In-app browsers commonly create separate contexts.
- A visitor ID must never be called a unique person.
