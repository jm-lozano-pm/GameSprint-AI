# GameSprint AI — Product & Design System v2.0

> **Status:** Build-ready / MVP-aligned  
> **Product:** GameSprint AI  
> **Primary workflow:** Game Idea → AI Breakdown → Human Review → Backlog → Sprint → Development  
> **Visual source of truth:** GameSprint AI Figma `.fig` file  
> **Implementation source of truth:** GameSprint AI MVP Build Specification v1.0  
> **Product source of truth:** GameSprint AI PRD  
> **Technical source of truth:** GameSprint AI Architecture Overview

---

## 1. Purpose

GameSprint AI is an AI-powered B2B SaaS web application for indie and small game-development teams.

Its purpose is not to replace a complete project-management platform. It focuses on the earlier and more specific transformation:

**“What do we want to build?” → “What exactly needs to be developed?”**

The design system must therefore make the product feel:

**Clear → Fast → Intelligent → Game-aware → Trustworthy**

The interface should support the complete core journey:

**💡 Game Idea → 🤖 AI Breakdown → 👤 Human Review → 📋 Backlog → 🏃 Sprint → 🎮 Development**

The product should feel lighter than enterprise project-management software while remaining structured enough for real game-development work.

---

## 2. Source-of-Truth Rules

Use the project sources according to this hierarchy:

1. **PRD** — product vision, users, scope, requirements and priorities.
2. **Architecture Overview** — technical structure, security, data boundaries and AI integration.
3. **Figma `.fig`** — authoritative visual/UI source of truth.
4. **MVP Build Specification** — implementation blueprint connecting the above.

This document describes the intended product/design language but must not override the Figma file for exact visual implementation.

When a Figma component, pattern, screen, spacing value, colour or layout exists, use it rather than inventing a replacement.

---

# 3. Product Principles

## 3.1 AI proposes. Humans decide.

AI-generated content is a draft until explicitly approved.

The interface must distinguish:

**AI Generated → User Edited → Approved**

AI output must never appear to be automatically accepted or objectively correct.

Use clear labels such as:

- AI Generated
- AI Recommendation
- Needs Review
- Edited
- Approved
- User Created

Priorities are recommendations.

Story points are estimates.

Edge cases are potential considerations.

Sprint recommendations are suggestions.

---

## 3.2 Make the next action obvious

Every major screen should have one clear primary action.

Examples:

- **Generate with AI**
- **Review Requirements**
- **Approve**
- **Add to Sprint**
- **Create Idea**
- **Create Sprint**

Avoid competing primary CTAs.

---

## 3.3 Reduce project-management complexity

GameSprint AI is not a Jira replacement.

Prefer:

- Clear cards
- Simple navigation
- Progressive disclosure
- Short forms
- Contextual actions
- Lightweight backlog and sprint management

Avoid unnecessary configuration, dense enterprise dashboards and advanced project-management features that do not help validate the core AI workflow.

---

## 3.4 Game-native, not game-themed

The product should feel designed for game-development teams through:

- Terminology
- Information architecture
- AI context
- Appropriate icons
- Feature/mechanic language

Avoid turning the UI into a gaming website.

The product is professional SaaS with game-development awareness.

---

## 3.5 Protect user control and trust

Game concepts and development plans are sensitive intellectual property.

The UI should reinforce:

- What the AI generated
- What the user changed
- What is only a recommendation
- What has been approved

No irreversible project decision should happen autonomously.

---

# 4. Brand Personality

| Attribute | Expression |
|---|---|
| Intelligent | Structured AI output and useful recommendations |
| Creative | Game-oriented terminology and subtle personality |
| Professional | Suitable for real development workflows |
| Lightweight | Simpler than enterprise PM software |
| Trustworthy | Transparent AI states and explicit approval |
| Fast | Minimal friction from idea to sprint-ready work |

The visual identity balances **game creativity** with **professional SaaS productivity**.

---

# 5. Colour System

The Figma Design System is the final visual authority.

The approved design-system direction uses a light SaaS interface with purple as the AI/brand accent, blue for development, green for approval/success, amber for warnings, red for errors and slate/neutral colours for general UI.

## 5.1 Primary — Purple / AI / Brand

Approved design-system range:

