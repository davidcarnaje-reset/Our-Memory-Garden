import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  ensureMemoriesTable,
  getDbPool,
  UnlockedVaseRow,
} from "@/src/lib/db";
import { STARTER_VASE } from "@/src/lib/vaseCatalog";

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const monthKey = typeof body?.month_key === "string" ? body.month_key.trim() : "";
    const vaseCode = typeof body?.vase_code === "string" ? body.vase_code.trim() : "";

    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return NextResponse.json({ error: "Invalid month_key." }, { status: 400 });
    }

    await ensureMemoriesTable();
    const pool = getDbPool();

    if (vaseCode !== STARTER_VASE.code) {
      const [unlockedRows] = await pool.execute<UnlockedVaseRow[]>(
        `SELECT vase_code FROM unlocked_vases WHERE vase_code = ?`,
        [vaseCode]
      );
      if (unlockedRows.length === 0) {
        return NextResponse.json(
          { error: "Unlock this vase before equipping it." },
          { status: 403 }
        );
      }
    }

    await pool.execute(
      `INSERT INTO month_vase_equip (month_key, vase_code)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE vase_code = VALUES(vase_code)`,
      [monthKey, vaseCode]
    );

    return NextResponse.json({
      equipped: { month_key: monthKey, vase_code: vaseCode },
    });
  } catch (error) {
    console.error("POST /api/garden/equip-vase error:", error);
    return NextResponse.json(
      { error: "Failed to equip vase." },
      { status: 500 }
    );
  }
}
