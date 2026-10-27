"use client";

import { useCallback, useMemo } from "react";
import type { ModelDetail, Pricing } from "@/lib/types";
import { usePricing } from "./use-me";

/**
 * Model kartları GET /pricing → model_details'tan gelir (ad, açıklama, fiyat admin panelinden
 * değişebilir; koda sabit yazılmaz). Eski backend yalnızca models/model_multipliers dönerse
 * kartlar bunlardan, kimlik ad olarak kullanılarak üretilir.
 */
function toDetails(p: Pricing): ModelDetail[] {
  if (p.model_details?.length) return p.model_details;
  const ids = p.models?.length ? p.models : Object.keys(p.model_multipliers);
  return ids
    .map((id) => ({
      id,
      label: id,
      description: "",
      quality: 0,
      speed: 0,
      speakers: false,
      precise_timestamps: true,
      credits_per_minute: p.credits_per_minute * (p.model_multipliers[id] ?? 1),
    }))
    .sort((a, b) => a.credits_per_minute - b.credits_per_minute);
}

export function useModels() {
  const pricing = usePricing();
  const models = useMemo(() => toDetails(pricing), [pricing]);
  const defaultModel =
    pricing.default_model && models.some((m) => m.id === pricing.default_model)
      ? pricing.default_model
      : models[0]?.id;

  /** Eski işlerde model listede olmayabilir; o zaman kimliği olduğu gibi göster. */
  const label = useCallback(
    (id?: string | null) => (id ? (models.find((m) => m.id === id)?.label ?? id) : "—"),
    [models],
  );

  return { models, defaultModel, label, loaded: models.length > 0 };
}

export function estimateModelCredits(durationSec: number, m: ModelDetail): number {
  return Math.max(1, Math.ceil((durationSec / 60) * m.credits_per_minute));
}
