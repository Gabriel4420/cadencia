import {
  BUILT_IN_CATEGORY_IDS,
  CATEGORY_LABELS,
  type BuiltInTaskCategory,
  type Task,
} from '../types';

export const MAX_CUSTOM_CATEGORIES = 20;
export const MAX_CATEGORY_LENGTH = 32;

export interface CategoryOption {
  id: string;
  label: string;
  isBuiltIn: boolean;
}

function normalizeForComparison(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function normalizeCategoryName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_CATEGORY_LENGTH);
}

export function isBuiltInCategory(category: string): category is BuiltInTaskCategory {
  return (BUILT_IN_CATEGORY_IDS as string[]).includes(category);
}

export function getCategoryLabel(category: string): string {
  if (isBuiltInCategory(category)) {
    return CATEGORY_LABELS[category];
  }
  const cleaned = normalizeCategoryName(category);
  return cleaned || CATEGORY_LABELS.work;
}

export function sanitizeCustomCategories(rawList: unknown): string[] {
  if (!Array.isArray(rawList)) return [];
  const builtInNorms = new Set<string>([
    ...BUILT_IN_CATEGORY_IDS.map((id) => normalizeForComparison(id)),
    ...BUILT_IN_CATEGORY_IDS.map((id) => normalizeForComparison(CATEGORY_LABELS[id])),
  ]);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const cleaned = normalizeCategoryName(item);
    if (!cleaned) continue;
    const norm = normalizeForComparison(cleaned);
    if (builtInNorms.has(norm) || seen.has(norm)) continue;
    seen.add(norm);
    result.push(cleaned);
    if (result.length >= MAX_CUSTOM_CATEGORIES) break;
  }

  return result;
}

export function sanitizeTaskCategory(raw: string): string {
  if (isBuiltInCategory(raw)) return raw;
  const cleaned = normalizeCategoryName(raw);
  if (!cleaned) return 'work';

  // Map built-in label text (e.g. "Trabalho") back to its canonical built-in ID
  const norm = normalizeForComparison(cleaned);
  for (const id of BUILT_IN_CATEGORY_IDS) {
    if (norm === normalizeForComparison(id) || norm === normalizeForComparison(CATEGORY_LABELS[id])) {
      return id;
    }
  }
  return cleaned;
}

export interface AddCategoryResult {
  ok: boolean;
  categoryId?: string;
  customCategories: string[];
  error?: string;
  alreadyExists?: boolean;
}

export function addCustomCategoryToList(
  existingCustom: string[],
  rawInput: string
): AddCategoryResult {
  const cleaned = normalizeCategoryName(rawInput);
  if (!cleaned) {
    return {
      ok: false,
      customCategories: existingCustom,
      error: 'Digite um nome para a nova categoria.',
    };
  }

  const norm = normalizeForComparison(cleaned);

  // Check built-in categories first
  for (const id of BUILT_IN_CATEGORY_IDS) {
    if (norm === normalizeForComparison(id) || norm === normalizeForComparison(CATEGORY_LABELS[id])) {
      return {
        ok: true,
        categoryId: id,
        customCategories: existingCustom,
        alreadyExists: true,
      };
    }
  }

  // Check existing custom categories
  const match = existingCustom.find((c) => normalizeForComparison(c) === norm);
  if (match) {
    return {
      ok: true,
      categoryId: match,
      customCategories: existingCustom,
      alreadyExists: true,
    };
  }

  if (existingCustom.length >= MAX_CUSTOM_CATEGORIES) {
    return {
      ok: false,
      customCategories: existingCustom,
      error: `Limite máximo de ${MAX_CUSTOM_CATEGORIES} categorias personalizadas atingido.`,
    };
  }

  return {
    ok: true,
    categoryId: cleaned,
    customCategories: [...existingCustom, cleaned],
    alreadyExists: false,
  };
}

export function removeCustomCategoryFromList(existingCustom: string[], categoryToRemove: string): string[] {
  const targetNorm = normalizeForComparison(categoryToRemove);
  return existingCustom.filter((c) => normalizeForComparison(c) !== targetNorm);
}

/**
 * Returns built-in categories + saved custom categories + any extra category keys referenced by tasks.
 */
export function getAllCategoryOptions(
  customCategories: string[] = [],
  tasks: Pick<Task, 'category'>[] = []
): CategoryOption[] {
  const options: CategoryOption[] = BUILT_IN_CATEGORY_IDS.map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    isBuiltIn: true,
  }));

  const seen = new Set<string>(
    options.flatMap((opt) => [normalizeForComparison(opt.id), normalizeForComparison(opt.label)])
  );

  for (const custom of customCategories) {
    const cleaned = normalizeCategoryName(custom);
    if (!cleaned) continue;
    const norm = normalizeForComparison(cleaned);
    if (seen.has(norm)) continue;
    seen.add(norm);
    options.push({
      id: cleaned,
      label: cleaned,
      isBuiltIn: false,
    });
  }

  for (const task of tasks) {
    if (!task.category || isBuiltInCategory(task.category)) continue;
    const cleaned = normalizeCategoryName(task.category);
    if (!cleaned) continue;
    const norm = normalizeForComparison(cleaned);
    if (seen.has(norm)) continue;
    seen.add(norm);
    options.push({
      id: cleaned,
      label: cleaned,
      isBuiltIn: false,
    });
  }

  return options;
}
