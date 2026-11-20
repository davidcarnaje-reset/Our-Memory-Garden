import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getAuthenticatedSession } from "@/src/lib/auth";
import { ensureMemoriesTable, getDbPool, WateringLogRow } from "@/src/lib/db";

interface PartnerLatestRow extends RowDataPacket {
  watered_by: string;
  latest_epoch_ms: number;
}

async function getWateringSummary() {
  const pool = getDbPool();
  const [latestRows] = await pool.execute<WateringLogRow[]>(
    `SELECT id, watered_by, watered_at
     FROM garden_watering
     ORDER BY id DESC
     LIMIT 1`
  );

  const [partnerRows] = await pool.execute<PartnerLatestRow[]>(
    `SELECT watered_by, UNIX_TIMESTAMP(MAX(watered_at)) * 1000 AS latest_epoch_ms
     FROM garden_watering
     GROUP BY watered_by`
  );

  const latestByPartner: Record<string, string> = {};
  for (const row of partnerRows) {
    if (row.latest_epoch_ms) {
      latestByPartner[row.watered_by] = new Date(
        Number(row.latest_epoch_ms)
      ).toISOString();
    }
  }

  return {
    latest: latestRows[0] ?? null,
    latestByPartner,
  };
}

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureMemoriesTable();
    const summary = await getWateringSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/water error:", error);
    return NextResponse.json(
      { error: "Failed to check watering status." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

  try {
    await ensureMemoriesTable();
    const pool = getDbPool();

    await pool.execute<ResultSetHeader>(
      `INSERT INTO garden_watering (watered_by) VALUES (?)`,
      [wateredBy]
    );

    const summary = await getWateringSummary();
    return NextResponse.json(summary, { status: 201 });
  } catch (error) {
    console.error("POST /api/water error:", error);
    return NextResponse.json(
      { error: "Failed to water the garden." },
      { status: 500 }
    );
  }
}
