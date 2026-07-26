import { tool } from "langchain";
import { z } from "zod";
import { getDb } from "./db.js";
import { characters } from "../../db/schema.js";
import { eq, and, like, or, sql } from "drizzle-orm";

export const saveCharacterTool = tool(
  async ({ name, role, description, traits, relationships, novelId, id }) => {
    const db = getDb();
    if (id) {
      await db
        .update(characters)
        .set({
          name,
          role: role ?? "",
          description: description ?? "",
          traits: traits ?? "",
          relationships: relationships ?? "",
          updatedAt: sql`datetime('now', 'localtime')`,
        })
        .where(eq(characters.id, id));
      return { success: true, message: `人物已更新 (id: ${id})` };
    } else {
      const result = await db
        .insert(characters)
        .values({
          name,
          role: role ?? "",
          description: description ?? "",
          traits: traits ?? "",
          relationships: relationships ?? "",
          novelId,
        })
        .returning({ id: characters.id });
      const newId = result[0]?.id;
      return { success: true, message: `人物已保存 (id: ${newId})` };
    }
  },
  {
    name: "novel_save_character",
    description: "保存或更新悬疑小说中的人物信息。提供 id 则更新已有记录，否则新建。",
    schema: z.object({
      name: z.string().describe("人物姓名"),
      role: z.string().optional().describe("角色类型，如'主角'、'反派'、'被害人'等"),
      description: z.string().optional().describe("人物描述"),
      traits: z.string().optional().describe("性格特点，如'冷静、聪明、多疑'"),
      relationships: z.string().optional().describe("人物关系，如'与张三的兄弟关系'等"),
      novelId: z.number().describe("所属小说的 ID"),
      id: z.number().optional().describe("已有记录的 id，传此值则更新，不传则新建"),
    }),
  }
);

export const getCharactersTool = tool(
  async ({ novelId, name, role }) => {
    const db = getDb();
    let rows;
    const conditions = [];

    if (novelId !== undefined) {
      conditions.push(eq(characters.novelId, novelId));
    }
    if (name) {
      conditions.push(like(characters.name, `%${name}%`));
    }
    if (role) {
      conditions.push(like(characters.role, `%${role}%`));
    }

    if (conditions.length > 0) {
      rows = await db
        .select()
        .from(characters)
        .where(and(...conditions))
        .orderBy(characters.updatedAt);
    } else {
      rows = await db
        .select()
        .from(characters)
        .orderBy(characters.updatedAt);
    }
    return { characters: rows.reverse() };
  },
  {
    name: "novel_get_characters",
    description: "查询人物列表，可按小说 ID、姓名或角色类型筛选。",
    schema: z.object({
      novelId: z.number().optional().describe("所属小说的 ID（可选）"),
      name: z.string().optional().describe("按姓名模糊搜索（可选）"),
      role: z.string().optional().describe("按角色类型搜索，如'主角'、'反派'（可选）"),
    }),
  }
);
