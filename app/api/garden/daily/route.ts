import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  DailyWaterPhotoRow,
  ensureMemoriesTable,
  getDbPool,
} from "@/src/lib/db";
import { getManilaCycleDates } from "@/src/lib/manilaTime";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureMemoriesTable();
    const pool = getDbPool();
    const { today: cycleKey } = getManilaCycleDates();

    const [rows] = await pool.execute<DailyWaterPhotoRow[]>(
      `SELECT id, cycle_key, uploaded_by, caption, drive_file_ids, created_at
       FROM daily_water_photos
       WHERE cycle_key = ?
       ORDER BY id ASC`,
      [cycleKey]
    );

    const entries = rows.map((row) => {
      let fileIds: string[] = [];
      try {
        const parsed = JSON.parse(row.drive_file_ids);
        if (Array.isArray(parsed)) {
          fileIds = parsed.filter((x): x is string => typeof x === "string");
        }
      } catch {
        fileIds = [];
      }
      return {
        id: row.id,
        cycle_key: row.cycle_key,
        uploaded_by: row.uploaded_by,
        caption: row.caption,
        drive_file_ids: fileIds,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ cycleKey, entries });
  } catch (error) {
    console.error("GET /api/garden/daily error:", error);
    return NextResponse.json(
      { error: "Failed to load daily garden photos." },
      { status: 500 }
    );
  }
}
