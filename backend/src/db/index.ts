import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { SCENARIO_PRESETS } from '@cuas/shared';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgrespassword@localhost:5432/cuas_simulator';

export let isPostgresConnected = false;
let pool: pg.Pool | null = null;
export let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// In-memory fallback repositories if PostgreSQL container is offline
export const memoryStore = {
  scenarios: new Map<string, any>(),
  gameSessions: new Map<string, any>(),
  auditEvents: new Map<string, any[]>(),
  aarScorecards: new Map<string, any>()
};

// Seed presets into memory store initially
for (const preset of SCENARIO_PRESETS) {
  memoryStore.scenarios.set(preset.id, {
    id: preset.id,
    name: preset.name,
    codename: preset.codename,
    difficulty: preset.difficulty,
    description: preset.description,
    doctrineObjective: preset.doctrineObjective,
    recommendedTactic: preset.recommendedTactic,
    threatCount: preset.threatCount,
    durationSeconds: preset.durationSeconds,
    config: preset.droneConfigs,
    createdAt: new Date()
  });
}

export async function initDatabase() {
  try {
    const isNeon = connectionString.includes('neon.tech') || connectionString.includes('sslmode=require');
    const isPlaceholder = connectionString.includes('YOUR_NEON_PASSWORD') || connectionString.includes('ep-sample-pool');
    
    if (isPlaceholder) {
      throw new Error('Placeholder NeonDB connection string detected in .env');
    }

    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
      ...(isNeon ? { ssl: { rejectUnauthorized: false } } : {})
    });

    const client = await pool.connect();
    console.log(`[DB] Connected successfully to ${isNeon ? 'NeonDB Cloud PostgreSQL' : 'PostgreSQL'}.`);
    isPostgresConnected = true;
    db = drizzle(pool, { schema });

    // Ensure schema tables exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id VARCHAR(64) PRIMARY KEY,
        name TEXT NOT NULL,
        codename TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        description TEXT NOT NULL,
        doctrine_objective TEXT NOT NULL,
        recommended_tactic TEXT NOT NULL,
        threat_count INTEGER NOT NULL,
        duration_seconds INTEGER NOT NULL,
        config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS game_sessions (
        id VARCHAR(64) PRIMARY KEY,
        scenario_id VARCHAR(64) NOT NULL,
        status TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        final_score INTEGER,
        grade TEXT,
        metrics JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        payload JSONB
      );

      CREATE TABLE IF NOT EXISTS aar_scorecards (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        scenario_id VARCHAR(64) NOT NULL,
        grade TEXT NOT NULL,
        overall_score INTEGER NOT NULL,
        breakdown JSONB NOT NULL,
        metrics JSONB NOT NULL,
        tactical_tips JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Seed preset scenarios into Postgres
    for (const preset of SCENARIO_PRESETS) {
      await client.query(`
        INSERT INTO scenarios (id, name, codename, difficulty, description, doctrine_objective, recommended_tactic, threat_count, duration_seconds, config)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          codename = EXCLUDED.codename,
          difficulty = EXCLUDED.difficulty,
          description = EXCLUDED.description,
          doctrine_objective = EXCLUDED.doctrine_objective,
          recommended_tactic = EXCLUDED.recommended_tactic,
          threat_count = EXCLUDED.threat_count,
          duration_seconds = EXCLUDED.duration_seconds,
          config = EXCLUDED.config;
      `, [
        preset.id,
        preset.name,
        preset.codename,
        preset.difficulty,
        preset.description,
        preset.doctrineObjective,
        preset.recommendedTactic,
        preset.threatCount,
        preset.durationSeconds,
        JSON.stringify(preset.droneConfigs)
      ]);
    }
    console.log('[DB] Preset scenarios seeded into PostgreSQL.');
    client.release();
  } catch (err: any) {
    console.warn(`[DB] PostgreSQL connection note: ${err.message}.`);
    console.warn('[DB] Operating in resilient active memory-store mode. (Postgres can be started via docker-compose)');
    isPostgresConnected = false;
  }
}

export async function saveSession(session: {
  id: string;
  scenarioId: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  finalScore?: number;
  grade?: string;
  metrics?: any;
}) {
  memoryStore.gameSessions.set(session.id, session);
  if (isPostgresConnected && pool) {
    try {
      await pool.query(`
        INSERT INTO game_sessions (id, scenario_id, status, start_time, end_time, final_score, grade, metrics)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          end_time = EXCLUDED.end_time,
          final_score = EXCLUDED.final_score,
          grade = EXCLUDED.grade,
          metrics = EXCLUDED.metrics;
      `, [
        session.id,
        session.scenarioId,
        session.status,
        session.startTime,
        session.endTime || null,
        session.finalScore || null,
        session.grade || null,
        JSON.stringify(session.metrics || {})
      ]);
    } catch (err: any) {
      console.error('[DB] Failed to persist game_session to PG:', err.message);
    }
  }
}

export async function saveAuditEvent(event: {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: string;
  description: string;
  severity: string;
  payload?: any;
}) {
  const list = memoryStore.auditEvents.get(event.sessionId) || [];
  list.push(event);
  memoryStore.auditEvents.set(event.sessionId, list);

  if (isPostgresConnected && pool) {
    try {
      await pool.query(`
        INSERT INTO audit_events (id, session_id, timestamp, type, description, severity, payload)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING;
      `, [
        event.id,
        event.sessionId,
        event.timestamp,
        event.type,
        event.description,
        event.severity,
        JSON.stringify(event.payload || {})
      ]);
    } catch (err: any) {
      console.error('[DB] Failed to persist audit_event to PG:', err.message);
    }
  }
}

export async function saveAARScorecard(scorecard: {
  id: string;
  sessionId: string;
  scenarioId: string;
  grade: string;
  overallScore: number;
  breakdown: any;
  metrics: any;
  tacticalTips: string[];
}) {
  memoryStore.aarScorecards.set(scorecard.sessionId, scorecard);
  if (isPostgresConnected && pool) {
    try {
      await pool.query(`
        INSERT INTO aar_scorecards (id, session_id, scenario_id, grade, overall_score, breakdown, metrics, tactical_tips)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          grade = EXCLUDED.grade,
          overall_score = EXCLUDED.overall_score,
          breakdown = EXCLUDED.breakdown,
          metrics = EXCLUDED.metrics,
          tactical_tips = EXCLUDED.tactical_tips;
      `, [
        scorecard.id,
        scorecard.sessionId,
        scorecard.scenarioId,
        scorecard.grade,
        scorecard.overallScore,
        JSON.stringify(scorecard.breakdown),
        JSON.stringify(scorecard.metrics),
        JSON.stringify(scorecard.tacticalTips)
      ]);
      console.log(`[DB] AAR Scorecard saved for session ${scorecard.sessionId} (Score: ${scorecard.overallScore}, Grade: ${scorecard.grade})`);
    } catch (err: any) {
      console.error('[DB] Failed to persist AAR scorecard to PG:', err.message);
    }
  }
}
