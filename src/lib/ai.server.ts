// Server-only AI orchestration for GameSprint AI.
// AI credentials never leave this trusted layer.
import { z } from "zod";

const MODEL = "google/gemini-3.6-flash";
const MAX_ITEMS = 12;
const MAX_LEN = 600;

const MAX_SPLITS = 30;

const splitSuggestionSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(""),
});


const breakdownSchema = z.object({
  user_story: z.string(),
  acceptance_criteria: z.array(z.string()).min(1).max(MAX_ITEMS),
  edge_cases: z.array(z.string()).max(MAX_ITEMS),
  development_tasks: z
    .array(z.object({ title: z.string(), description: z.string().optional().default("") }))
    .min(1)
    .max(MAX_ITEMS),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  story_points: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(5),
    z.literal(8),
    z.literal(13),
  ]),
  too_large: z.boolean().optional().default(false),
  split_reason: z.string().optional().default(""),
  split_suggestions: z.array(splitSuggestionSchema).max(MAX_SPLITS).optional().default([]),
  reasoning: z.string().optional().default(""),
});

export type Breakdown = z.infer<typeof breakdownSchema>;
export type SplitSuggestion = z.infer<typeof splitSuggestionSchema>;

export type GenerationContext = {
  featureName: string;
  featureDescription: string;
  featureContext?: string | null;
  projectName: string;
  projectGenre?: string | null;
  projectContext?: string | null;
};

const SYSTEM_PROMPT = `You are the GameSprint AI breakdown engine for indie and small game-development teams.
You turn a rough game feature idea into sprint-ready development work.

Rules:
- AI recommends, humans decide. Your output is a DRAFT for human review.
- Be concrete and game-native (systems, loops, player-facing behaviour), never generic enterprise software talk.
- Produce EXACTLY ONE primary user story, in the form "As a <role>, I want <goal> so that <benefit>".
- NEVER produce several user stories for one idea. If the idea is too large to be represented by a single
  user story, still return the best single user story, set too_large to true, explain briefly in split_reason,
  and propose sprint-ready smaller ideas in split_suggestions. Never invent a split when the idea fits one story:
  in that case too_large is false, split_reason is "" and split_suggestions is [].

SPLITTING RULES (when too_large is true):
- Each suggestion must be ONE coherent player-facing outcome that maps to EXACTLY ONE user story,
  small enough for one team to implement independently within a single sprint.
- Do NOT return broad subsystems or umbrella features ("Base Building System", "Inventory Management",
  "Furniture & Decoration Placement System", "Visitor Access & Permission Management").
  Return small concrete capabilities instead ("Place Furniture on a Grid", "Move Placed Furniture",
  "Remove Furniture", "Save Furniture Placement").
- Titles must be concise and specific; avoid "System", "Management" and "&" joining two capabilities.
- Before answering, silently check EVERY suggestion: if a suggestion would itself be too large for one
  sprint or would need more than one user story, decompose it further and repeat this check until every
  suggestion is sprint-ready. Never expose this internal checking — only output the final suggestions.
- Prefer many small ideas over few large ones. 10 or more suggestions is perfectly acceptable
  (up to ${MAX_SPLITS}). There is no need to keep the list short.
- Only suggest work genuinely implied by the original idea. Never invent unrelated functionality.
- description is REQUIRED for every suggestion: one short sentence stating exactly what it covers
  and the single player outcome.

- Acceptance criteria are testable and unambiguous.
- Edge cases are potential considerations, including failure and exploit cases.
- Development tasks are implementation work items a game dev team could pick up.
- priority is a RECOMMENDATION: one of LOW, MEDIUM, HIGH, CRITICAL.
- story_points is an ESTIMATE and MUST be exactly one of 1, 2, 3, 5, 8, 13.
- Use ONLY the provided project context. Never reference other projects, studios or products.
- Reply with JSON only, matching the requested schema. No markdown, no prose outside JSON.`;

