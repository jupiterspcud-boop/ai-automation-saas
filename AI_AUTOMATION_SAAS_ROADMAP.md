# AI Automation SaaS — Product Roadmap

## Product boundary

This repository is the **AI Automation SaaS Platform**. Client websites such as **VoxBridge** are external customer/demo websites that consume the platform's embeddable tools; they are not the SaaS product itself.

## Target product

A multi-tenant platform with **one shared AI Automation Core Engine**. Each business/client is a tenant with its own login, data, AI configuration, chatbot flow, automations and enabled modules. The same core engine serves different industries without creating separate applications.

## Required platform layers

1. **SaaS control plane**
   - Admin/agency account
   - Business/tenant onboarding
   - Tenant isolation
   - Client username/password
   - Packages/plans and module entitlements
   - Team members and roles
   - Settings, audit log and usage limits

2. **Automation engine — core differentiator**
   - Event triggers
   - Conditions/filters
   - Actions
   - Execution history
   - Retry/error handling
   - Scheduled/delayed actions
   - Human handoff
   - Reusable automation templates

3. **AI layer**
   - Tenant-specific business knowledge/context
   - AI receptionist/chat agent
   - Question vs answer classification
   - Multilingual/Tanglish support
   - Safe answers grounded in tenant data
   - Conversation memory
   - Human escalation

4. **CRM and lead engine**
   - Lead capture from every channel
   - Lead scoring
   - Pipeline/status
   - Tags/custom fields
   - Conversation history
   - Tasks/follow-ups
   - Lead assignment

5. **Omnichannel layer**
   - Website widget
   - WhatsApp
   - Instagram/Facebook
   - Email
   - SMS
   - Voice/phone
   - Webhooks/API
   - Shared conversation identity across channels

6. **Appointments**
   - Availability rules
   - Booking/cancel/reschedule
   - Reminders
   - Staff calendars
   - Calendar provider integrations

7. **Analytics**
   - Leads, conversations and appointments
   - Automation runs/success/failure
   - Conversion funnel
   - Channel performance
   - AI usage/cost
   - Client-level and agency-level reporting

8. **Billing**
   - Starter/Growth/Pro/Enterprise entitlements
   - Subscription status
   - Usage metering
   - Invoices/payments
   - Upgrade/downgrade/cancel

9. **Production foundation**
   - PostgreSQL instead of JSON storage
   - Secrets/config management
   - Secure cookies/token strategy
   - Rate limiting
   - Validation and authorization on every tenant route
   - Audit logging
   - Backups and migrations
   - Error monitoring
   - Automated tests and deployment checks

## Current state

### Already present

- Multi-tenant business records
- Shared core Express application serving all tenants
- Admin and client authentication flow
- Client usernames with backwards-compatible Business ID login
- One-time client setup passcode and hashed passwords
- Business onboarding
- Package metadata
- Per-tenant module entitlement toggles
- Client dashboard rendered from enabled modules
- Niche-based chatbot flows
- Lead capture and scoring
- CRM status pipeline
- Appointment API
- Admin/client dashboards
- Embeddable website chatbot
- AI/Tamil/Tanglish handling work in progress
- v1 automation engine API
- v1 automation builder page
- Lead-created and lead-status-changed automation triggers
- Appointment-created automation trigger for linked leads
- Automation execution logs
- Internal follow-up task creation action
- Follow-up task CRUD and task management UI
- Automated Node test coverage for core automation execution
- Database transaction queue recovery after failed operations
- Scheduled/delayed automation jobs
- Retry and durable failure tracking for automation jobs
- Tenant architecture documentation

### Still MVP/mock

- Most WhatsApp/Instagram/Facebook modules are toggles, not live provider integrations
- Voice AI is not a production provider integration
- Payment/invoice modules are metadata/toggles
- Email/SMS follow-up is not connected to providers
- JSON file storage is not production-grade
- Authentication still needs production hardening
- Automation actions currently stop at internal CRM operations; external delivery providers are not connected

## Implementation order

### Phase 1 — SaaS core stabilization

- [x] Multi-tenant business model
- [x] Authentication and onboarding
- [x] CRM/leads/appointments
- [x] Embeddable chatbot
- [x] v1 automation engine data/API
- [x] v1 automation builder UI
- [x] Lead lifecycle events connected to automation engine
- [x] Automation execution tests
- [x] Task/follow-up management UI
- [x] Appointment-created automation trigger
- [x] Scheduled/delayed automation execution
- [x] Automation retry/error state
- [x] Per-tenant username and module-entitlement dashboard

### Phase 2 — AI agent platform

- [ ] Tenant knowledge base
- [ ] Agent configuration per business
- [ ] Conversation memory
- [ ] AI tool/function calling
- [ ] Human handoff queue
- [ ] AI usage/cost tracking

### Phase 3 — Real integrations

- [ ] WhatsApp Business API
- [ ] Instagram/Facebook
- [ ] Email provider
- [ ] SMS provider
- [ ] Voice provider
- [ ] Calendar integrations
- [ ] Webhook/API integration framework

### Phase 4 — Production SaaS

- [ ] PostgreSQL + migrations
- [ ] RBAC/team members
- [ ] Audit logs
- [ ] Rate limiting and security hardening
- [ ] Billing/subscriptions
- [ ] Usage limits
- [ ] Automated tests/CI
- [ ] Monitoring/backups

## Safe change policy

New customer features must be added as isolated modules, configuration, routes or integrations wherever possible. Existing CRM, chatbot, appointment and automation behavior should not be rewritten for an unrelated feature. Every meaningful change should be committed separately, tested, and kept reversible through Git history.

## Immediate next step

Build the tenant-specific **AI Knowledge Base + Agent Configuration** layer on top of the shared core. The knowledge/agent configuration must be tenant-scoped so one client's business information can never be used as another client's context.
