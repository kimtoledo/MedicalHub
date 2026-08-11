import type { ChatMessage } from './provider.js';

// ---------------------------------------------------------------------------
// Note auto-fill
// ---------------------------------------------------------------------------

export type NoteSuggestInput = {
  chiefComplaint: string;
  services?: string[];
  toothRefs?: string[];
  existingNotes?: string;
};

export function buildNoteSuggestMessages(input: NoteSuggestInput): ChatMessage[] {
  const services = input.services?.length
    ? `- Services/Procedures planned: ${input.services.join(', ')}`
    : '';
  const toothRefs = input.toothRefs?.length
    ? `- Tooth references (FDI notation): ${input.toothRefs.join(', ')}`
    : '';
  const existing = input.existingNotes?.trim()
    ? `- Existing notes (incorporate if relevant): ${input.existingNotes}`
    : '';

  return [
    {
      role: 'system',
      content: `You are a clinical documentation assistant for a Philippine dental clinic. 
Your role is to draft SOAP-format dental encounter notes based on context provided by the dentist.
Guidelines:
- Use standard dental terminology and FDI notation for teeth.
- Be concise (1-3 sentences per section).
- Write in English with clear, professional language.
- Do NOT diagnose or make assumptions beyond what the context implies.
- Always respond with valid JSON only — no markdown, no preamble.`,
    },
    {
      role: 'user',
      content: `Draft clinical notes for this dental encounter:
- Chief Complaint: ${input.chiefComplaint}
${services}
${toothRefs}
${existing}

Respond with this exact JSON structure (all fields required; use empty string if not applicable):
{
  "examination": "objective examination findings",
  "assessment": "diagnosis or assessment",
  "recommendations": "treatment recommendations and home care instructions"
}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Recall suggestion
// ---------------------------------------------------------------------------

export type RecallSuggestInput = {
  procedures: string[];
  lastVisitDate: string;
};

export function buildRecallSuggestMessages(input: RecallSuggestInput): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are a dental recall scheduler for a Philippine dental clinic. 
Based on the treatments performed, recommend an appropriate recall interval following standard dental care protocols.
Respond with valid JSON only — no markdown, no preamble.`,
    },
    {
      role: 'user',
      content: `Recommend a recall interval for a patient whose last visit (${input.lastVisitDate}) included:
${input.procedures.map((p) => `- ${p}`).join('\n')}

Respond with this exact JSON:
{
  "intervalMonths": <integer 1-24>,
  "label": "<short human-readable label, e.g. '6-month recall'>",
  "rationale": "<one sentence explaining the recommendation>"
}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Treatment sequence suggestion
// ---------------------------------------------------------------------------

export type TreatmentSequenceInput = {
  odontogramSummary: string; // plain-text summary of current tooth conditions
  patientAge?: number;
  notes?: string;
};

export function buildTreatmentSequenceMessages(input: TreatmentSequenceInput): ChatMessage[] {
  const age = input.patientAge ? `Patient age: ${input.patientAge}` : '';
  const notes = input.notes ? `Additional notes: ${input.notes}` : '';

  return [
    {
      role: 'system',
      content: `You are a dental treatment planning assistant for a Philippine dental clinic.
Based on the patient's odontogram findings, suggest a prioritized treatment sequence.
Prioritization rules:
1. Urgent: pain, infection, abscess, fractured teeth causing pain
2. Routine: caries restoration, extractions of non-vital teeth
3. Elective: aesthetic procedures, recall items
Respond with valid JSON only — no markdown, no preamble.`,
    },
    {
      role: 'user',
      content: `Patient odontogram summary:
${input.odontogramSummary}
${age}
${notes}

Suggest a prioritized treatment sequence. Respond with:
{
  "sequence": [
    {
      "priority": <integer starting at 1>,
      "tooth": "<FDI notation or 'full mouth' or 'arch'>",
      "treatment": "<description>",
      "urgency": "urgent" | "routine" | "elective",
      "rationale": "<one sentence>"
    }
  ]
}`,
    },
  ];
}
