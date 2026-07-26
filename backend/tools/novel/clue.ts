import { tool } from "langchain";
import { z } from "zod";
import { getDb } from "./db.js";
import { clues } from "../../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

export const saveClueTool = tool(
  async ({ name, description, relatedChapters, status, novelId, id }) => {
    const db = getDb();
    if (id) {
      await db
        .update(clues)
        .set({
          name,
          description,
          relatedChapters: relatedChapters ?? "",
          status: status ?? "active",
          updatedAt: sql`datetime('now', 'localtime')`,
        })
        .where(eq(clues.id, id));
      return { success: true, message: `悬疑线索已更新 (id: ${id})` };
    } else {
      const result = await db
        .insert(clues)
        .values({
          name,
          description,
          relatedChapters: relatedChapters ?? "",
          status: status ?? "active",
          novelId,
        })
        .returning({ id: clues.id });
      const newId = result[0]?.id;
      return { success: true, message: `悬疑线索已保存 (id: ${newId})` };
    }
  },
  {
    name: "novel_save_clue",
    description: "保存或更新悬疑小说中的线索/悬链。提供 id 则更新已有记录，否则新建。",
    schema: z.object({
      name: z.string().describe("线索名称"),
      description: z.string().describe("线索描述，包含伏笔详情"),
      relatedChapters: z.string().optional().describe("关联的章节号，如 '1,3,5'"),
      status: z.string().optional().describe("线索状态：'active'活动, 'resolved'已解, 'dropped'废弃"),
      novelId: z.number().describe("所属小说的 ID"),
      id: z.number().optional().describe("已有记录的 id，传此值则更新，不传则新建"),
    }),
  }
);

export const getCluesTool = tool(
  async ({ novelId, status }) => {
    const db = getDb();
    let rows;
    const conditions = [];

    if (novelId !== undefined) {
      conditions.push(eq(clues.novelId, novelId));
    }
    if (status) {
      conditions.push(eq(clues.status, status));
    }

    if (conditions.length > 0) {
      rows = await db
        .select()
        .from(clues)
        .where(and(...conditions))
        .orderBy(clues.updatedAt);
    } else {
      rows = await db
        .select()
        .from(clues)
        .orderBy(clues.updatedAt);
    }
    return { clues: rows.reverse() };
  },
  {
    name: "novel_get_clues",
    description: "查询悬疑线索列表，可按小说 ID 和状态筛选。",
    schema: z.object({
      novelId: z.number().optional().describe("所属小说的 ID（可选）"),
      status: z.string().optional().describe("按状态筛选：'active'活动, 'resolved'已解, 'dropped'废弃（可选）"),
    }),
  }
);
