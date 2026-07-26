import { tool } from "langchain";
import { z } from "zod";
import { getDb } from "./db.js";
import { chapterOutlines } from "../../db/schema.js";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export const saveChapterOutlineTool = tool(
  async ({ chapterNum, title, outlineContent, novelId, id }) => {
    const db = getDb();
    if (id) {
      await db
        .update(chapterOutlines)
        .set({
          chapterNum,
          title,
          outlineContent,
          updatedAt: sql`datetime('now', 'localtime')`,
        })
        .where(eq(chapterOutlines.id, id));
      return { success: true, message: `章节细纲已更新 (id: ${id})` };
    } else {
      const result = await db
        .insert(chapterOutlines)
        .values({ chapterNum, title, outlineContent, novelId })
        .returning({ id: chapterOutlines.id });
      const newId = result[0]?.id;
      return { success: true, message: `章节细纲已保存 (id: ${newId})` };
    }
  },
  {
    name: "novel_save_chapter_outline",
    description: "保存或更新章节细纲（每章的情节规划）。提供 id 则更新已有记录，否则新建。",
    schema: z.object({
      chapterNum: z.number().describe("章节号"),
      title: z.string().describe("章节标题"),
      outlineContent: z.string().describe("章节细纲内容"),
      novelId: z.number().describe("所属小说的 ID"),
      id: z.number().optional().describe("已有记录的 id，传此值则更新，不传则新建"),
    }),
  }
);

export const getChapterOutlinesTool = tool(
  async ({ novelId, chapterNumStart, chapterNumEnd }) => {
    const db = getDb();
    let rows;
    const conditions = [];

    if (novelId !== undefined) {
      conditions.push(eq(chapterOutlines.novelId, novelId));
    }
    if (chapterNumStart !== undefined && chapterNumEnd !== undefined) {
      conditions.push(gte(chapterOutlines.chapterNum, chapterNumStart));
      conditions.push(lte(chapterOutlines.chapterNum, chapterNumEnd));
    }

    if (conditions.length > 0) {
      rows = await db
        .select()
        .from(chapterOutlines)
        .where(and(...conditions))
        .orderBy(chapterOutlines.chapterNum);
    } else {
      rows = await db
        .select()
        .from(chapterOutlines)
        .orderBy(chapterOutlines.chapterNum);
    }
    return { chapterOutlines: rows };
  },
  {
    name: "novel_get_chapter_outlines",
    description: "查询章节细纲列表，可按小说 ID 和章节号范围筛选。",
    schema: z.object({
      novelId: z.number().optional().describe("所属小说的 ID（可选）"),
      chapterNumStart: z.number().optional().describe("起始章节号（可选）"),
      chapterNumEnd: z.number().optional().describe("结束章节号（可选）"),
    }),
  }
);