| Token | Value |
|---|---|
| Primary 50 | `#F5F3FF` |
| Primary 100 | `#EDE9FE` |
| Primary 200 | `#DDD6FE` |
| Primary 500 | `#8B5CF6` |
| Primary 600 | `#7C3AED` |
| Primary 700 | `#6D28D9` |

Use for:

- AI actions
- AI-generated content
- Primary brand emphasis
- Active/selected states where defined by Figma
- Primary buttons where defined by Figma

Do not introduce `#6D4AFF` as an alternative primary unless the Figma file explicitly uses it.

---

## 5.2 Secondary — Blue / Development

| Token | Value |
|---|---|
| Blue 50 | `#EFF6FF` |
| Blue 100 | `#DBEAFE` |
| Blue 200 | `#BFDBFE` |
| Blue 500 | `#3B82F6` |
| Blue 600 | `#2563EB` |
| Blue 700 | `#1D4ED8` |

Use for:

- Development-related information
- Informational states
- Supporting actions
- Links where defined by Figma

---

## 5.3 Success — Green / Approval

| Token | Value |
|---|---|
| Green 50 | `#F0FDF4` |
| Green 100 | `#DCFCE7` |
| Green 200 | `#BBF7D0` |
| Green 500 | `#22C55E` |
| Green 600 | `#16A34A` |
| Green 700 | `#15803D` |

Use for:

- Approved requirements
- Successful actions
- Completed work
- Success feedback

---

## 5.4 Warning — Amber

| Token | Value |
|---|---|
| Amber 50 | `#FFFBEB` |
| Amber 100 | `#FEF3C7` |
| Amber 200 | `#FDE68A` |
| Amber 500 | `#F59E0B` |
| Amber 600 | `#D97706` |
| Amber 700 | `#B45309` |

Use for:

- Needs Review
- AI uncertainty
- Potential risks
- Warning feedback

---

## 5.5 Error — Red

| Token | Value |
|---|---|
| Red 50 | `#FEF2F2` |
| Red 100 | `#FEE2E2` |
| Red 200 | `#FECACA` |
| Red 500 | `#EF4444` |
| Red 600 | `#DC2626` |
| Red 700 | `#B91C1C` |

Use for:

- Generation failures
- Rejected/deleted content
- Critical errors

---

## 5.6 Neutral — Slate

Use the approved slate/neutral direction from Figma.

Core reference values:

- Background: `#F8FAFC`
- Primary text: `#0F172A`
- Surface: `#FFFFFF`

Use neutral tones for:

- User-created content
- General UI
- Borders
- Dividers
- Secondary information

Do not use colour alone to communicate state.

---

# 6. AI Colour Language

AI has a consistent visual identity: **purple**.

Recommended progression:

**AI Generated → Purple**

**AI Recommendation → Purple**

**User Edited → Blue/neutral development accent where defined**

**Approved → Green**

**User Created → Neutral**

**Needs Review → Amber**

**Rejected/Error → Red**

The exact component treatment must follow the Figma `.fig`.

---

# 7. Typography

## Typeface

**Inter**

Inter is the approved product typeface.

Do not introduce Manrope or another alternative unless the Figma design is explicitly changed.

## Typography Scale

Use the Figma-defined typography tokens as the final authority.

The documented baseline scale is:

| Style | Size | Weight |
|---|---:|---:|
| Display | 36px | 700 |
| H1 | 30px | 700 |
| H2 | 24px | 600 |
| H3 | 20px | 600 |
| H4 | 16px | 600 |
| Body Large | 16px | 400 |
| Body | 14px | 400 |
| Label | 13px | 500 |
| Caption | 12px | 400 |

Use sentence case for interface labels.

Prefer:

**Create idea**

over:

**CREATE IDEA**

---

# 8. Spacing

Use an 8px base grid.

| Token | Size |
|---|---:|
| XS | 4px |
| S | 8px |
| M | 16px |
| L | 24px |
| XL | 32px |
| 2XL | 48px |
| 3XL | 64px |

Typical usage:

- Icon → text: 8px
- Form fields: 16px
- Card padding: 24px
- Section spacing: 32px
- Major sections: 48px

Figma overrides these values wherever the actual design specifies otherwise.

---

# 9. Radius

The interface uses rounded but professional surfaces.

| Element | Radius |
|---|---:|
| Small controls | 6px |
| Inputs | 8px |
| Buttons | 8px |
| Cards | 12px |
| Large AI panels | 16px |
| Pills / badges | 999px |

