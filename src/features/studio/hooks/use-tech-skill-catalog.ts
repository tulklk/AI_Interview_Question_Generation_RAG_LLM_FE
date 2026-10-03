"use client";

import { useEffect, useState } from "react";
import { listTechSkills } from "@/features/studio/services/studio.service";
import type { TechSkillCatalogItem } from "@/features/studio/utils/focus-area-jd";

let cached: TechSkillCatalogItem[] | null = null;
let pending: Promise<TechSkillCatalogItem[]> | null = null;

function loadCatalog(): Promise<TechSkillCatalogItem[]> {
  if (cached) return Promise.resolve(cached);
  pending ??= listTechSkills()
    .then((items) => {
      cached = items;
      return items;
    })
    .catch(() => []);
  return pending;
}

/** Catalog TechSkill dùng chung cho mọi editor focus trong phiên. */
export function useTechSkillCatalog(): TechSkillCatalogItem[] {
  const [items, setItems] = useState<TechSkillCatalogItem[]>(cached ?? []);

  useEffect(() => {
    let alive = true;
    void loadCatalog().then((next) => {
      if (alive) setItems(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return items;
}
