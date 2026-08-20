# Tenant Architecture

## Core principle

One shared AI Automation Core Engine serves many independent business tenants. A tenant is a business/client account with its own identity, data, AI configuration, chatbot flow, automation rules and enabled modules.

```text
Shared Core Engine
  ├── Authentication
  ├── AI Agent runtime
  ├── Automation engine
  ├── CRM/Lead engine
  ├── Appointment engine
  ├── Analytics
  └── Integrations
          │
          ├── Tenant A → Real Estate → CRM + Chatbot + Appointments
          ├── Tenant B → Salon       → Chatbot + Appointments
          └── Tenant C → Clinic      → AI Receptionist + CRM + Appointments
```

## Tenant isolation

Every business has a stable `businessId`. Client authentication produces a token containing the tenant `businessId`, and protected business routes verify that the authenticated client owns the requested tenant. Business records also contain module entitlements so the same core can expose different product surfaces per client.

## Client identity

New tenants can have a dedicated `username` and password. `businessId` remains supported as a backwards-compatible login identifier for existing tenants. Passwords are stored as hashes; setup passcodes are one-time onboarding credentials.

## Module entitlements

Modules are configuration, not separate codebases. Examples:

- `website_chat`
- `ai_receptionist`
- `lead_capture`
- `lead_qualification`
- `lead_scoring`
- `crm`
- `appointment`
- `followup`
- `whatsapp`
- `instagram`
- `facebook`
- `voice_ai`
- `human_handoff`
- `analytics`
- `payment`
- `invoice`
- `review`
- `ai_reports`

The admin can enable/disable modules for an individual tenant. The client dashboard renders only the enabled product areas. This means a new feature can be added to the shared engine and enabled for selected clients without creating a separate application.

## Industry configuration

Industry/niche is separate from the core engine. A tenant can use an industry-specific question flow and later receive custom questions, knowledge, prompts, scoring rules or automation templates without changing the shared runtime.

## Safe feature development

Future feature work should follow this order:

1. Preserve the current working main commit.
2. Add a focused module/API/configuration layer.
3. Avoid changing unrelated CRM, chatbot or appointment behavior.
4. Add or update automated tests.
5. Validate existing flows and the new feature.
6. Merge only after the regression check passes.

Git history provides rollback to an earlier working commit when necessary.

## Future SaaS model

The long-term platform should support:

- Tenant-specific AI knowledge base
- Agent configuration and memory
- Custom CRM fields
- Custom chatbot questions
- Automation templates per industry
- Team members and roles
- Usage limits and billing entitlements
- Per-tenant integrations
- Tenant-level analytics

The core engine stays shared; tenant configuration determines what each client receives.
