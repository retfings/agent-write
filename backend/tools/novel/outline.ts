import { tool } from "langchain";
import { z } from "zod";
import { getDb } from "./db.js";
import { outlines } from "../../db/schema.js";
import { eq, and, like, sql } from "drizzle-orm";

export const saveOutlineTool = tool(
  async ({ title, content, novelId, id }) => {
    const db = getDb();
    if (id) {
      await db
        .update(outlines)
        .set({ title, content, updatedAt: sql`datetime('now', 'localtime')` })
        .where(eq(outlines.id, id));
      return { success: true, message: `大纲已更新 (id: ${id})` };
    } else {
      const result = await db
        .insert(outlines)
        .values({ title, content, novelId })
        .returning({ id: outlines.id });
      const newId = result[0]?.id;
      return { success: true, message: `大纲已保存 (id: ${newId})` };
    }
  },
  {
    name: "novel_save_outline",
    description: "保存或更新悬疑小说的大纲。提供 id 则更新已有记录，否则新建。",
    schema: z.object({
      title: z.string().describe("大纲标题"),
      content: z.string().describe("大纲内容，包含故事主线、核心悬念等"),
      novelId: z.number().describe("所属小说的 ID"),
      id: z.number().optional().describe("已有记录的 id，传此值则更新，不传则新建"),
    }),
  }
);

export const getOutlinesTool = tool(
  async ({ novelId, title }) => {
    const db = getDb();
    let rows;
    const conditions = [];

    if (novelId !== undefined) {
      conditions.push(eq(outlines.novelId, novelId));
    }
    if (title) {
      conditions.push(like(outlines.title, `%${title}%`));
    }

    if (conditions.length > 0) {
      rows = await db
        .select()
        .from(outlines)
        .where(and(...conditions))
        .orderBy(outlines.updatedAt);
    } else {
      rows = await db
        .select()
        .from(outlines)
        .orderBy(outlines.updatedAt);
    }
    // Drizzle returns results in ascending order by default, reverse for DESC
    return { outlines: rows.reverse() };
  },
  {
    name: "novel_get_outlines",
    description: "查询小说大纲列表，可按小说 ID 和标题模糊搜索。",
    schema: z.object({
      novelId: z.number().optional().describe("所属小说的 ID（可选）"),
      title: z.string().optional().describe("按标题模糊搜索（可选）"),
    }),
  }
);
