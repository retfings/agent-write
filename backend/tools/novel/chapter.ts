import { tool } from "langchain";
import { z } from "zod";
import { getDb } from "./db.js";
import { chapters } from "../../db/schema.js";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export const saveChapterTool = tool(
  async ({ chapterNum, title, content, novelId, id }) => {
    const db = getDb();
    if (id) {
      await db
        .update(chapters)
        .set({
          chapterNum,
          title,
          content,
          updatedAt: sql`datetime('now', 'localtime')`,
        })
        .where(eq(chapters.id, id));
      return { success: true, message: `章节正文已更新 (id: ${id})` };
    } else {
      const result = await db
        .insert(chapters)
        .values({ chapterNum, title, content, novelId })
        .returning({ id: chapters.id });
      const newId = result[0]?.id;
      return { success: true, message: `章节正文已保存 (id: ${newId})` };
    }
  },
  {
    name: "novel_save_chapter",
    description: "保存或更新章节正文内容。提供 id 则更新已有记录，否则新建。",
    schema: z.object({
      chapterNum: z.number().describe("章节号"),
      title: z.string().describe("章节标题"),
      content: z.string().describe("章节正文内容"),
      novelId: z.number().describe("所属小说的 ID"),
      id: z.number().optional().describe("已有记录的 id，传此值则更新，不传则新建"),
    }),
  }
);

export const getChaptersTool = tool(
  async ({ novelId, chapterNumStart, chapterNumEnd, page, pageSize }) => {
    const db = getDb();
    let rows;

    const hasRange = chapterNumStart !== undefined && chapterNumEnd !== undefined;
    const hasPagination = page !== undefined && pageSize !== undefined;
    const hasNovelFilter = novelId !== undefined;
    const conditions = [];

    if (hasNovelFilter) {
      conditions.push(eq(chapters.novelId, novelId));
    }

    if (hasRange) {
      conditions.push(gte(chapters.chapterNum, chapterNumStart));
      conditions.push(lte(chapters.chapterNum, chapterNumEnd));
    }

    if (conditions.length > 0) {
      if (hasPagination) {
        const offset = (page - 1) * pageSize;
        rows = await db
          .select()
          .from(chapters)
          .where(and(...conditions))
          .orderBy(chapters.chapterNum)
          .limit(pageSize)
          .offset(offset);
      } else {
        rows = await db
          .select()
          .from(chapters)
          .where(and(...conditions))
          .orderBy(chapters.chapterNum);
      }
    } else if (hasPagination) {
      const offset = (page - 1) * pageSize;
      rows = await db
        .select()
        .from(chapters)
        .orderBy(chapters.chapterNum)
        .limit(pageSize)
        .offset(offset);
    } else {
      rows = await db
        .select()
        .from(chapters)
        .orderBy(chapters.chapterNum);
    }
    return { chapters: rows };
  },
  {
    name: "novel_get_chapters",
    description: "查询章节正文列表，可按小说 ID、章节号范围或分页查询。",
    schema: z.object({
      novelId: z.number().optional().describe("所属小说的 ID（可选）"),
      chapterNumStart: z.number().optional().describe("起始章节号（可选）"),
      chapterNumEnd: z.number().optional().describe("结束章节号（可选）"),
      page: z.number().optional().describe("页码（从1开始），与 pageSize 一起使用（可选）"),
      pageSize: z.number().optional().describe("每页数量，与 page 一起使用（可选）"),
    }),
  }
);