export function buildPromptInput(ctx: GenerationContext) {
  // Minimum authorised project context only — never data from other projects.
  return {
    project: {
      name: ctx.projectName,
      genre: ctx.projectGenre ?? null,
      context: ctx.projectContext ?? null,
    },
    feature: {
      name: ctx.featureName,
      description: ctx.featureDescription,
      context: ctx.featureContext ?? null,
    },
  };
}

function truncate(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > MAX_LEN ? `${trimmed.slice(0, MAX_LEN)}…` : trimmed;
}

export class AiGenerationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function callGateway(body: unknown): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new AiGenerationError("config", "AI service is not configured on the server.");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new AiGenerationError(
        "rate_limited",
        "The AI service is rate limited right now. Your input is saved — please retry in a moment.",
      );
    }
    if (response.status === 402) {
      throw new AiGenerationError(
        "no_credits",
        "AI credits are exhausted for this workspace. Your input is saved — add credits and retry.",
      );
    }
    throw new AiGenerationError(
      "upstream",
      `The AI service returned an error (${response.status}). Your input is saved — please retry. ${detail.slice(0, 200)}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new AiGenerationError("empty", "The AI service returned no content. Please retry.");
  }
  return content;
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new AiGenerationError(
      "invalid_json",
      "The AI response could not be read as structured data. Your input is saved — please retry.",
    );
  }
}

const breakdownJsonSchema = {
  name: "gamesprint_breakdown",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      user_story: { type: "string" },
      acceptance_criteria: { type: "array", items: { type: "string" } },
      edge_cases: { type: "array", items: { type: "string" } },
      development_tasks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { title: { type: "string" }, description: { type: "string" } },
          required: ["title", "description"],
        },
      },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
      story_points: { type: "number", enum: [1, 2, 3, 5, 8, 13] },
      too_large: { type: "boolean" },
      split_reason: { type: "string" },
      split_suggestions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { name: { type: "string" }, description: { type: "string" } },
          required: ["name", "description"],
        },
      },
      reasoning: { type: "string" },
    },
    required: [
      "user_story",
      "acceptance_criteria",
      "edge_cases",
      "development_tasks",
      "priority",
      "story_points",
      "too_large",
      "split_reason",
      "split_suggestions",
      "reasoning",
    ],
  },
} as const;

export async function generateBreakdown(ctx: GenerationContext): Promise<{
  model: string;
  promptInput: ReturnType<typeof buildPromptInput>;
  breakdown: Breakdown;
  raw: unknown;
}> {
  const promptInput = buildPromptInput(ctx);

  const content = await callGateway({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Break down this game feature idea into sprint-ready work with exactly one user story. Respond with json.\n\n${JSON.stringify(
          promptInput,
          null,
          2,
        )}`,
      },
    ],
    response_format: { type: "json_schema", json_schema: breakdownJsonSchema },
  });

  const parsed = parseJson(content);
  const result = breakdownSchema.safeParse(parsed);
  if (!result.success) {
    throw new AiGenerationError(
      "invalid_shape",
      "The AI response did not match the required requirement structure and was rejected. Your input is saved — please retry.",
    );
  }

  const breakdown: Breakdown = {
    ...result.data,
    user_story: truncate(result.data.user_story),
    acceptance_criteria: result.data.acceptance_criteria.map(truncate).filter(Boolean),
    edge_cases: result.data.edge_cases.map(truncate).filter(Boolean),
    development_tasks: result.data.development_tasks
      .map((task) => ({
        title: truncate(task.title),
        description: truncate(task.description ?? ""),
      }))
      .filter((task) => task.title.length > 0),
    split_suggestions: (result.data.too_large ? result.data.split_suggestions : [])
      .map((item) => ({ name: truncate(item.name), description: truncate(item.description ?? "") }))
      .filter((item) => item.name.length > 0),
  };

  if (!breakdown.user_story || breakdown.development_tasks.length === 0) {
    throw new AiGenerationError(
      "invalid_shape",
      "The AI response was incomplete and was rejected. Your input is saved — please retry.",
    );
  }

  return { model: MODEL, promptInput, breakdown, raw: parsed };
}

