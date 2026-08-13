# GameSprint AI — Architecture Overview

**Product:** GameSprint AI  
**Document Type:** Technical Architecture Overview  
**Primary Workflow:** Game Idea → AI Breakdown → Human Review → Backlog → Sprint  
**Architecture Goal:** Keep the MVP simple enough to build quickly while supporting security, reliable AI integration, project-data isolation and future scalability.

---

## 1. Architecture Overview

GameSprint AI will use a **cloud-based web application architecture** designed to support the MVP workflow:

**Game Idea → AI Breakdown → Human Review → Backlog → Sprint**

The architecture should remain simple for MVP validation while supporting:

- Security
- Reliable AI integration
- Project-data isolation
- Future scalability

The MVP should favour simple, managed cloud services and a modular architecture rather than complex infrastructure.

---

## 2. High-Level Architecture

The system consists of four primary layers:

```text
                    GAMESPRINT AI
                         │
                         ▼
                 ┌───────────────┐
                 │  Web Frontend │
                 └───────┬───────┘
                         │ HTTPS
                         ▼
                 ┌───────────────┐
                 │ Backend / API │
                 └───────┬───────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
       Auth /        PostgreSQL     AI Provider
       Business
       Logic
```

The backend acts as the application and orchestration layer between the web client, persistent project data and the external AI model.

---

# 3. Core Components

## 3.1 Web Frontend

The web frontend provides the user-facing application experience.

It provides:

- Authentication
- Project dashboard
- Game idea creation
- AI generation interface
- AI review and editing
- Backlog management
- Basic sprint management

The frontend should communicate with the backend/API over HTTPS.

The frontend must not contain or expose AI provider credentials.

---

## 3.2 Backend / API

The backend is responsible for the application's business logic and trusted orchestration.

It manages:

- Authentication
- Authorization
- Project and feature data
- AI requests
- Requirement approval
- Backlog operations
- Sprint operations
- Usage limits
- Validation
- Error handling

For the MVP, a **modular monolith** is preferred over microservices in order to reduce complexity.

The backend acts as the trusted boundary between the frontend and external AI services.

---

## 3.3 AI Layer

The backend sends the user's game idea and only the necessary project context to an external AI model.

The AI generates structured outputs such as:

- User stories
- Acceptance criteria
- Edge cases
- Development tasks
- Priority recommendations
- Story-point estimates

AI responses should be validated before storage.

### Core AI principle

> **AI proposes. Humans decide.**

AI-generated work must be reviewed and explicitly approved before entering the backlog or sprint.

Generated requirements should support states such as:

**Generated → Edited → Approved**

The architecture must preserve the distinction between:

- Original AI generation
- User edits
- Final approved requirements

---

## 3.4 Database

A relational database such as **PostgreSQL** should store the application's structured project data.

The architecture identifies the following core data:

- Users
- Projects
- Features
- AI-generated requirements
- Backlog items
- Sprints
- Task status
- Approval state

The database must support project-level data isolation.

---

# 4. Core Request Flow

The main AI request flow is:

```text
1. User submits a game idea
             │
             ▼
2. Backend validates the request
   and verifies project access
             │
             ▼
3. AI generates structured requirements
             │
             ▼
4. Backend validates and stores the output
             │
             ▼
5. User reviews, edits or regenerates content
             │
             ▼
6. User explicitly approves
   the final requirements
             │
             ▼
7. Approved work moves to the backlog
             │
             ▼
8. Approved work can be assigned
   to a sprint
```

The backend must remain responsible for validation, authorization and AI orchestration throughout this flow.

---

# 5. AI Data Boundaries

The architecture requires strict boundaries around information sent to the external AI provider.

### Send only:

- The user's relevant game idea
- The minimum necessary project context

### Do not send:

- Unrelated project information
- Another project's data
- Unrelated team information
- Cross-project context

The AI layer must never receive project information simply because it is available in the database.

Only the minimum context necessary for the current generation should be included.

---

# 6. Security & Privacy

Security is especially important because game concepts and development plans may represent valuable intellectual property.

The MVP should include:

- HTTPS/TLS
- Secure authentication
- Server-side authorization
- Project-level authorization
- Server-side API keys
- Project-data isolation
- Minimum necessary data sent to the AI provider
- No cross-project AI context

### Authentication

Authentication is required for protected application data.

### Authorization

Authorization must be enforced server-side.

Users may access only projects they are authorized to access.

### Project Isolation

Project A context must never be exposed to Project B.

This applies both to:

- Application/database access
- AI requests

