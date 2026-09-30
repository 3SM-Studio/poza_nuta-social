# Identity model

Status: implementation contract. This supersedes approved decision 34 only where analytics consent exists.

## Levels

### Anonymous visitor

`pn_visitor` is a random UUID stored only after explicit analytics consent. It is a pseudonymous browser-context identifier, not a person, account, fingerprint, or device identifier. Proposed technical lifetime is 180 days and remains subject to human privacy/legal approval. A returning visitor is a valid visitor ID observed in a later session.

### Session

`pn_session` is a random UUID with approximately 30 minutes of inactivity semantics. It is first created when analytics consent is granted and then refreshed by the server proxy, so consented page views and immediate `/go` clicks share identity. No public analytics session exists before consent. Each consented session has independent acquisition even when linked to a returning visitor.

### Event

An event has an immutable UUID, session UUID, optional visitor UUID, server timestamp, per-session sequence, schema version, environment, traffic class, consent snapshot, observed context, attributed context, and event-specific properties.

## Token integrity

Visitor, session, exclusion, and test markers use server-issued HMAC tokens. A syntactically valid unsigned UUID is not sufficient to claim an existing identity or internal/test status. Invalid signatures do not enable tracking before consent; after consent, a fresh session may be created without retaining the forged value.

## Transitions

| Situation | Visitor | Session |
| --- | --- | --- |
| analytics denied | none | none |
| analytics granted first time | create visitor | create signed 30-minute session |
| return within 10 minutes | reuse visitor | reuse session |
| return after 45 minutes | reuse visitor | new session |
| next day/month within visitor lifetime | reuse visitor | new session |
| consent withdrawn | delete browser visitor token; future events stop | delete browser session and acquisition tokens |
| cookie deleted/incognito/new device | new or no visitor | new session |

Withdrawal stops future identity linking and external sinks immediately. Deletion/anonymization of already retained first-party data requires a separate reviewed policy and cannot be promised solely from a cookie UI.

## Limitations

- One human on two devices can be two visitors.
- Two humans sharing a browser can be one visitor.
- Cookie deletion/incognito creates a new context.
- In-app browsers commonly create separate contexts.
- A visitor ID must never be called a unique person.
