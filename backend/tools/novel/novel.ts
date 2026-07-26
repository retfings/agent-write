import { tool } from "langchain";
import { z } from "zod";
import { getDb } from "./db.js";
import { novels } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const saveNovelTool = tool(
  async ({ name }) => {
    const db = getDb();
    const result = await db
      .insert(novels)
      .values({ name })
      .returning({ id: novels.id });
    const newId = result[0]?.id;
    return { success: true, message: `小说 "${name}" 已创建`, novelId: newId };
  },
  {
    name: "novel_save",
    description: "创建一部新小说。",
    schema: z.object({
      name: z.string().describe("小说名称"),
    }),
  }
);

export const getNovelsTool = tool(
  async ({ id }) => {
    const db = getDb();
    let rows;
    if (id) {
      rows = await db
        .select()
        .from(novels)
        .where(eq(novels.id, id));
    } else {
      rows = await db
        .select()
        .from(novels)
        .orderBy(novels.id);
    }
    return { novels: rows };
  },
  {
    name: "novel_get_novels",
    description: "查询小说列表。提供 id 则查单部小说，不传则查全部。",
    schema: z.object({
      id: z.number().optional().describe("小说 id（可选），传此值则只查询该小说"),
    }),
  }
);