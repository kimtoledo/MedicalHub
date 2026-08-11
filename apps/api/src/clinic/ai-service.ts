import type { DB } from '@dentra/db';
import { aiInteractions } from '@dentra/db/schema';
import type { LLMProvider } from '../ai/provider.js';
import {
  buildNoteSuggestMessages,
  buildRecallSuggestMessages,
  buildTreatmentSequenceMessages,
  type NoteSuggestInput,
  type RecallSuggestInput,
  type TreatmentSequenceInput,
} from '../ai/prompts.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AIServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_CONFIGURED'
      | 'PROVIDER_ERROR'
      | 'INVALID_RESPONSE'
      | 'RATE_LIMITED',
    message: string,
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NoteSuggestion = {
  examination: string;
  assessment: string;
  recommendations: string;
};

export type RecallSuggestion = {
  intervalMonths: number;
  label: string;
  rationale: string;
};

export type TreatmentSequenceSuggestion = {
  sequence: {
    priority: number;
    tooth: string;
    treatment: string;
    urgency: 'urgent' | 'routine' | 'elective';
    rationale: string;
  }[];
};

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface AiAssistanceService {
  isConfigured(): boolean;

  /**
   * Suggest clinical notes (streaming — yields text deltas).
   * Logs an interaction row after completion.
   */
  streamNoteSuggestion(
    clinicId: string,
    actorId: string,
    input: NoteSuggestInput,
    encounterId?: string,
  ): AsyncGenerator<string>;

  /**
   * Suggest a recall interval (non-streaming).
   */
  suggestRecall(
    clinicId: string,
    actorId: string,
    input: RecallSuggestInput,
    encounterId?: string,
  ): Promise<RecallSuggestion>;

  /**
   * Suggest a treatment sequence from odontogram state (non-streaming).
   */
  suggestTreatmentSequence(
    clinicId: string,
    actorId: string,
    input: TreatmentSequenceInput,
    encounterId?: string,
  ): Promise<TreatmentSequenceSuggestion>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function tryParseJSON<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export function createAiAssistanceService(db: DB, provider: LLMProvider): AiAssistanceService {
  async function logInteraction(opts: {
    clinicId: string;
    actorId: string;
    encounterId?: string;
    feature: string;
    promptTokens?: number;
    completionTokens?: number;
    latencyMs?: number;
    outcome?: string;
  }) {
    try {
      await db.insert(aiInteractions).values({
        clinicId: opts.clinicId,
        actorId: opts.actorId,
        encounterId: opts.encounterId ?? null,
        feature: opts.feature,
        model: provider.modelName,
        promptTokens: opts.promptTokens ?? null,
        completionTokens: opts.completionTokens ?? null,
        latencyMs: opts.latencyMs ?? null,
        outcome: opts.outcome ?? 'completed',
      });
    } catch {
      // Non-fatal — audit log failure should never break the request
    }
  }

  return {
    isConfigured() {
      return provider.isConfigured;
    },

    // ──────────────────────────────────────────────────────────────────────
    // streamNoteSuggestion
    // ──────────────────────────────────────────────────────────────────────
    async *streamNoteSuggestion(clinicId, actorId, input, encounterId) {
      if (!provider.isConfigured) {
        throw new AIServiceError(
          'NOT_CONFIGURED',
          'No AI provider configured. Set OPENAI_API_KEY to enable AI features.',
        );
      }
      const messages = buildNoteSuggestMessages(input);
      const start = Date.now();
      let totalChars = 0;
      let outcome = 'completed';
      try {
        for await (const delta of provider.stream(messages)) {
          totalChars += delta.length;
          yield delta;
        }
      } catch (err) {
        outcome = 'error';
        if (err instanceof Error && err.message === 'LLM_NOT_CONFIGURED') {
          throw new AIServiceError('NOT_CONFIGURED', 'AI provider not configured');
        }
        throw new AIServiceError('PROVIDER_ERROR', String(err));
      } finally {
        const latencyMs = Date.now() - start;
        void logInteraction({
          clinicId,
          actorId,
          encounterId,
          feature: 'note_suggest',
          latencyMs,
          outcome,
          // tokens estimated from chars (1 token ≈ 4 chars)
          completionTokens: Math.round(totalChars / 4),
        });
      }
    },

    // ──────────────────────────────────────────────────────────────────────
    // suggestRecall
    // ──────────────────────────────────────────────────────────────────────
    async suggestRecall(clinicId, actorId, input, encounterId) {
      if (!provider.isConfigured) {
        throw new AIServiceError('NOT_CONFIGURED', 'AI provider not configured');
      }
      const messages = buildRecallSuggestMessages(input);
      const start = Date.now();
      let result;
      try {
        result = await provider.complete(messages);
      } catch (err) {
        void logInteraction({ clinicId, actorId, encounterId, feature: 'recall_suggest', outcome: 'error', latencyMs: Date.now() - start });
        throw new AIServiceError('PROVIDER_ERROR', String(err));
      }

      const parsed = tryParseJSON<RecallSuggestion>(result.text);
      if (!parsed || typeof parsed.intervalMonths !== 'number') {
        void logInteraction({ clinicId, actorId, encounterId, feature: 'recall_suggest', outcome: 'invalid_response', latencyMs: Date.now() - start });
        throw new AIServiceError('INVALID_RESPONSE', 'AI returned an unexpected response format');
      }

      void logInteraction({
        clinicId,
        actorId,
        encounterId,
        feature: 'recall_suggest',
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs: Date.now() - start,
      });

      return parsed;
    },

    // ──────────────────────────────────────────────────────────────────────
    // suggestTreatmentSequence
    // ──────────────────────────────────────────────────────────────────────
    async suggestTreatmentSequence(clinicId, actorId, input, encounterId) {
      if (!provider.isConfigured) {
        throw new AIServiceError('NOT_CONFIGURED', 'AI provider not configured');
      }
      const messages = buildTreatmentSequenceMessages(input);
      const start = Date.now();
      let result;
      try {
        result = await provider.complete(messages);
      } catch (err) {
        void logInteraction({ clinicId, actorId, encounterId, feature: 'treatment_sequence', outcome: 'error', latencyMs: Date.now() - start });
        throw new AIServiceError('PROVIDER_ERROR', String(err));
      }

      const parsed = tryParseJSON<TreatmentSequenceSuggestion>(result.text);
      if (!parsed || !Array.isArray(parsed.sequence)) {
        void logInteraction({ clinicId, actorId, encounterId, feature: 'treatment_sequence', outcome: 'invalid_response', latencyMs: Date.now() - start });
        throw new AIServiceError('INVALID_RESPONSE', 'AI returned an unexpected response format');
      }

      void logInteraction({
        clinicId,
        actorId,
        encounterId,
        feature: 'treatment_sequence',
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs: Date.now() - start,
      });

      return parsed;
    },
  };
}
