import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  ensureMemoriesTable,
  GardenStatsRow,
  getDbPool,
  UnlockedVaseRow,
} from "@/src/lib/db";
import { getVaseShardCost, SPECIAL_VASES } from "@/src/lib/vaseCatalog";

const VASES_BY_CODE = new Map(SPECIAL_VASES.map((v) => [v.code, v]));

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const vaseCode = typeof body?.vase_code === "string" ? body.vase_code.trim() : "";

    const targetVase = VASES_BY_CODE.get(vaseCode);
    if (!targetVase) {
      return NextResponse.json(
        { error: "Unknown special vase." },
        { status: 400 }
      );
    }

    const cost = getVaseShardCost(targetVase.rarity);

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [existingRows] = await pool.execute<UnlockedVaseRow[]>(
      `SELECT vase_code FROM unlocked_vases WHERE vase_code = ?`,
      [vaseCode]
    );

    if (existingRows.length > 0) {
      return NextResponse.json(
        { error: "This vase is already unlocked!" },
        { status: 409 }
      );
    }

    const [statsRows] = await pool.execute<GardenStatsRow[]>(
      `SELECT id, current_streak, longest_streak, last_watered_date, last_watered_by, partner_watered_today, vase_shards
       FROM garden_stats
       WHERE id = 1`
    );

    const stats = statsRows[0];
    if (!stats || stats.vase_shards < cost) {
      return NextResponse.json(
        { error: `You need ${cost} Vase Shards to unlock this vase.` },
        { status: 400 }
      );
    }

    const newShards = stats.vase_shards - cost;
    await pool.execute(
      `UPDATE garden_stats SET vase_shards = ? WHERE id = 1`,
      [newShards]
    );
    await pool.execute(
      `INSERT INTO unlocked_vases (vase_code) VALUES (?)`,
      [vaseCode]
    );

    return NextResponse.json({
      stats: {
        ...stats,
        partner_watered_today: Boolean(stats.partner_watered_today),
        vase_shards: newShards,
      },
      unlockedCode: vaseCode,
    });
  } catch (error) {
    console.error("POST /api/garden/unlock-vase error:", error);
    return NextResponse.json(
      { error: "Failed to unlock vase." },
      { status: 500 }
    );
  }
}
