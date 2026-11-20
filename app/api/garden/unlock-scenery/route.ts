import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  ensureMemoriesTable,
  GardenStatsRow,
  getDbPool,
  UnlockedSceneryRow,
} from "@/src/lib/db";

export const SCENERY_SHARD_COST = 10;

const VALID_UNLOCKABLE_SCENERIES = new Set([
  "cherry_blossom",
  "starry_tent",
  "paris_eiffel",
  "lantern_lake",
]);

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sceneryCode =
      typeof body?.scenery_code === "string" ? body.scenery_code.trim() : "";

    if (!VALID_UNLOCKABLE_SCENERIES.has(sceneryCode)) {
      return NextResponse.json(
        { error: "Unknown garden scenery." },
        { status: 400 }
      );
    }

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [existingRows] = await pool.execute<UnlockedSceneryRow[]>(
      `SELECT scenery_code FROM unlocked_sceneries WHERE scenery_code = ?`,
      [sceneryCode]
    );

    if (existingRows.length > 0) {
      return NextResponse.json(
        { error: "This scenery is already unlocked!" },
        { status: 409 }
      );
    }

    const [statsRows] = await pool.execute<GardenStatsRow[]>(
      `SELECT id, current_streak, longest_streak, last_watered_date, last_watered_by, partner_watered_today, vase_shards
       FROM garden_stats
       WHERE id = 1`
    );

    const stats = statsRows[0];
    if (!stats || stats.vase_shards < SCENERY_SHARD_COST) {
      return NextResponse.json(
        {
          error: `You need ${SCENERY_SHARD_COST} Shards to unlock this scenery.`,
        },
        { status: 400 }
      );
    }

    const newShards = stats.vase_shards - SCENERY_SHARD_COST;
    await pool.execute(
      `UPDATE garden_stats SET vase_shards = ? WHERE id = 1`,
      [newShards]
    );
    await pool.execute(
      `INSERT INTO unlocked_sceneries (scenery_code) VALUES (?)`,
      [sceneryCode]
    );

    return NextResponse.json({
      stats: {
        ...stats,
        partner_watered_today: Boolean(stats.partner_watered_today),
        vase_shards: newShards,
      },
      unlockedScenery: sceneryCode,
    });
  } catch (error) {
    console.error("POST /api/garden/unlock-scenery error:", error);
    return NextResponse.json(
      { error: "Failed to unlock scenery." },
      { status: 500 }
    );
  }
}
