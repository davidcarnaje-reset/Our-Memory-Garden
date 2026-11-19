import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  ensureMemoriesTable,
  GardenStatsRow,
  getDbPool,
  WateringLogRow,
} from "@/src/lib/db";

interface PartnerLatestRow extends RowDataPacket {
  watered_by: string;
  latest_at: string;
}

function getManilaDates(): { today: string; yesterday: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = fmt.format(now);

  const [y, m, d] = today.split("-").map(Number);
  const yesterdayUtc = new Date(Date.UTC(y, m - 1, d - 1));
  const yesterday = yesterdayUtc.toISOString().slice(0, 10);

  return { today, yesterday };
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let currentUser = session.uploadedBy;
  try {
    const body = await request.json();
    if (typeof body?.wateredBy === "string" && body.wateredBy.trim()) {
      currentUser = body.wateredBy.trim().slice(0, 50);
    }
  } catch {
    // Optional body
  }

  try {
    await ensureMemoriesTable();
    const pool = getDbPool();
    const { today, yesterday } = getManilaDates();

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
      `SELECT watered_by, MAX(watered_at) AS latest_at FROM garden_watering GROUP BY watered_by`
    );

    const latestByPartner: Record<string, string> = {};
    for (const row of partnerRows) {
      latestByPartner[row.watered_by] = row.latest_at;
    }

    return NextResponse.json({
      stats: {
        id: 1,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_watered_date: lastWateredDate === today ? today : today,
        last_watered_by: lastWateredBy,
        partner_watered_today: partnerWateredToday,
        vase_shards: vaseShards,
      },
      alreadyWatered,
      coopBonusAwarded,
      milestoneReached,
      latest: latestRows[0] ?? null,
      latestByPartner,
    });
  } catch (error) {
    console.error("POST /api/garden/water error:", error);
    return NextResponse.json(
      { error: "Failed to water the garden." },
      { status: 500 }
    );
  }
}