export type SectionKind = "USER_STORY" | "ACCEPTANCE_CRITERION" | "EDGE_CASE" | "TASKS";

const SECTION_BRIEF: Record<SectionKind, string> = {
  USER_STORY:
    'the single primary user story, in the form "As a <role>, I want <goal> so that <benefit>"',
  ACCEPTANCE_CRITERION: "the testable acceptance criteria for this idea",
  EDGE_CASE: "the potential edge cases, failure and exploit cases for this idea",
  TASKS: "the concrete development tasks for this idea",
};

const sectionSchemas = {
  USER_STORY: z.object({ items: z.array(z.string()).min(1).max(1) }),
  ACCEPTANCE_CRITERION: z.object({ items: z.array(z.string()).min(1).max(MAX_ITEMS) }),
  EDGE_CASE: z.object({ items: z.array(z.string()).max(MAX_ITEMS) }),
  TASKS: z.object({
    tasks: z
      .array(z.object({ title: z.string(), description: z.string().optional().default("") }))
      .min(1)
      .max(MAX_ITEMS),
  }),
} as const;

/** Regenerates ONE section only. Other sections are never touched by the caller. */
export async function generateSection(
  kind: SectionKind,
  ctx: GenerationContext,
  existing: {
    userStory?: string | null;
    acceptanceCriteria?: string[];
    edgeCases?: string[];
    tasks?: Array<{ title: string; description: string | null }>;
  },
): Promise<{
  model: string;
  promptInput: unknown;
  items: string[];
  tasks: Array<{ title: string; description: string }>;
  raw: unknown;
}> {
  const promptInput = {
    ...buildPromptInput(ctx),
    regenerate_section: kind,
    current_breakdown: {
      user_story: existing.userStory ?? null,
      acceptance_criteria: existing.acceptanceCriteria ?? [],
      edge_cases: existing.edgeCases ?? [],
      development_tasks: existing.tasks ?? [],
    },
  };

  const isTasks = kind === "TASKS";
  const jsonSchema = isTasks
    ? {
        name: "gamesprint_tasks",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: { title: { type: "string" }, description: { type: "string" } },
                required: ["title", "description"],
              },
            },
          },
          required: ["tasks"],
        },
      }
    : {
        name: "gamesprint_section",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: { items: { type: "array", items: { type: "string" } } },
          required: ["items"],
        },
      };

  const content = await callGateway({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Regenerate ONLY ${SECTION_BRIEF[kind]}. Keep it consistent with the rest of the current breakdown, which must not be rewritten.${
          kind === "USER_STORY" ? " Return exactly one user story." : ""
        } Respond with json.\n\n${JSON.stringify(promptInput, null, 2)}`,
      },
    ],
    response_format: { type: "json_schema", json_schema: jsonSchema },
  });

  const parsed = parseJson(content);
  const result = sectionSchemas[kind].safeParse(parsed);
  if (!result.success) {
    throw new AiGenerationError(
      "invalid_shape",
      "The AI response did not match the required structure and was rejected. Nothing was changed — please retry.",
    );
  }

  if (isTasks) {
    const tasks = (result.data as z.infer<typeof sectionSchemas.TASKS>).tasks
      .map((task) => ({
        title: truncate(task.title),
        description: truncate(task.description ?? ""),
      }))
      .filter((task) => task.title.length > 0);
    if (tasks.length === 0) {
      throw new AiGenerationError(
        "invalid_shape",
        "The AI returned no usable tasks. Nothing was changed — please retry.",
      );
    }
    return { model: MODEL, promptInput, items: [], tasks, raw: parsed };
  }

  const items = (result.data as { items: string[] }).items.map(truncate).filter(Boolean);
  if (items.length === 0 && kind !== "EDGE_CASE") {
    throw new AiGenerationError(
      "invalid_shape",
      "The AI returned no usable content. Nothing was changed — please retry.",
    );
  }
  return { model: MODEL, promptInput, items, tasks: [], raw: parsed };
}