Avoid excessive rounding that makes the application feel consumer-oriented.

---

# 10. Elevation and Shadows

Use restrained shadows.

Prefer borders and surface contrast over heavy elevation.

Reference treatments:

```text
Card:
0 1px 3px rgba(0,0,0,0.08)

Elevated panel:
0 4px 12px rgba(0,0,0,0.08)
```

Exact shadow values should follow Figma.

---

# 11. Iconography

Use:

**Lucide Outline**

Recommended semantic mappings:

| Concept | Icon |
|---|---|
| Idea | Lightbulb |
| AI | Sparkles / Bot |
| Feature | Puzzle |
| User Story | FileText |
| Acceptance Criteria | ListChecks |
| Edge Case | TriangleAlert |
| Priority | ArrowUp |
| Story Points | Gauge |
| Backlog | List |
| Sprint | Flag |
| Team | Users |
| Project | Folder |
| Approved | CircleCheck |
| Regenerate | RefreshCw |

Icons should support meaning, not decorate every element.

---

# 12. Application Shell

The application uses one reusable AppShell.

Structure:

```text
┌──────────────────────────────────────────────────────┐
│ Header / Project Context                              │
├───────────────┬──────────────────────────────────────┤
│ Sidebar       │ Main Workspace                        │
│               │                                      │
│ Dashboard     │                                      │
│ Projects      │                                      │
│               │                                      │
│ Ideas         │                                      │
│ Backlog       │                                      │
│ Sprints       │                                      │
│               │                                      │
│ Team          │                                      │
│               │                                      │
│ Settings      │                                      │
└───────────────┴──────────────────────────────────────┘
```

## Sidebar

### Workspace

- Dashboard
- Projects

### Current Project

- Ideas
- Backlog
- Sprints

### Team

- Members

### Bottom

- Settings

Important terminology rule:

**“Idea” is the user-facing navigation concept.**

**“Feature” is the underlying product/data concept and may appear in forms such as “Feature name”.**

Do not use “Features” as a replacement for the defined **Ideas** navigation unless the Figma screen explicitly does so.

---

# 13. Navigation and Project Context

The shell includes:

- Sidebar
- Header
- Main content container
- Project selector
- Search
- Profile

Navigation must remain consistent across all application screens.

Do not recreate the shell page-by-page.

---

# 14. Core Screens

The design system supports the following application structure:

```text
Authentication
├── Login
└── Sign Up

Onboarding
├── Your Studio
├── First Project
├── Your Workflow
└── Ready

Application
├── Dashboard
├── Projects
│   └── Project Overview
├── Current Project
│   ├── Ideas
│   │   ├── Ideas List
│   │   ├── Create Idea
│   │   └── AI Requirement Detail
│   ├── Backlog
│   │   └── Backlog Item Detail
│   └── Sprints
│       └── Sprint Board
├── Team
└── Settings
```

The Figma `.fig` remains the authoritative source for the actual screen composition.

---

# 15. Dashboard

The Dashboard prioritises action over analytics.

It may display:

- Project summary
- Idea summary
- Current sprint summary
- Recent ideas
- Recent activity
- Create Idea CTA
- View Backlog CTA
- Open Current Sprint CTA

Do not turn it into a complex analytics dashboard.

---

# 16. Project Overview

Display:

- Project name
- Genre/tags
- Project context
- Current sprint
- Recent ideas
- Backlog summary

Project context may be used by the AI only when authorised and necessary.

---

# 17. Create Idea

This is the entry point to the core product workflow.

### Fields

**Feature name**

Example:

`Weapon Crafting System`

**Description**

```text
Players should be able to collect resources
and use them to craft different weapons.
```

**Additional Context — Optional**

```text
Crafting is unlocked after completing the tutorial.
```

Primary CTA:

**✨ Generate with AI**

The user's input must be preserved if generation fails.

---

# 18. AI Generation State

Never show a blank loading screen.

Show explicit progress.

Recommended stages:

1. Understanding the feature
2. Generating user stories
3. Defining acceptance criteria
4. Identifying edge cases
5. Creating development tasks
6. Estimating priority and effort

Example:

```text
Analyzing your game feature…

✓ Understanding gameplay idea
✓ Identifying player goals
● Generating user stories
○ Checking edge cases
○ Creating development tasks
```

