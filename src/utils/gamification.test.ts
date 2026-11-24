import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevelInfo,
  calculateTaskReward,
  evaluateAchievements,
  redeemReward,
} from './gamification';
import type { Task, UserGamificationProfile } from '../types';

const baseProfile: UserGamificationProfile = {
  userId: 'u1',
  xp: 260,
  coins: 100,
  streakDays: 3,
  streakFreezes: 0,
  dailyGoal: 5,
  focusMinutesTotal: 90,
  unlockedRewardIds: [],
  activeAccent: 'cobalt',
  updatedAt: '2026-11-24T10:00:00.000Z',
};

const sampleTask: Task = {
  id: 't1',
  userId: 'u1',
  title: 'Entregar relatório',
  priority: 'high',
  category: 'work',
  status: 'completed',
  dueDate: '2026-11-24',
  scheduledTime: '09:00',
  durationMinutes: 45,
  reminderMinutesBefore: 15,
  completedAt: '2026-11-24T09:30:00.000Z',
  createdAt: '2026-11-24T08:00:00.000Z',
  updatedAt: '2026-11-24T09:30:00.000Z',
};

test('calculateLevelInfo maps XP to accurate level and progress percentage', () => {
  const lvl1 = calculateLevelInfo(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.progressPct, 0);

  const lvl3 = calculateLevelInfo(250);
  assert.equal(lvl3.level, 3);
  assert.equal(lvl3.progressPct, 0);

  const midLvl3 = calculateLevelInfo(350);
  assert.equal(midLvl3.level, 3);
  assert.equal(midLvl3.progressPct, 50);
});

test('calculateTaskReward grants higher XP/coins for high priority and on-time bonus', () => {
  const onTime = calculateTaskReward(sampleTask, new Date(2026, 10, 24, 10, 0));
  const late = calculateTaskReward(sampleTask, new Date(2026, 10, 26, 10, 0));

  assert.equal(onTime.onTimeBonus, true);
  assert.equal(late.onTimeBonus, false);
  assert.equal(onTime.xp, 65); // 50 + 15
  assert.equal(late.xp, 50);
  assert.ok(onTime.coins > late.coins);
});

test('redeemReward deducts coins, equips accent reward, and rejects insufficient funds', () => {
  const res1 = redeemReward(baseProfile, 'accent_emerald');
  assert.equal(res1.redeemed, true);
  assert.equal(res1.profile.coins, 40);
  assert.equal(res1.profile.activeAccent, 'emerald');
  assert.ok(res1.profile.unlockedRewardIds.includes('accent_emerald'));

  const res2 = redeemReward(res1.profile, 'accent_amber'); // costs 80, only 40 left
  assert.equal(res2.redeemed, false);
  assert.equal(res2.profile.coins, 40);
});

test('evaluateAchievements unlocks expected achievements based on task and streak state', () => {
  const achievements = evaluateAchievements([sampleTask], baseProfile, 0);
  const firstStep = achievements.find((a) => a.id === 'first_step');
  const streak3 = achievements.find((a) => a.id === 'streak_3');
  const streak7 = achievements.find((a) => a.id === 'streak_7');

  assert.equal(firstStep?.unlocked, true);
  assert.equal(streak3?.unlocked, true);
  assert.equal(streak7?.unlocked, false);
});
