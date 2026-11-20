import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  ensureMemoriesTable,
  GardenStatsRow,
  getDbPool,
  MonthVaseEquipRow,
  UnlockedSceneryRow,
  UnlockedVaseRow,
} from "@/src/lib/db";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const yearParam = request.nextUrl.searchParams.get("year") ?? "2026";
    if (!/^\d{4}$/.test(yearParam)) {
      return NextResponse.json({ error: "Invalid year parameter." }, { status: 400 });
    }

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [statsRows] = await pool.execute<GardenStatsRow[]>(
      `SELECT id, current_streak, longest_streak, last_watered_date, last_watered_by, partner_watered_today, vase_shards
       FROM garden_stats
       WHERE id = 1`
    );

    const [unlockedRows] = await pool.execute<UnlockedVaseRow[]>(
      `SELECT vase_code, unlocked_at FROM unlocked_vases ORDER BY unlocked_at ASC`
    );

    const [equipRows] = await pool.execute<MonthVaseEquipRow[]>(
      `SELECT month_key, vase_code FROM month_vase_equip WHERE month_key LIKE ?`,
      [`${yearParam}-%`]
    );

    const [sceneryRows] = await pool.execute<UnlockedSceneryRow[]>(
      `SELECT scenery_code FROM unlocked_sceneries ORDER BY unlocked_at ASC`
    );

    const rawStats = statsRows[0];
    const stats = rawStats
      ? {
          ...rawStats,
          partner_watered_today: Boolean(rawStats.partner_watered_today),
        }
      : {
          id: 1,
          current_streak: 0,
          longest_streak: 0,
          last_watered_date: null,
          last_watered_by: null,
          partner_watered_today: false,
          vase_shards: 0,
        };

    return NextResponse.json({
      stats,
      unlockedVases: unlockedRows.map((r) => r.vase_code),
      unlockedSceneries: sceneryRows.map((r) => r.scenery_code),
      equippedVases: Object.fromEntries(
        equipRows.map((r) => [r.month_key, r.vase_code])
      ),
    });
  } catch (error) {
    console.error("GET /api/garden/status error:", error);
    return NextResponse.json(
      { error: "Failed to load garden progress." },
      { status: 500 }
    );
  }
}
