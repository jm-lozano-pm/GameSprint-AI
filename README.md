# GameSprint AI

![GameSprint AI hero](assets/hero.png)

> **Turn game ideas into sprint-ready work.**
>
> An AI-powered product-planning MVP for indie and small game-development teams.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20GameSprint%20AI-6C3CE9?style=for-the-badge)](https://lovable.dev/preview/kmLD5kvuTbXOlfhIx3HY7jpvAlIAjegE) [![Figma](https://img.shields.io/badge/Figma-Design%20%26%20Prototype-F24E1E?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com/proto/nRxc0bhcarxf49JPgvDKFb/GameSprint-AI-%E2%80%94-Design-System-1.0?node-id=7806-556&t=BLhGB1uvUPJyCrJF-1&scaling=min-zoom&content-scaling=fixed&page-id=7806%3A555) [![Lovable](https://img.shields.io/badge/Built%20with-Lovable-FF6B6B?style=for-the-badge)](https://lovable.dev/)

## What is GameSprint AI?

GameSprint AI is a product-management concept and working MVP designed to help small game-development teams move from a rough idea to clearly defined, sprint-ready work.

Instead of trying to replace established project-management tools, the product focuses on the step before the backlog: translating creative game ideas into structured development work.

**Core workflow**

**Idea → AI Breakdown → Human Review → Approval → Backlog → Sprint**

> **AI recommends. Humans decide.**

The AI provides a first draft. The team reviews, edits and approves the result before it becomes committed development work.

## The Product Challenge

For a game designer or small studio team, a high-level idea still needs to become something developers can act on. That usually means defining user stories, acceptance criteria, edge cases, development tasks, priorities and effort estimates.

GameSprint AI explores how AI can reduce that manual translation work without removing the human product decision from the process.

## MVP Focus

The MVP was intentionally scoped around one question:

> **Can AI help a small game-development team turn a raw gameplay idea into useful, reviewed, sprint-ready work in under five minutes?**

The MVP includes:

- Idea / feature creation
- AI-generated user stories
- Acceptance criteria
- Edge cases
- Development tasks
- Priority recommendations
- Story-point estimates
- Human review and editing
- Regeneration of AI output
- Explicit approval
- Backlog management
- Sprint creation and assignment
- Basic sprint-board status tracking

## Product Outcomes We Wanted to Validate

**AI-to-Sprint Conversion:** target of **≥60%** of AI-generated features progressing to a sprint.

**Time to Sprint-Ready:** target of **<5 minutes**, including human review and editing.

These metrics focus on whether the AI output is genuinely useful, not simply whether the system can generate text.

## Product & UX Approach

The experience was designed to feel lighter than an enterprise project-management platform while still being structured enough for game-development workflows.

The visual language uses:

- Purple for AI and brand emphasis
- Blue for development and information
- Green for approval and success
- Amber for review and uncertainty
- Red for errors
- Neutral/slate tones for general and user-created content

The product design is based on a reusable Figma design system covering foundations, components, patterns, application shell, AI workflow, backlog and sprint experiences, states and core screens.

### 🎨 Figma presentation & prototype

[Open the GameSprint AI presentation and interactive prototype in Figma](https://www.figma.com/proto/nRxc0bhcarxf49JPgvDKFb/GameSprint-AI-%E2%80%94-Design-System-1.0?node-id=7806-556&t=BLhGB1uvUPJyCrJF-1&scaling=min-zoom&content-scaling=fixed&page-id=7806%3A555)

The presentation covers the product story, problem and opportunity, persona, core loop, product experience, competition, MVP scope, Responsible AI, architecture, success metrics, roadmap and business direction.

## Documentation

| Document | Purpose |
|---|---|
| [PRD](docs/GameSprint%20AI%20%E2%80%94%20Product%20Requirements%20Document%20(PRD).pdf) | Product vision, discovery, users, positioning, prioritisation, MVP, metrics and roadmap |
| [Product & Design System](docs/GameSprint_AI_Product_and_Design_System.md) | Visual language, UX principles, components, states and product experience |
| [Architecture Overview](docs/GameSprint_AI_Architecture_Overview.md) | Planned technical architecture, AI orchestration, data boundaries and security principles |
| [Figma source](design/GameSprint_AI_Design_System.fig) | Editable design-system source file |

## Team & Role

GameSprint AI was developed by a **team of three** as part of an **Ironhack academic project**.

My main contribution was on the **Product Management side**, including product discovery, problem framing, product vision, user and competitor analysis, MVP scope, prioritisation, requirements, success metrics, Responsible AI principles and roadmap/business direction.

The project was a collaborative effort across product, design and development rather than an individual build.

## AI-Assisted Product Development

AI was used throughout the project as an accelerator for research, ideation, documentation, product refinement and MVP development.

The team remained responsible for the product concept, strategic direction, scope, prioritisation, design decisions, validation and final review. AI-generated content was treated as input to the process, not as an autonomous product decision.

The application MVP was implemented with **Lovable**, and the resulting source code is maintained in this repository.

## Tech Stack

The implemented MVP uses:

- **React 19**
- **TypeScript**
- **TanStack Start / TanStack Router**
- **Vite**
- **Tailwind CSS**
- **Supabase**
- **React Query**
- **dnd-kit** for drag-and-drop interactions
- **Radix UI**
- **Lucide**
- **Zod**

## Responsible AI

GameSprint AI follows a human-in-the-loop model:

- AI-generated requirements are drafts.
- Recommendations and estimates are clearly presented as recommendations or estimates.
- Users can edit and regenerate generated content.
- Approval is explicit.
- Unapproved AI output does not become committed development work automatically.
- The system is designed to preserve project-data boundaries and minimise unnecessary context sent to an external AI provider.

> **GameSprint AI accelerates product decisions; it does not make them on behalf of the team.**

## Repository Structure

```text
GameSprint-AI/
├── assets/          # Brand identity and README visuals
├── design/          # Editable Figma design system
├── docs/            # Product and technical documentation
├── public/          # Static application assets
├── src/             # Application source code
├── supabase/        # Database configuration and migrations
│
├── .env.example     # Environment-variable template
├── package.json     # Dependencies and scripts
└── README.md        # Project overview
```

## Run Locally

### Prerequisites

- Node.js
- npm or Bun
- A configured Supabase project

### Installation

```bash
git clone https://github.com/joselozano-pm/GameSprint-AI.git
cd GameSprint-AI
npm install
```

Create a local environment file from the template:

```bash
cp .env.example .env
```

Add your local Supabase configuration to `.env`.

Start the development server:

```bash
npm run dev
```

## Links

- 🚀 **[Live MVP](https://lovable.dev/preview/kmLD5kvuTbXOlfhIx3HY7jpvAlIAjegE)**
- 🎨 **[Figma presentation & prototype](https://www.figma.com/proto/nRxc0bhcarxf49JPgvDKFb/GameSprint-AI-%E2%80%94-Design-System-1.0?node-id=7806-556&t=BLhGB1uvUPJyCrJF-1&scaling=min-zoom&content-scaling=fixed&page-id=7806%3A555)**
- 📄 **[Product Requirements Document](docs/GameSprint%20AI%20%E2%80%94%20Product%20Requirements%20Document%20(PRD).pdf)**
- 🎨 **[Product & Design System](docs/GameSprint_AI_Product_and_Design_System.md)**
- 🏗️ **[Architecture Overview](docs/GameSprint_AI_Architecture_Overview.md)**

## Status

**MVP — Validating**

This repository contains the MVP and supporting product/design artefacts created for the Ironhack project. The current scope focuses on validating the core idea-to-sprint workflow before expanding into broader collaboration, integrations and advanced AI assistance.

---

**GameSprint AI** · *Ideas to Games. Faster.*
