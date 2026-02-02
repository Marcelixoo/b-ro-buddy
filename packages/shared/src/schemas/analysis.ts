import { z } from "zod";

/** Evidence quote with optional page reference */
export const evidenceSchema = z.object({
  quote_de: z.string(),
  page: z.number().int().min(1).optional(),
});

/** Single action item from the letter */
export const actionSchema = z.object({
  title_en: z.string(),
  details_en: z.string(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  confidence: z.number().min(0).max(1),
  category: z.enum([
    "payment",
    "appointment",
    "form",
    "identity",
    "insurance",
    "tax",
    "other",
  ]),
  evidence: evidenceSchema,
});

/** Single deadline */
export const deadlineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meaning_en: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: evidenceSchema,
});

/** Extracted entities from the document */
export const entitiesSchema = z.object({
  sender: z.string().nullable(),
  amount_eur: z.number().nullable(),
  iban: z.string().nullable(),
  reference_number: z.string().nullable(),
  contact_phone: z.string().nullable(),
  address: z.string().nullable(),
});

/** Full analysis output from the LLM */
export const documentAnalysisSchema = z.object({
  language_detected: z.string(),
  summary_en: z.string(),
  overall_risk: z.enum(["low", "medium", "high"]),
  actions: z.array(actionSchema),
  deadlines: z.array(deadlineSchema),
  entities: entitiesSchema,
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Deadline = z.infer<typeof deadlineSchema>;
export type Entities = z.infer<typeof entitiesSchema>;
export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;