### Credentials

AI provider credentials must remain server-side.

Secrets must never be exposed through frontend code or browser-accessible configuration.

### Transport

Communication must use HTTPS/TLS.

### Privacy

Game concepts and development plans should be treated as potentially confidential intellectual property.

The system must not expose one team's project information to another team.

---

# 7. Application Architecture

The MVP should use a modular monolith rather than microservices.

```text
Frontend
   │
 HTTPS
   ▼
Backend / API
   ├── Auth
   ├── Projects
   ├── Features
   ├── AI Orchestration
   ├── Requirements
   ├── Backlog
   ├── Sprints
   └── Users / Teams
        │
        ├── PostgreSQL
        └── AI Provider
```

The architecture describes:

- A web client
- An application server
- A PostgreSQL database
- A secure AI service connection

Optional external services may include:

- Email
- File storage
- Monitoring/logging

These are not required to turn the MVP into a complex distributed architecture.

---

# 8. Architecture Principle

The MVP should favour:

- Simple infrastructure
- Managed cloud services
- Modular application design
- Secure AI integration
- Clear project-data boundaries
- Future scalability without premature complexity

The architecture should be:

**Simple enough to build quickly.**  
**Secure enough to protect project data.**  
**Modular enough to evolve as GameSprint AI grows.**

---

# 9. Explicitly Not Required for Initial Validation

The following are not required for the initial MVP architecture:

- Microservices
- Kubernetes
- Custom AI models
- Multi-region deployment

The architecture should not introduce these technologies simply for the sake of technical sophistication.

---

# 10. Data and AI State Model

The architecture requires a clear distinction between generated, edited and approved content.

```text
AI GENERATION
      │
      ▼
  GENERATED
      │
      ▼
    EDITED
      │
      ▼
   APPROVED
      │
      ▼
   BACKLOG
      │
      ▼
    SPRINT
```

The original AI generation should remain distinguishable from the user's edited version and final approved requirements.

Approval is an explicit human action.

---

# 11. Architectural Responsibilities

| Layer | Primary responsibility |
|---|---|
| Web Frontend | User interface and interaction |
| Backend / API | Business logic, authorization, validation and orchestration |
| AI Layer | Generate structured game-development recommendations |
| PostgreSQL | Persistent structured application data |
| AI Provider | External language-model generation |
| HTTPS/TLS | Secure communication |

---

# 12. Architectural Constraints

The implementation should respect these constraints:

1. The frontend must not directly expose AI provider credentials.
2. The backend must validate requests before sending them to the AI provider.
3. The backend must validate AI responses before storing them.
4. Project access must be authorized server-side.
5. Project data must remain isolated.
6. AI requests must contain only the minimum required project context.
7. AI-generated work must remain subject to human review and approval.
8. Approved work can then enter the backlog and be assigned to a sprint.
9. The MVP should use a modular monolith rather than microservices.
10. Infrastructure should remain simple and managed where practical.

---

# 13. Architecture and Product Workflow

The architecture directly supports the product's core workflow:

```text
GAME IDEA
    │
    ▼
AI BREAKDOWN
    │
    ▼
HUMAN REVIEW
    │
    ├── Edit
    ├── Regenerate
    └── Review
    │
    ▼
APPROVAL
    │
    ▼
BACKLOG
    │
    ▼
SPRINT
```

The architecture therefore treats **human approval as the boundary between AI-generated recommendations and committed development work**.

---

# 14. Future Scalability

The architecture should support future growth without requiring the MVP to implement complex infrastructure.

The modular structure allows the application to evolve as adoption increases.

The initial architecture should therefore avoid premature complexity while maintaining clear boundaries between:

- Frontend
- Backend/business logic
- AI orchestration
- Persistent data
- External AI provider

---

# 15. Architecture Summary

GameSprint AI's MVP architecture is a **cloud-based web application using a modular monolith**.

At a high level:

```text
WEB FRONTEND
     │
    HTTPS
     │
     ▼
BACKEND / API
     │
     ├───────────────┐
     ▼               ▼
POSTGRESQL      AI PROVIDER
```

The backend is the trusted control layer.

It:

- Authenticates and authorizes users
- Manages projects and features
- Validates AI requests
- Sends minimum necessary context to the AI
- Validates AI responses
- Stores structured results
- Preserves human edits
- Records approval
- Manages backlog and sprint operations

The architecture prioritizes:

**Security → Simplicity → Reliable AI Integration → Project Isolation → Future Scalability**

while avoiding unnecessary infrastructure complexity during MVP validation.
