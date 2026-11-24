import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCustomCategoryToList,
  getAllCategoryOptions,
  getCategoryLabel,
  MAX_CUSTOM_CATEGORIES,
  removeCustomCategoryFromList,
  sanitizeCustomCategories,
  sanitizeTaskCategory,
} from './categories';

test('addCustomCategoryToList adds trimmed custom category and prevents built-in or case/accent duplicates', () => {
  const res1 = addCustomCategoryToList([], '  Financeiro  ');
  assert.equal(res1.ok, true);
  assert.equal(res1.alreadyExists, false);
  assert.equal(res1.categoryId, 'Financeiro');
  assert.deepEqual(res1.customCategories, ['Financeiro']);

  // Duplicate custom (different case)
  const res2 = addCustomCategoryToList(res1.customCategories, 'financeiro');
  assert.equal(res2.ok, true);
  assert.equal(res2.alreadyExists, true);
  assert.equal(res2.categoryId, 'Financeiro');
  assert.deepEqual(res2.customCategories, ['Financeiro']);

  // Built-in match with accent/case difference ("saude" -> "health")
  const res3 = addCustomCategoryToList(res1.customCategories, 'saude');
  assert.equal(res3.ok, true);
  assert.equal(res3.alreadyExists, true);
  assert.equal(res3.categoryId, 'health');
  assert.deepEqual(res3.customCategories, ['Financeiro']);

  // Empty input rejected
  const resEmpty = addCustomCategoryToList([], '   ');
  assert.equal(resEmpty.ok, false);
  assert.ok(resEmpty.error);
});

test('addCustomCategoryToList enforces maximum custom category limit', () => {
  const fullList = Array.from({ length: MAX_CUSTOM_CATEGORIES }, (_, i) => `Categoria ${i + 1}`);
  const res = addCustomCategoryToList(fullList, 'Extra');
  assert.equal(res.ok, false);
  assert.equal(res.customCategories.length, MAX_CUSTOM_CATEGORIES);
});

test('getCategoryLabel, sanitizeTaskCategory, and getAllCategoryOptions merge built-in, custom, and task categories', () => {
  assert.equal(getCategoryLabel('work'), 'Trabalho');
  assert.equal(getCategoryLabel('Projetos'), 'Projetos');
  assert.equal(sanitizeTaskCategory('Trabalho'), 'work');
  assert.equal(sanitizeTaskCategory('Design UI'), 'Design UI');

  const options = getAllCategoryOptions(['Financeiro'], [
    { category: 'work' },
    { category: 'Viagens' },
  ]);
  assert.deepEqual(
    options.map((o) => o.label),
    ['Trabalho', 'Estudos', 'Saúde', 'Pessoal', 'Financeiro', 'Viagens']
  );

  const afterRemove = removeCustomCategoryFromList(['Financeiro', 'Casa'], 'financeiro');
  assert.deepEqual(afterRemove, ['Casa']);

  assert.deepEqual(
    sanitizeCustomCategories(['Trabalho', '  Casa  ', 'casa', '', 'Projetos']),
    ['Casa', 'Projetos']
  );
});
