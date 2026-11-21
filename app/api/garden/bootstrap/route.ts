import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  DailyWaterPhotoRow,
  ensureMemoriesTable,
  GardenPlacementRow,
  GardenStatsRow,
  getDbPool,
  MemoryReply,
  MemoryReplyRow,
  MemoryRow,
  MonthVaseEquipRow,
  parseDriveFileIds,
  UnlockedSceneryRow,
  UnlockedVaseRow,
  WateringLogRow,
} from "@/src/lib/db";
import { getManilaCycleDates } from "@/src/lib/manilaTime";

interface PartnerLatestRow extends RowDataPacket {
  watered_by: string;
  latest_epoch_ms: number;
}

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
    const { today: cycleKey } = getManilaCycleDates();
    const todayIso = new Date().toISOString().slice(0, 10);

    // Run all independent TiDB queries in parallel in a single HTTP round-trip
    const [
      [memRows],
      [latestWaterRows],
      [partnerWaterRows],
      [placementRows],
      [statsRows],
      [unlockedVaseRows],
      [unlockedSceneryRows],
      [equipRows],
      [dailyRows],
    ] = await Promise.all([
      pool.execute<MemoryRow[]>(
        `SELECT id, memory_date, month_key, note, drive_file_id, drive_file_ids, uploaded_by, mood, unlock_date, created_at
         FROM memories
         WHERE month_key LIKE ?
         ORDER BY memory_date ASC, id ASC`,
        [`${yearParam}-%`]
      ),
      pool.execute<WateringLogRow[]>(
        `SELECT id, watered_by, watered_at FROM garden_watering ORDER BY id DESC LIMIT 1`
      ),
      pool.execute<PartnerLatestRow[]>(
        `SELECT watered_by, UNIX_TIMESTAMP(MAX(watered_at)) * 1000 AS latest_epoch_ms
         FROM garden_watering
         GROUP BY watered_by`
      ),
      pool.execute<GardenPlacementRow[]>(
        `SELECT month_key, x_percent, y_percent, scale, updated_by, updated_at
         FROM garden_placements
         WHERE month_key LIKE ?
         ORDER BY y_percent ASC`,
        [`${yearParam}-%`]
      ),
      pool.execute<GardenStatsRow[]>(
        `SELECT id, current_streak, longest_streak, last_watered_date, last_watered_by, partner_watered_today, vase_shards
         FROM garden_stats
         WHERE id = 1`
      ),
      pool.execute<UnlockedVaseRow[]>(
        `SELECT vase_code, unlocked_at FROM unlocked_vases ORDER BY unlocked_at ASC`
      ),
      pool.execute<UnlockedSceneryRow[]>(
        `SELECT scenery_code FROM unlocked_sceneries ORDER BY unlocked_at ASC`
      ),
      pool.execute<MonthVaseEquipRow[]>(
        `SELECT month_key, vase_code FROM month_vase_equip WHERE month_key LIKE ?`,
        [`${yearParam}-%`]
      ),
      pool.execute<DailyWaterPhotoRow[]>(
        `SELECT id, cycle_key, uploaded_by, caption, drive_file_ids, created_at
         FROM daily_water_photos
         WHERE cycle_key = ?
         ORDER BY id ASC`,
        [cycleKey]
      ),
    ]);

    const repliesByMemoryId: Record<number, MemoryReply[]> = {};
    if (memRows.length > 0) {
      const ids = memRows.map((r) => r.id);
      const placeholders = ids.map(() => "?").join(",");
      const [replyRows] = await pool.execute<MemoryReplyRow[]>(
        `SELECT id, memory_id, author, message, reaction, created_at
         FROM memory_replies
         WHERE memory_id IN (${placeholders})
         ORDER BY created_at ASC, id ASC`,
        ids
      );
      for (const reply of replyRows) {
        if (!repliesByMemoryId[reply.memory_id]) {
          repliesByMemoryId[reply.memory_id] = [];
        }
        repliesByMemoryId[reply.memory_id].push(reply);
      }
    }

    const memories = memRows.map((row) => {
      const isLocked = Boolean(row.unlock_date && row.unlock_date > todayIso);
      const fileIds = parseDriveFileIds(row.drive_file_ids, row.drive_file_id);
      return {
        id: row.id,
        memory_date: row.memory_date,
        month_key: row.month_key,
        note: isLocked ? "" : row.note,
        drive_file_id: isLocked ? "" : (fileIds[0] ?? row.drive_file_id),
        drive_file_ids: isLocked ? [] : fileIds,
        uploaded_by: row.uploaded_by,
        mood: row.mood,
        unlock_date: row.unlock_date,
        created_at: row.created_at,
        replies: repliesByMemoryId[row.id] ?? [],
      };
    });

    const latestByPartner: Record<string, string> = {};
    for (const row of partnerWaterRows) {
      if (row.latest_epoch_ms) {
        latestByPartner[row.watered_by] = new Date(
          Number(row.latest_epoch_ms)
        ).toISOString();
      }
    }

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

    const dailyEntries = dailyRows.map((row) => {
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

    return NextResponse.json({
      memories,
      latest: latestWaterRows[0] ?? null,
      latestByPartner,
      placements: placementRows,
      stats,
      unlockedVases: unlockedVaseRows.map((r) => r.vase_code),
      unlockedSceneries: unlockedSceneryRows.map((r) => r.scenery_code),
      equippedVases: Object.fromEntries(
        equipRows.map((r) => [r.month_key, r.vase_code])
      ),
      dailyCycleKey: cycleKey,
      dailyEntries,
    });
  } catch (error) {
    console.error("GET /api/garden/bootstrap error:", error);
    return NextResponse.json(
      { error: "Failed to load garden data." },
      { status: 500 }
    );
  }
}