The exact animation and visual treatment should follow the Figma AI Workflow and States & Feedback designs.

---

# 19. AI Requirement Detail

This is the **most important screen in the product**.

It must communicate:

- Feature name
- Status
- AI Generated / Needs Review
- User Stories
- Acceptance Criteria
- Potential Edge Cases
- Development Tasks
- Priority Recommendation
- Story-Point Estimate
- Potential Sprint Placement when implemented
- Explicit approval action

Every generated section should support editing and regeneration where defined.

The approval action must be prominent and explicit.

---

# 20. AI Requirement Components

## User Story

Example:

### User Story

**AI Generated**

> As a player, I want to craft weapons using collected resources so that I can improve my equipment and progression.

Actions:

- Edit
- Regenerate
- Reject/Delete where supported

---

## Acceptance Criteria

Use a checklist structure.

Example:

### Acceptance Criteria

**AI Generated**

- Player can open the crafting interface.
- Available recipes display required resources.
- Crafting is disabled when resources are insufficient.
- Resources are removed after successful crafting.
- Crafted weapons are added to inventory.

Actions:

- Edit
- Regenerate

---

## Edge Cases

Use an amber/warning treatment.

### Potential Edge Cases

- Inventory is full when crafting completes.
- Player attempts to craft a locked item.
- Required resources change during the interaction.

Edge cases are **potential considerations**, not guaranteed problems.

---

# 21. AI Review State Model

The complete state model is:

```text
AI GENERATED
      ↓
USER EDITED
      ↓
APPROVED
```

Additional states may include:

- Needs Review
- Rejected
- User Created

Rules:

- Retain the original AI generation.
- Store human edits separately from the original generation.
- Never silently overwrite user edits during regeneration.
- Make approval explicit.
- Approved backlog items must represent the human-approved version.

---

# 22. AI Transparency

Whenever AI generates content, show an explicit AI indicator.

Recommended copy:

**AI Generated**

> Generated from your feature description and authorised project context. Review before approval.

For recommendations:

**AI Recommendation — You can change this.**

For uncertainty:

**More information may be needed to make this recommendation reliable.**

Avoid claims that AI output is objectively correct.

---

# 23. Priority

Priority is an **AI recommendation** that the user can change.

The implementation must use the actual priority values supported by the application data model and AI contract.

The current AI contract uses:

`HIGH`

as an example structured value.

Do not introduce a new **Critical** priority solely because it is common in project-management software unless the product model and Figma are explicitly updated.

Visual treatment should distinguish priority without relying on colour alone.

---

# 24. Story Points

The documented MVP scale is:

**1 · 2 · 3 · 5 · 8 · 13**

Present the value as:

**AI Recommendation**

Example:

**5 points**

> Moderate complexity involving UI, inventory integration and crafting logic.

The user should be able to override the estimate.

---

# 25. Approval

Approval is the gateway from AI draft to development work.

The user must explicitly approve the final requirements.

Before approval:

- Requirements remain drafts.
- AI labels remain visible.
- User can edit/regenerate/reject.

After approval:

- Record the approval.
- Record the approving user.
- Record the timestamp/version.
- Use the human-approved content for the backlog item.

Do not automatically assign the item to a sprint.

---

# 26. Backlog

Backlog is lightweight and game-team focused.

Recommended columns/information:

| Feature | Priority | Points | Status | Sprint |
|---|---|---:|---|---|
| Weapon Crafting | High | 5 | Ready | — |
| Inventory Upgrade | Medium | 3 | Ready | Sprint 4 |
| Quest Tracking | High | 8 | Review | — |

Users should be able to:

- Search
- Filter by status
- Filter by priority
- Filter by sprint where practical
- Filter by assignee where practical
- Open item detail
- Assign approved items to a sprint

Avoid Jira-style complexity.

---

# 27. Backlog Item Detail

An approved feature becomes structured development work.

Display:

- Title
- Approved status
- Description
- User stories
- Acceptance criteria
- Edge cases
- Development tasks
- Priority
- Story points
- Sprint assignment

The interface should make it obvious that this is **approved work**, not an unreviewed AI draft.

---

# 28. Sprint

Users can create a sprint with:

- Sprint name
- Goal
- Start date
- End date
- Capacity

