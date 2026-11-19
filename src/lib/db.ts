import mysql, { Pool, RowDataPacket } from "mysql2/promise";

export interface Memory {
  id: number;
  memory_date: string;
  month_key: string;
  note: string;
  drive_file_id: string;
  uploaded_by: string;
  created_at: string;
}

export interface MemoryRow extends RowDataPacket, Memory {}

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
    globalThis.__memoryGardenTableReady = pool
      .execute(
        `CREATE TABLE IF NOT EXISTS memories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          memory_date DATE NOT NULL,
          month_key VARCHAR(7) NOT NULL,
          note TEXT NOT NULL,
          drive_file_id VARCHAR(255) NOT NULL,
          uploaded_by VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      )
      .then(() => undefined)
      .catch((error) => {
        globalThis.__memoryGardenTableReady = undefined;
        throw error;
      });
  }

  return globalThis.__memoryGardenTableReady;
}
