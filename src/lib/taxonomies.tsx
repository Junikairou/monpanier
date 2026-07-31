import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createTaxonomyItem,
  deleteTaxonomyItem,
  listTaxonomy,
  renameTaxonomyItem,
  setTaxonomyOrder,
  swapTaxonomyPositions,
  TaxonomyItem,
  TaxonomyKind,
} from '../data/taxonomies';

interface TaxonomyContextValue {
  loading: boolean;
  courseTypes: TaxonomyItem[];
  categories: TaxonomyItem[];
  groceryCategories: TaxonomyItem[];
  mealSlots: TaxonomyItem[];
  label: (kind: TaxonomyKind, key: string) => string;
  iconFor: (key: string) => string;
  reload: () => Promise<void>;
  create: (kind: TaxonomyKind, label: string, icon?: string) => Promise<TaxonomyItem>;
  rename: (kind: TaxonomyKind, id: string, label: string, icon?: string) => Promise<void>;
  remove: (kind: TaxonomyKind, id: string) => Promise<void>;
  move: (kind: TaxonomyKind, id: string, direction: 'up' | 'down') => Promise<void>;
  reorder: (kind: TaxonomyKind, orderedIds: string[]) => Promise<void>;
}

const TaxonomyContext = createContext<TaxonomyContextValue | null>(null);

interface TaxonomyState {
  courseTypes: TaxonomyItem[];
  categories: TaxonomyItem[];
  groceryCategories: TaxonomyItem[];
  mealSlots: TaxonomyItem[];
}

const listFor = (kind: TaxonomyKind, state: TaxonomyState) =>
  kind === 'course_type' ? state.courseTypes
    : kind === 'category' ? state.categories
    : kind === 'meal_slot' ? state.mealSlots
    : state.groceryCategories;

export function TaxonomyProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [courseTypes, setCourseTypes] = useState<TaxonomyItem[]>([]);
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [groceryCategories, setGroceryCategories] = useState<TaxonomyItem[]>([]);
  const [mealSlots, setMealSlots] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [ct, cat, gc, ms] = await Promise.all([
        listTaxonomy('course_type'),
        listTaxonomy('category'),
        listTaxonomy('grocery_category'),
        listTaxonomy('meal_slot'),
      ]);
      setCourseTypes(ct);
      setCategories(cat);
      setGroceryCategories(gc);
      setMealSlots(ms);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload, userId]);

  const label = (kind: TaxonomyKind, key: string): string => {
    const list = listFor(kind, { courseTypes, categories, groceryCategories, mealSlots });
    return list.find((i) => i.key === key)?.label ?? key;
  };

  const iconFor = (key: string): string => groceryCategories.find((i) => i.key === key)?.icon ?? '📦';

  const create = async (kind: TaxonomyKind, labelText: string, icon?: string) => {
    const item = await createTaxonomyItem(kind, userId, labelText, icon);
    await reload();
    return item;
  };

  const rename = async (kind: TaxonomyKind, id: string, labelText: string, icon?: string) => {
    await renameTaxonomyItem(kind, id, labelText, icon);
    await reload();
  };

  const remove = async (kind: TaxonomyKind, id: string) => {
    await deleteTaxonomyItem(kind, id);
    await reload();
  };

  const move = async (kind: TaxonomyKind, id: string, direction: 'up' | 'down') => {
    const list = listFor(kind, { courseTypes, categories, groceryCategories, mealSlots });
    const idx = list.findIndex((i) => i.id === id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || targetIdx < 0 || targetIdx >= list.length) return;
    await swapTaxonomyPositions(kind, list[idx], list[targetIdx]);
    await reload();
  };

  const reorder = async (kind: TaxonomyKind, orderedIds: string[]) => {
    await setTaxonomyOrder(kind, orderedIds);
    await reload();
  };

  return (
    <TaxonomyContext.Provider
      value={{ loading, courseTypes, categories, groceryCategories, mealSlots, label, iconFor, reload, create, rename, remove, move, reorder }}
    >
      {children}
    </TaxonomyContext.Provider>
  );
}

export function useTaxonomies(): TaxonomyContextValue {
  const ctx = useContext(TaxonomyContext);
  if (!ctx) throw new Error('useTaxonomies must be used within a TaxonomyProvider');
  return ctx;
}
