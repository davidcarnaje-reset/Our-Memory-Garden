import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";
import { getAuthenticatedSession } from "@/src/lib/auth";
import { ensureMemoriesTable, getDbPool, WateringLogRow } from "@/src/lib/db";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureMemoriesTable();
    const pool = getDbPool();

    const [rows] = await pool.execute<WateringLogRow[]>(
      `SELECT id, watered_by, watered_at
       FROM garden_watering
       ORDER BY id DESC
       LIMIT 1`
    );

    return NextResponse.json({ latest: rows[0] ?? null });
  } catch (error) {
    console.error("GET /api/water error:", error);
    return NextResponse.json(
      { error: "Failed to check watering status." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let wateredBy = session.uploadedBy;
    try {
      const body = await request.json();
      if (typeof body?.wateredBy === "string" && body.wateredBy.trim()) {
        wateredBy = body.wateredBy.trim().slice(0, 50);
      }
    } catch {
      // Optional body
    }

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [insertResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO garden_watering (watered_by) VALUES (?)`,
      [wateredBy]
    );

    const [rows] = await pool.execute<WateringLogRow[]>(
      `SELECT id, watered_by, watered_at
       FROM garden_watering
       WHERE id = ?`,
      [insertResult.insertId]
    );

    return NextResponse.json({ latest: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/water error:", error);
    return NextResponse.json(
      { error: "Failed to water the garden." },
      { status: 500 }
    );
  }
}
