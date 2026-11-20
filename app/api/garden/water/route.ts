import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  DailyWaterPhotoRow,
  ensureMemoriesTable,
  GardenStatsRow,
  getDbPool,
  WateringLogRow,
} from "@/src/lib/db";
import { getManilaCycleDates } from "@/src/lib/manilaTime";

interface PartnerLatestRow extends RowDataPacket {
  watered_by: string;
  latest_epoch_ms: number;
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let currentUser = session.uploadedBy;
  let driveFileIds: string[] = [];
  let caption: string | null = null;

  try {
    const body = await request.json();
    if (typeof body?.wateredBy === "string" && body.wateredBy.trim()) {
      currentUser = body.wateredBy.trim().slice(0, 50);
    }
    if (Array.isArray(body?.drive_file_ids)) {
      driveFileIds = body.drive_file_ids
        .filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
        .slice(0, 3);
    }
    if (typeof body?.caption === "string" && body.caption.trim()) {
      caption = body.caption.trim().slice(0, 255);
    }
  } catch {
    return NextResponse.json(
      { error: "Please take or upload 1 to 3 photos to water the garden." },
      { status: 400 }
    );
  }

  if (driveFileIds.length === 0) {
    return NextResponse.json(
      { error: "Please take or upload 1 to 3 photos to water the garden." },
      { status: 400 }
    );
  }

  try {
    await ensureMemoriesTable();
    const pool = getDbPool();
    const { today, yesterday } = getManilaCycleDates();

    // Save the daily photo check-in (archived in Drive's "Daily Pictures", shown for today's cycle only)
    const [insertPhotoRes] = await pool.execute<ResultSetHeader>(
      `INSERT INTO daily_water_photos (cycle_key, uploaded_by, caption, drive_file_ids)
       VALUES (?, ?, ?, ?)`,
      [today, currentUser, caption, JSON.stringify(driveFileIds)]
    );

    const [dailyRows] = await pool.execute<DailyWaterPhotoRow[]>(
      `SELECT id, cycle_key, uploaded_by, caption, drive_file_ids, created_at
       FROM daily_water_photos
       WHERE id = ?`,
      [insertPhotoRes.insertId]
    );

    const [statsRows] = await pool.execute<GardenStatsRow[]>(
      `SELECT id, current_streak, longest_streak, last_watered_date, last_watered_by, partner_watered_today, vase_shards
       FROM garden_stats
       WHERE id = 1`
    );

    const existing = statsRows[0];
    let currentStreak = existing?.current_streak ?? 0;
    let longestStreak = existing?.longest_streak ?? 0;
    const lastWateredDate = existing?.last_watered_date ?? null;
    let lastWateredBy = existing?.last_watered_by ?? null;
    let partnerWateredToday = Boolean(existing?.partner_watered_today);
    let vaseShards = existing?.vase_shards ?? 0;

    let alreadyWatered = false;
    let coopBonusAwarded = false;
    let milestoneReached = false;

    if (lastWateredDate === today) {
      if (lastWateredBy && lastWateredBy !== currentUser && !partnerWateredToday) {
        partnerWateredToday = true;
        vaseShards += 1;
        coopBonusAwarded = true;

        await pool.execute(
          `UPDATE garden_stats
           SET partner_watered_today = TRUE, vase_shards = ?
           WHERE id = 1`,
          [vaseShards]
        );
        await pool.execute(
          `INSERT INTO garden_watering (watered_by) VALUES (?)`,
          [currentUser]
        );
      } else {
        alreadyWatered = true;
      }
    } else {
      if (lastWateredDate === yesterday) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }

      longestStreak = Math.max(longestStreak, currentStreak);
      lastWateredBy = currentUser;
      partnerWateredToday = false;

      if (currentStreak > 0 && currentStreak % 7 === 0) {
        vaseShards += 5;
        milestoneReached = true;
      }

      await pool.execute(
        `UPDATE garden_stats
         SET current_streak = ?,
             longest_streak = ?,
             last_watered_date = ?,
             last_watered_by = ?,
             partner_watered_today = FALSE,
             vase_shards = ?
         WHERE id = 1`,
        [currentStreak, longestStreak, today, currentUser, vaseShards]
      );
      await pool.execute(
        `INSERT INTO garden_watering (watered_by) VALUES (?)`,
        [currentUser]
      );
    }

    const [latestRows] = await pool.execute<WateringLogRow[]>(
      `SELECT id, watered_by, watered_at FROM garden_watering ORDER BY id DESC LIMIT 1`
    );
    const [partnerRows] = await pool.execute<PartnerLatestRow[]>(
      `SELECT watered_by, UNIX_TIMESTAMP(MAX(watered_at)) * 1000 AS latest_epoch_ms FROM garden_watering GROUP BY watered_by`
    );

    const latestByPartner: Record<string, string> = {};
    for (const row of partnerRows) {
      if (row.latest_epoch_ms) {
        latestByPartner[row.watered_by] = new Date(
          Number(row.latest_epoch_ms)
        ).toISOString();
      }
    }

    const rawDaily = dailyRows[0];
    const dailyEntry = rawDaily
      ? {
          id: rawDaily.id,
          cycle_key: rawDaily.cycle_key,
          uploaded_by: rawDaily.uploaded_by,
          caption: rawDaily.caption,
          drive_file_ids: driveFileIds,
          created_at: rawDaily.created_at,
        }
      : null;

    return NextResponse.json({
      stats: {
        id: 1,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_watered_date: today,
        last_watered_by: lastWateredBy,
        partner_watered_today: partnerWateredToday,
        vase_shards: vaseShards,
      },
      alreadyWatered,
      coopBonusAwarded,
      milestoneReached,
      latest: latestRows[0] ?? null,
      latestByPartner,
      dailyEntry,
    });
  } catch (error) {
    console.error("POST /api/garden/water error:", error);
    return NextResponse.json(
      { error: "Failed to water the garden." },
      { status: 500 }
    );
  }
}