Users can assign approved backlog items to a sprint.

Sprint recommendations, if implemented, are advisory only.

Never automatically commit work to a sprint.

---

# 29. Sprint Board

The MVP sprint board uses **four states**:

**To Do → In Progress → In Review → Done**

This is the approved product workflow.

Example:

```text
┌────────────┬──────────────┬────────────┬──────────┐
│ TO DO      │ IN PROGRESS  │ IN REVIEW  │ DONE     │
├────────────┼──────────────┼────────────┼──────────┤
│ Crafting   │ Enemy AI     │ Quest      │ Inventory│
│ System     │ Improvements │ Rewards    │ Upgrade  │
│ 5 pts      │ 8 pts        │ 5 pts      │ 3 pts   │
└────────────┴──────────────┴────────────┴──────────┘
```

Cards may display:

- Title
- Type
- Story points
- Priority
- Assignee where available

Do not simplify this to a three-state board unless the Figma design or product specification is explicitly changed.

---

# 30. Team

Basic team management is part of the broader MVP scope.

Roles:

- Owner
- Admin
- Designer
- Developer
- QA

The interface may include:

- Member list
- Role
- Project assignment
- Invitation
- Role filtering
- Joined date

Do not build advanced workload management.

---

# 31. Settings

Account/profile:

- Display name
- Email
- Profile image
- Password change
- Account deletion

Workspace/notification settings may be implemented where supported.

Billing may remain UI-ready/non-functional because monetisation is not required to validate the MVP.

---

# 32. Error States

Errors must be understandable and recoverable.

Poor:

> Something went wrong.

Better:

> **We couldn't generate the feature breakdown.**

> Your feature description has been saved. Try again.

Actions:

- Try Again
- Edit Feature

AI failure must:

- Preserve input
- Clearly communicate failure
- Offer retry/recovery
- Never display failed output as successful

---

# 33. Empty States

Empty states should guide users toward the core workflow.

Example:

### Empty Backlog

📋

**Your backlog is empty**

Turn your first game idea into structured development work.

**+ Create Idea**

Also provide meaningful empty states for:

- Projects
- Ideas
- Backlog
- Sprints

---

# 34. Accessibility

Target **WCAG 2.2 AA** principles.

Requirements include:

- Adequate text contrast
- Do not communicate state through colour alone
- Visible keyboard focus
- Keyboard-accessible controls
- Labels associated with form inputs
- Text labels for important icons
- Screen-reader-friendly status changes
- Touch targets around 44×44px where practical

---

# 35. Responsive Design

## Desktop

Primary experience.

Optimise for approximately:

**1280px and above**

Use the full AppShell.

## Tablet

Collapse the sidebar into an appropriate navigation pattern.

## Mobile

Provide sensible responsive access where practical.

Complex backlog and sprint management remain desktop-first.

No native mobile application is required for the MVP.

---

# 36. Design Tokens

Use the Figma variables/tokens as the final implementation source.

Conceptually:

```text
color.primary = purple AI/brand
color.secondary = blue development
color.success = green approval
color.warning = amber warning
color.error = red error
color.neutral = slate

font.family = Inter

radius.small = 6px
radius.medium = 8px
radius.card = 12px
radius.large = 16px

spacing.1 = 4px
spacing.2 = 8px
spacing.4 = 16px
spacing.6 = 24px
spacing.8 = 32px
spacing.12 = 48px
```

Do not hard-code a competing token system when the Figma file already defines the actual variables.

---

# 37. Component Library

Core components:

| Component | MVP |
|---|:---:|
| Button | ✅ |
| Input | ✅ |
| Textarea | ✅ |
| Select | ✅ |
| Checkbox | ✅ |
| Radio | ✅ |
| Toggle | ✅ |
| Badge | ✅ |
| Avatar | ✅ |
| Tooltip | ✅ |
| Modal | ✅ |
| Alert | ✅ |
| Card | ✅ |
| AI Requirement Card | ✅ |
| AI Status Badge | ✅ |
| AI Recommendation | ✅ |
| Priority Recommendation | ✅ |
| Story Point Recommendation | ✅ |
| Backlog List | ✅ |
| Backlog Item | ✅ |
| Backlog Item Detail | ✅ |
| Backlog Filters | ✅ |
| Sprint Board | ✅ |
| Sprint Column | ✅ |
| Sprint Card | ✅ |
| Project Card | ✅ |
| Project Selector | ✅ |
| Navigation Sidebar | ✅ |
| AI Generation State | ✅ |
| Empty State | ✅ |
| Toast / Feedback | ✅ |

