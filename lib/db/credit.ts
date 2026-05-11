import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const GENERATION_MAX_RETRIES = 2;
export const PROVIDER_FAILURE_THRESHOLD = 2;
export const PROVIDER_BLOCK_MINUTES = 10;

export interface GenerationReservation {
  cycleId: string;
  attemptId: string;
  remainingCredits: number;
  retryCount: number;
  maxRetries: number;
  isRetry: boolean;
  isNewCycle: boolean;
}

export interface GenerationCompletion {
  cycleId: string;
  remainingCredits: number;
  retryCount: number;
  maxRetries: number;
  isRetry: boolean;
  isNewCycle: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

interface ReservationRow {
  cycle_id: string;
  attempt_id: string;
  remaining_credits: number;
  retry_count: number;
  max_retries: number;
  is_retry: boolean;
  is_new_cycle: boolean;
}

interface CompletionRow {
  cycle_id: string;
  remaining_credits: number;
  retry_count: number;
  max_retries: number;
  is_retry: boolean;
  is_new_cycle: boolean;
}

interface RateLimitRow {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

function mapReservation(row: ReservationRow): GenerationReservation {
  return {
    cycleId: row.cycle_id,
    attemptId: row.attempt_id,
    remainingCredits: row.remaining_credits,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    isRetry: row.is_retry,
    isNewCycle: row.is_new_cycle,
  };
}

function mapCompletion(row: CompletionRow): GenerationCompletion {
  return {
    cycleId: row.cycle_id,
    remainingCredits: row.remaining_credits,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    isRetry: row.is_retry,
    isNewCycle: row.is_new_cycle,
  };
}

function getRpcErrorCode(error: { message?: string; details?: string } | null) {
  const message = error?.message ?? error?.details ?? "unknown_db_error";
  const match = message.match(/(?:ERROR:\s*)?([^:\n]+(?::[^:\n]+)?)/);
  return match?.[1]?.trim() || message;
}

export async function reservePaidGeneration({
  apiKey,
  presetId,
  imageHash,
}: {
  apiKey: string;
  presetId: string;
  imageHash: string;
}) {
  const { data, error } = await supabaseAdmin
    .rpc("reserve_paid_generation", {
      p_api_key: apiKey,
      p_preset_id: presetId,
      p_image_hash: imageHash,
      p_max_retries: GENERATION_MAX_RETRIES,
    })
    .single<ReservationRow>();

  if (error) throw new Error(getRpcErrorCode(error));
  if (!data) throw new Error("empty_reservation");
  return mapReservation(data);
}

export async function reserveRetryGeneration({
  apiKey,
  cycleId,
  presetId,
  imageHash,
}: {
  apiKey: string;
  cycleId: string;
  presetId: string;
  imageHash: string;
}) {
  const { data, error } = await supabaseAdmin
    .rpc("reserve_retry_generation", {
      p_api_key: apiKey,
      p_cycle_id: cycleId,
      p_preset_id: presetId,
      p_image_hash: imageHash,
    })
    .single<ReservationRow>();

  if (error) throw new Error(getRpcErrorCode(error));
  if (!data) throw new Error("empty_reservation");
  return mapReservation(data);
}

export async function recordGenerationSuccess(attemptId: string) {
  const { data, error } = await supabaseAdmin
    .rpc("mark_generation_attempt_succeeded", {
      p_attempt_id: attemptId,
    })
    .single<CompletionRow>();

  if (error) throw new Error(getRpcErrorCode(error));
  if (!data) throw new Error("empty_completion");
  return mapCompletion(data);
}

export async function recordGenerationFailure(
  attemptId: string,
  errorMessage: string,
) {
  const { data, error } = await supabaseAdmin
    .rpc("mark_generation_attempt_failed", {
      p_attempt_id: attemptId,
      p_error_message: errorMessage,
      p_failure_threshold: PROVIDER_FAILURE_THRESHOLD,
      p_block_minutes: PROVIDER_BLOCK_MINUTES,
    })
    .single<CompletionRow>();

  if (error) throw new Error(getRpcErrorCode(error));
  if (!data) throw new Error("empty_completion");
  return mapCompletion(data);
}

export async function consumeRateLimit({
  subjectHash,
  action,
  limit,
  windowSeconds,
}: {
  subjectHash: string;
  action: string;
  limit: number;
  windowSeconds: number;
}) {
  const { data, error } = await supabaseAdmin
    .rpc("consume_rate_limit", {
      p_subject_hash: subjectHash,
      p_action: action,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    .single<RateLimitRow>();

  if (error) throw new Error(getRpcErrorCode(error));
  if (!data) throw new Error("empty_rate_limit");

  return {
    allowed: data.allowed,
    remaining: data.remaining,
    resetAt: data.reset_at,
  } satisfies RateLimitResult;
}
