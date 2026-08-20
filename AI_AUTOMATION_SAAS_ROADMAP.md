# AI Automation SaaS — Product Roadmap

## Product boundary

This repository is the **AI Automation SaaS Platform**. Client websites such as **VoxBridge** are external customer/demo websites that consume the platform's embeddable tools; they are not the SaaS product itself.

## Target product

A multi-tenant platform for an agency/SaaS operator to onboard businesses and give each business its own AI agents, automations, CRM, communication channels, appointments, analytics and billing controls.

## Required platform layers

1. **SaaS control plane**
   - Admin/agency account
   - Business/tenant onboarding
   - Tenant isolation
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
- Admin and client authentication flow
- Business onboarding and one-time setup passcode
- Package metadata
- Module entitlement toggles
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
- Automation execution logs
- Internal follow-up task creation action

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
- [ ] Automation execution tests
- [ ] Task/follow-up management UI
- [ ] Appointment-created automation trigger
- [ ] Scheduled/delayed automation execution
- [ ] Automation retry/error state

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

## Immediate next step

Finish the automation layer properly: add automated execution tests, task/follow-up management, appointment-created triggers, scheduled/delayed actions and failure/retry tracking. After that, build the tenant-specific AI knowledge/agent layer. Provider integrations come only after the internal automation model is stable.
