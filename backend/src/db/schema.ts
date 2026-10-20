import { pgTable, text, integer, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';

export const scenarios = pgTable('scenarios', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  codename: text('codename').notNull(),
  difficulty: text('difficulty').notNull(),
  description: text('description').notNull(),
  doctrineObjective: text('doctrine_objective').notNull(),
  recommendedTactic: text('recommended_tactic').notNull(),
  threatCount: integer('threat_count').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const gameSessions = pgTable('game_sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  scenarioId: varchar('scenario_id', { length: 64 }).notNull(),
  status: text('status').notNull(), // 'active' | 'completed' | 'failed'
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  finalScore: integer('final_score'),
  grade: text('grade'), // 'S' | 'A' | 'B' | 'C' | 'F'
  metrics: jsonb('metrics'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const auditEvents = pgTable('audit_events', {
  id: varchar('id', { length: 64 }).primaryKey(),
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull(),
  payload: jsonb('payload')
});

export const aarScorecards = pgTable('aar_scorecards', {
  id: varchar('id', { length: 64 }).primaryKey(),
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  scenarioId: varchar('scenario_id', { length: 64 }).notNull(),
  grade: text('grade').notNull(),
  overallScore: integer('overall_score').notNull(),
  breakdown: jsonb('breakdown').notNull(),
  metrics: jsonb('metrics').notNull(),
  tacticalTips: jsonb('tactical_tips').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
