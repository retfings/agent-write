import { tool } from "langchain";
import { z } from "zod";
import { getDb } from "./db.js";
import { novels } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const switchNovelTool = tool(
  async ({ novelId }) => {
    const db = getDb();
    const result = await db
      .select()
      .from(novels)
      .where(eq(novels.id, novelId));
    if (result.length === 0) {
      return { success: false, error: "未找到该小说" };
    }
    return { success: true, novelId: result[0].id, novelName: result[0].name };
  },
  {
    name: "novel_switch",
    description: "切换当前正在操作的小说。用户想操作另一部小说时调用此工具。",
    schema: z.object({
      novelId: z.number().describe("要切换到的小说 ID"),
    }),
  }
);