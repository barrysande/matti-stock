# System Flows

This directory contains implementation-aligned workflow diagrams for developers.
Each feature owns one focused Markdown file that traces its interfaces, API
controllers, services, background work, state decisions, and user-visible
outcomes.

## Conventions

- Use Mermaid for version-controlled diagrams that render in common repository
  viewers and can be transformed into simpler onboarding or demonstration
  material.
- Name controller steps as `controller.<ControllerName>.<method>`.
- Name service steps as `service.<ServiceName>.<method>`.
- Use equivalent prefixes for other implementation participants, such as
  `job.<JobName>.<method>` and `mail.<MailName>.<method>`.
- Keep user-visible copy and outcomes separate from internal audit and security
  details.
- Include rejected and no-op paths when they are important to security, data
  integrity, or user support.
- End each feature file with a user-flow derivation section that identifies what
  may be simplified without changing the underlying behavior.

## Feature flows

- [Password reset and initial setup](./password-reset-flows.md)
