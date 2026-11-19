import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  ensureMemoriesTable,
  GardenPlacementRow,
  getDbPool,
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

    const [rows] = await pool.execute<GardenPlacementRow[]>(
      `SELECT month_key, x_percent, y_percent, scale, updated_by, updated_at
       FROM garden_placements
       WHERE month_key LIKE ?
       ORDER BY y_percent ASC`,
      [`${yearParam}-%`]
    );

    return NextResponse.json({ placements: rows });
  } catch (error) {
    console.error("GET /api/garden error:", error);
    return NextResponse.json(
      { error: "Failed to load garden layout." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const monthKey = typeof body?.month_key === "string" ? body.month_key : "";
    const xPercent = Number(body?.x_percent);
    const yPercent = Number(body?.y_percent);
    const scale = body?.scale !== undefined ? Number(body.scale) : 1;

    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return NextResponse.json({ error: "Invalid month_key." }, { status: 400 });
    }
    if (!Number.isFinite(xPercent) || !Number.isFinite(yPercent)) {
      return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
    }

    const clampedX = Math.max(8, Math.min(92, xPercent));
    const clampedY = Math.max(30, Math.min(90, yPercent));
    const clampedScale = Number.isFinite(scale)
      ? Math.max(0.75, Math.min(1.35, scale))
      : 1;

    await ensureMemoriesTable();
    const pool = getDbPool();

    await pool.execute(
      `INSERT INTO garden_placements (month_key, x_percent, y_percent, scale, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         x_percent = VALUES(x_percent),
         y_percent = VALUES(y_percent),
         scale = VALUES(scale),
         updated_by = VALUES(updated_by)`,
      [monthKey, clampedX, clampedY, clampedScale, session.uploadedBy]
    );

    const [rows] = await pool.execute<GardenPlacementRow[]>(
      `SELECT month_key, x_percent, y_percent, scale, updated_by, updated_at
       FROM garden_placements
       WHERE month_key = ?`,
      [monthKey]
    );

    return NextResponse.json({ placement: rows[0] });
  } catch (error) {
    console.error("PUT /api/garden error:", error);
    return NextResponse.json(
      { error: "Failed to save vase position." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const monthKey = request.nextUrl.searchParams.get("month_key") ?? "";
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return NextResponse.json({ error: "Invalid month_key." }, { status: 400 });
    }

    await ensureMemoriesTable();
    const pool = getDbPool();

    await pool.execute(`DELETE FROM garden_placements WHERE month_key = ?`, [
      monthKey,
    ]);

    return NextResponse.json({ ok: true, month_key: monthKey });
  } catch (error) {
    console.error("DELETE /api/garden error:", error);
    return NextResponse.json(
      { error: "Failed to remove vase from garden." },
      { status: 500 }
    );
  }
}