Advanced charting, complex reporting, resource planning and enterprise collaboration components are outside the core MVP.

---

# 38. Core UX State Language

The complete product journey should use a consistent visual progression:

### 1. Idea

**User Created — Neutral**

### 2. AI Breakdown

**AI Generated — Purple**

### 3. Review

**Needs Review / User Edited — contextual blue/neutral treatment**

### 4. Approval

**Approved — Green**

### 5. Backlog

**Structured Approved Work — Neutral**

### 6. Sprint

**Development Execution — Blue**

This creates a coherent visual language without making the product feel overly gamified.

---

# 39. Critical Product Journey

The design must support this exact path:

```text
SIGN UP
  ↓
ONBOARDING
  ↓
CREATE PROJECT
  ↓
CREATE IDEA
  ↓
GENERATE WITH AI
  ↓
AI BREAKDOWN
  ↓
REVIEW
  ↓
EDIT / REGENERATE
  ↓
APPROVE
  ↓
BACKLOG
  ↓
CREATE / SELECT SPRINT
  ↓
ASSIGN
  ↓
SPRINT BOARD
  ↓
STATUS TRACKING
```

This is the most important product journey.

---

# 40. Critical Demo Scenario

Use this representative example:

**Feature:**

`Crafting System`

**Description:**

> Players can combine resources to craft weapons and upgrade their gear.

The user should be able to:

1. Enter the idea.
2. Generate the AI breakdown.
3. Review:
   - User stories
   - Acceptance criteria
   - Edge cases
   - Development tasks
   - Priority
   - Story points
4. Edit generated content.
5. Regenerate a section.
6. Approve the requirements.
7. See the approved work in the backlog.
8. Create/select a sprint.
9. Assign the backlog item.
10. See it on the Sprint Board.
11. Change its status.

The target is a reviewed, sprint-ready feature in **under five minutes**, including human review/edit time.

---

# 41. Product Metrics

The design should support the two primary success metrics.

## AI-to-Sprint Conversion

Target:

**≥ 60%**

Formula:

```text
AI-generated features assigned to a sprint
÷
Total AI-generated features
× 100
```

## Time to Sprint-Ready

Target:

**< 5 minutes per feature**

The timer begins when the user submits the raw idea and ends when reviewed/approved work is ready to enter the sprint workflow.

Human review/edit time is intentionally included.

Supporting indicators:

- AI approval rate
- Edit rate
- Regeneration rate
- Feature abandonment
- Average review time
- User satisfaction

Do not turn the MVP into an analytics product.

---

# 42. Demo Data

Optional development/demo seed data:

**Project:** Echoes of the Abyss

**Genre:** RPG

Example features:

- Crafting System
- Combat Finisher
- Quest Rewards
- Inventory Upgrade
- Enemy AI Improvements

Demo data must not be hard-coded into production logic.

---

# 43. Responsive and Interaction Principles

The interface should:

- Feel fast
- Avoid unnecessary navigation
- Preserve user input
- Provide immediate feedback
- Make AI activity visible
- Keep primary actions obvious
- Avoid irreversible actions without confirmation
- Use progressive disclosure for detailed AI output

---

# 44. What This Design System Does NOT Define

This document does not replace the:

- PRD
- Architecture Overview
- MVP Build Specification
- Figma `.fig`

It does not define:

- Database implementation
- Backend architecture
- AI provider credentials
- Authentication implementation
- Authorisation rules
- API contracts beyond their UI implications
- Product roadmap beyond the documented MVP
- Advanced analytics
- Full project-management functionality

Those concerns belong to the appropriate source documents.

---

# 45. Design System North Star

> **GameSprint AI should feel like an intelligent product-management partner for game teams, not an enterprise project-management system.**

The experience should help a Game Designer move from:

> **“I have an idea.”**

to:

> **“My team knows what to build.”**

with as little friction as possible.

### Design promise

**Simple enough for indie teams.**  
**Structured enough for development.**  
**Intelligent enough to save meaningful time.**  
**Transparent enough to trust.**
