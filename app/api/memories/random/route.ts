import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/src/lib/auth";
import { ensureMemoriesTable, getDbPool, MemoryRow } from "@/src/lib/db";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureMemoriesTable();
    const pool = getDbPool();
    const today = new Date().toISOString().slice(0, 10);

    const [rows] = await pool.execute<MemoryRow[]>(
      `SELECT id, memory_date, month_key, note, drive_file_id, uploaded_by, mood, unlock_date, created_at
       FROM memories
       WHERE unlock_date IS NULL OR unlock_date <= ?
       ORDER BY RAND()
       LIMIT 1`,
      [today]
    );

    return NextResponse.json({ memory: rows[0] ?? null });
  } catch (error) {
    console.error("GET /api/memories/random error:", error);
    return NextResponse.json(
      { error: "Failed to pick a random flower." },
      { status: 500 }
    );
  }
}
