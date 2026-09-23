# ADR-002: observed and attributed multi-level context

Date: 2026-09-20. Status: accepted.

## Decision

Store event observed context separately from event attributed context; keep immutable visitor-first and session-acquisition contexts plus session current/last touch. Use controlled channel/source/medium taxonomy and snapshot labels on events.

## Rationale and consequences

One overloaded source cannot explain request evidence, model responsibility, and historical edits. The richer model supports honest reporting and stable history at the cost of wider event rows. QR is a medium; the physical/distribution source is poster, flyer, table stand, or another controlled value.
