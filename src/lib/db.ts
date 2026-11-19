import mysql, { Pool, RowDataPacket } from "mysql2/promise";

export type MemoryMood = "date_night" | "travel" | "milestone" | "cozy";

export interface MemoryReply {
  id: number;
  memory_id: number;
  author: string;
  message: string;
  reaction: string | null;
  created_at: string;
}

export interface Memory {
  id: number;
  memory_date: string;
  month_key: string;
  note: string;
  drive_file_id: string;
  drive_file_ids: string[];
  uploaded_by: string;
  mood: MemoryMood;
  unlock_date: string | null;
  created_at: string;
  replies?: MemoryReply[];
}

export interface WateringLog {
  id: number;
  watered_by: string;
  watered_at: string;
}

export interface GardenPlacement {
  month_key: string;
  x_percent: number;
  y_percent: number;
  scale: number;
  updated_by: string;
  updated_at: string;
}

export interface MemoryRow extends RowDataPacket {
  id: number;
  memory_date: string;
  month_key: string;
  note: string;
  drive_file_id: string;
  drive_file_ids: string | null;
  uploaded_by: string;
  mood: MemoryMood;
  unlock_date: string | null;
  created_at: string;
}

export function parseDriveFileIds(
  rawJson: string | null | undefined,
  fallbackId: string
): string[] {
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0
        );
        if (clean.length > 0) return clean;
      }
    } catch {
      // Fallback to single drive_file_id
    }
  }
  return fallbackId ? [fallbackId] : [];
}
export interface MemoryReplyRow extends RowDataPacket, MemoryReply {}
export interface WateringLogRow extends RowDataPacket, WateringLog {}
export interface GardenPlacementRow extends RowDataPacket, GardenPlacement {}

declare global {
  var __memoryGardenPool: Pool | undefined;
  var __memoryGardenTableReady: Promise<void> | undefined;
}

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not configured.");
  }

  return mysql.createPool({
    uri: databaseUrl,
    ssl: {
      rejectUnauthorized: true,
    },
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 60000,
    enableKeepAlive: true,
  });
}

export function getDbPool(): Pool {
  if (!globalThis.__memoryGardenPool) {
    globalThis.__memoryGardenPool = createPool();
  }
  return globalThis.__memoryGardenPool;
}

export async function ensureMemoriesTable(): Promise<void> {
  if (!globalThis.__memoryGardenTableReady) {
    const pool = getDbPool();
    globalThis.__memoryGardenTableReady = (async () => {
      await pool.execute(
        `CREATE TABLE IF NOT EXISTS memories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          memory_date DATE NOT NULL,
          month_key VARCHAR(7) NOT NULL,
          note TEXT NOT NULL,
          drive_file_id VARCHAR(255) NOT NULL,
          uploaded_by VARCHAR(50) NOT NULL,
          mood VARCHAR(32) NOT NULL DEFAULT 'cozy',
          unlock_date DATE NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      );

      // Safely add new columns if the table already existed from an earlier version
      const [columns] = await pool.execute<RowDataPacket[]>(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'memories'`
      );
      const colNames = new Set(columns.map((c) => String(c.COLUMN_NAME)));

      if (!colNames.has("mood")) {
        await pool.execute(
          `ALTER TABLE memories ADD COLUMN mood VARCHAR(32) NOT NULL DEFAULT 'cozy'`
        );
      }
      if (!colNames.has("unlock_date")) {
        await pool.execute(
          `ALTER TABLE memories ADD COLUMN unlock_date DATE NULL`
        );
      }
      if (!colNames.has("drive_file_ids")) {
        await pool.execute(
          `ALTER TABLE memories ADD COLUMN drive_file_ids TEXT NULL`
        );
      }

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS memory_replies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          memory_id INT NOT NULL,
          author VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          reaction VARCHAR(16) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_memory_id (memory_id)
        );`
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS garden_watering (
          id INT AUTO_INCREMENT PRIMARY KEY,
          watered_by VARCHAR(50) NOT NULL,
          watered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS garden_placements (
          month_key VARCHAR(7) PRIMARY KEY,
          x_percent DOUBLE NOT NULL,
          y_percent DOUBLE NOT NULL,
          scale DOUBLE NOT NULL DEFAULT 1,
          updated_by VARCHAR(50) NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );`
      );
    })().catch((error) => {
      globalThis.__memoryGardenTableReady = undefined;
      throw error;
    });
  }

  return globalThis.__memoryGardenTableReady;
}
