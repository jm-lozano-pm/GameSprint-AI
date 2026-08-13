# GameSprint AI

![GameSprint AI hero](assets/hero.png)

> **Turn game ideas into sprint-ready work.**
>
> AI-powered product planning for indie and small game-development teams.

[![Demo](https://img.shields.io/badge/Live%20Demo-Open%20GameSprint%20AI-6C3CE9?style=for-the-badge)](https://lovable.dev/preview/kmLD5kvuTbXOlfhIx3HY7jpvAlIAjegE)

## Overview

GameSprint AI helps game designers and small studio teams transform rough game ideas into structured, sprint-ready work.

The core workflow is:

**Idea → AI Breakdown → Human Review → Approval → Backlog → Sprint**

The product is designed around a simple principle:

> **AI recommends. Humans decide.**

AI is used to accelerate planning and structure work, while people remain responsible for reviewing, editing and approving the generated output.

## The Problem

Game ideas often start as informal concepts, notes or conversations. Turning those ideas into actionable product work can require significant manual effort before a team can begin planning and development.

GameSprint AI addresses this gap by helping transform a game idea into structured product-management artefacts that can be reviewed and refined by the team.

## MVP

The MVP focuses on the workflow from idea capture to sprint planning, including:

- Game idea capture
- AI-generated breakdown
- User stories
- Acceptance criteria
- Edge cases
- Development tasks
- Priority and story points
- Human review and editing
- Approval workflow
- Backlog management
- Sprint planning

The product thesis is to move from a game idea to sprint-ready work in **under 5 minutes**, while keeping human review in the loop.

## Product Documentation

### 📄 Product Requirements Document

The PRD contains the product vision, problem definition, target users, MVP scope, competitive context, success metrics and roadmap.

[Read the PRD](docs/GameSprint%20AI%20%E2%80%94%20Product%20Requirements%20Document%20(PRD).pdf)

### 🎨 Product & Design System

The product and design system documents the visual language, UX principles, components and product experience used for GameSprint AI.

[Read the Product & Design System](docs/GameSprint_AI_Product_and_Design_System.md)

### 🏗️ Architecture Overview

The architecture document describes the planned technical architecture and system approach for the product.

[Read the Architecture Overview](docs/GameSprint_AI_Architecture_Overview.md)

### 🎨 Figma Design System

The editable Figma source is included in the repository.

[Open the Figma source](design/GameSprint_AI_Design_System.fig)

## Tech Stack

The MVP is built with:

- **React 19**
- **TypeScript**
- **TanStack Start & TanStack Router**
- **Vite**
- **Tailwind CSS**
- **Supabase**
- **React Query**
- **dnd-kit** for drag-and-drop interactions
- **Radix UI** components
- **Lucide** icons
- **Zod** for validation

## AI & Responsible AI

GameSprint AI uses AI as a planning assistant rather than an autonomous decision-maker.

The product follows three core principles:

- **Human-in-the-loop:** generated work can be reviewed and edited before approval.
- **Transparency:** AI-generated content is identified as such.
- **Human accountability:** teams remain responsible for the final product decisions.

## Project & Context

GameSprint AI was developed as an **Ironhack academic project** and is presented here as an MVP and product-design case study.

The project combines product management, UX/UI design, AI-assisted development and agile planning into a working prototype.

## AI-Assisted Development

AI was used throughout the project as a development and product-design accelerator, including ideation, specification, UI generation and MVP implementation.

The application was built with **Lovable**, with the resulting source code maintained in this repository. Product decisions, scope, UX direction and final review remained human-led.

## Repository Structure

```text
GameSprint-AI/
├── assets/          # Brand identity and portfolio visuals
├── design/          # Editable Figma design system
├── docs/            # Product and technical documentation
├── public/          # Static application assets
├── src/             # Application source code
├── supabase/        # Database configuration and migrations
│
├── .env.example     # Environment variable template
├── package.json     # Dependencies and scripts
└── README.md        # Project overview
```

## Running Locally

### Prerequisites

- Node.js
- npm or Bun
- A configured Supabase project

### Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/joselozano-pm/GameSprint-AI.git
cd GameSprint-AI
npm install
```

Create your local environment file from the template:

```bash
cp .env.example .env
```

Add your local Supabase configuration to `.env`.

Start the development server:

```bash
npm run dev
```

## Demo

**[Open the GameSprint AI MVP](https://lovable.dev/preview/kmLD5kvuTbXOlfhIx3HY7jpvAlIAjegE)**

## Status

**MVP — Validating**

This repository represents the MVP developed for the Ironhack project. The product is intentionally focused on validating the core workflow before expanding the scope.

---

**GameSprint AI** · Ideas to Games. Faster.
