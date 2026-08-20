import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "campfire-codex:journal:v1";
const MAX_COLLECTION_SIZE = 100;
const MAX_COOKED_TIMES = 99;
const ROUTE_SAFE_ID = /^[A-Za-z0-9._-]{1,100}$/;

export interface CookedEntry {
  lastCookedAt: string;
  times: number;
}

export interface RecipeJournal {
  version: 1;
  saved: string[];
  cooked: Record<string, CookedEntry>;
  ratings: Record<string, number>;
}

const emptyJournal: RecipeJournal = {
  version: 1,
  saved: [],
  cooked: {},
  ratings: {},
};

function sanitizeJournal(value: unknown): RecipeJournal {
  if (!value || typeof value !== "object") return emptyJournal;
  const candidate = value as Partial<RecipeJournal>;
  const saved = Array.isArray(candidate.saved)
    ? [...new Set(candidate.saved.filter((id): id is string => typeof id === "string" && ROUTE_SAFE_ID.test(id)))].slice(0, MAX_COLLECTION_SIZE)
    : [];

  const cooked: Record<string, CookedEntry> = {};
  if (candidate.cooked && typeof candidate.cooked === "object") {
    for (const [id, raw] of Object.entries(candidate.cooked).slice(0, MAX_COLLECTION_SIZE)) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Partial<CookedEntry>;
      if (!ROUTE_SAFE_ID.test(id) || typeof entry.lastCookedAt !== "string" || !Number.isFinite(Date.parse(entry.lastCookedAt))) continue;
      cooked[id] = {
        lastCookedAt: entry.lastCookedAt,
        times: Math.min(MAX_COOKED_TIMES, Math.max(1, Math.round(Number(entry.times) || 1))),
      };
    }
  }

  const ratings: Record<string, number> = {};
  if (candidate.ratings && typeof candidate.ratings === "object") {
    for (const [id, raw] of Object.entries(candidate.ratings).slice(0, MAX_COLLECTION_SIZE)) {
      const rating = Math.round(Number(raw));
      if (ROUTE_SAFE_ID.test(id) && rating >= 1 && rating <= 5) ratings[id] = rating;
    }
  }

  return { version: 1, saved, cooked, ratings };
}

function readJournal() {
  if (typeof window === "undefined") return emptyJournal;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeJournal(JSON.parse(raw)) : emptyJournal;
  } catch {
    return emptyJournal;
  }
}

function persistJournal(journal: RecipeJournal) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(journal));
  } catch {
    // Browsers can disable localStorage. The UI still works for this tab.
  }
}

export function useRecipeJournal() {
  const [journal, setJournal] = useState<RecipeJournal>(() => readJournal());
  const journalRef = useRef(journal);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      if (!event.newValue) {
        journalRef.current = emptyJournal;
        setJournal(emptyJournal);
        return;
      }

      try {
        const next = sanitizeJournal(JSON.parse(event.newValue));
        journalRef.current = next;
        setJournal(next);
      } catch {
        // Ignore malformed cross-tab data rather than letting another tab break this one.
        journalRef.current = emptyJournal;
        setJournal(emptyJournal);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((mutator: (current: RecipeJournal) => RecipeJournal) => {
    const next = mutator(journalRef.current);
    journalRef.current = next;
    persistJournal(next);
    setJournal(next);
  }, []);

  const toggleSaved = useCallback(
    (id: string) => {
      if (!ROUTE_SAFE_ID.test(id)) return false;
      let savedNow = false;
      update((current) => {
        const exists = current.saved.includes(id);
        savedNow = !exists;
        return {
          ...current,
          saved: exists
            ? current.saved.filter((candidate) => candidate !== id)
            : [id, ...current.saved.filter((candidate) => candidate !== id)].slice(
                0,
                MAX_COLLECTION_SIZE,
              ),
        };
      });
      return savedNow;
    },
    [update],
  );

  const toggleCooked = useCallback(
    (id: string) => {
      if (!ROUTE_SAFE_ID.test(id)) return false;
      let cookedNow = false;
      update((current) => {
        const existing = current.cooked[id];
        const cooked = { ...current.cooked };
        if (existing) {
          delete cooked[id];
        } else {
          if (Object.keys(cooked).length < MAX_COLLECTION_SIZE) {
            cookedNow = true;
            cooked[id] = { lastCookedAt: new Date().toISOString(), times: 1 };
          }
        }
        return { ...current, cooked };
      });
      return cookedNow;
    },
    [update],
  );

  const recordAnotherCook = useCallback(
    (id: string) => {
      if (!ROUTE_SAFE_ID.test(id)) return;
      update((current) => {
        const existing = current.cooked[id];
        if (!existing && Object.keys(current.cooked).length >= MAX_COLLECTION_SIZE) return current;
        return {
          ...current,
          cooked: {
            ...current.cooked,
            [id]: {
              lastCookedAt: new Date().toISOString(),
              times: Math.min(MAX_COOKED_TIMES, (existing?.times ?? 0) + 1),
            },
          },
        };
      });
    },
    [update],
  );

  const setRating = useCallback(
    (id: string, rating: number) => {
      if (!ROUTE_SAFE_ID.test(id)) return;
      update((current) => {
        const ratings = { ...current.ratings };
        if (rating < 1 || rating > 5) delete ratings[id];
        else if (id in ratings || Object.keys(ratings).length < MAX_COLLECTION_SIZE) ratings[id] = Math.round(rating);
        return { ...current, ratings };
      });
    },
    [update],
  );

  const cookedIds = useMemo(
    () =>
      Object.entries(journal.cooked)
        .sort(
          ([, left], [, right]) =>
            new Date(right.lastCookedAt).getTime() - new Date(left.lastCookedAt).getTime(),
        )
        .map(([id]) => id),
    [journal.cooked],
  );

  return {
    journal,
    savedIds: journal.saved,
    cookedIds,
    isSaved: (id: string) => journal.saved.includes(id),
    isCooked: (id: string) => Boolean(journal.cooked[id]),
    cookedEntry: (id: string) => journal.cooked[id] ?? null,
    ratingFor: (id: string) => journal.ratings[id] ?? 0,
    toggleSaved,
    toggleCooked,
    recordAnotherCook,
    setRating,
  };
}
