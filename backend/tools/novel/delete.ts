import { tool } from "langchain";
import { z } from "zod";
import { getDb } from "./db.js";
import { eq } from "drizzle-orm";
import {
  novels,
  outlines,
  chapterOutlines,
  characters,
  clues,
  chapters,
} from "../../db/schema.js";

const TABLE_MAP: Record<string, any> = {
  novels,
  outlines,
  chapter_outlines: chapterOutlines,
  characters,
  clues,
  chapters,
};

const ALLOWED_TABLES = Object.keys(TABLE_MAP);

export const deleteRecordTool = tool(
  async ({ table, id }) => {
    if (!ALLOWED_TABLES.includes(table)) {
      return { success: false, error: `不允许的表名: ${table}。允许的表: ${ALLOWED_TABLES.join(", ")}` };
    }

    const db = getDb();
    const tbl = TABLE_MAP[table];
    const result = await db.delete(tbl).where(eq(tbl.id, id)).returning({ id: tbl.id });

    if (result.length === 0) {
      return { success: false, error: `在 ${table} 中未找到 id 为 ${id} 的记录` };
    }
    return { success: true, message: `已从 ${table} 中删除记录 (id: ${id})` };
  },
  {
    name: "novel_delete",
    description: "删除指定表中的记录。支持的表: novels(小说), outlines(大纲), chapter_outlines(章节细纲), characters(人物), clues(线索), chapters(章节正文)。",
    schema: z.object({
      table: z
        .enum(["novels", "outlines", "chapter_outlines", "characters", "clues", "chapters"])
        .describe("要删除的表名：novels, outlines, chapter_outlines, characters, clues, chapters"),
      id: z.number().describe("要删除的记录 id"),
    }),
  }
);
