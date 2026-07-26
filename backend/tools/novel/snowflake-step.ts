import { tool } from "langchain";
import { z } from "zod";
import { getDb } from "./db.js";
import { snowflakeSteps } from "../../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

export const saveSnowflakeStepTool = tool(
  async ({ novelId, stepNum, title, content, status }) => {
    const db = getDb();
    // 检查是否已存在该步骤
    const existing = await db
      .select()
      .from(snowflakeSteps)
      .where(
        and(
          eq(snowflakeSteps.novelId, novelId),
          eq(snowflakeSteps.stepNum, stepNum)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 更新
      await db
        .update(snowflakeSteps)
        .set({
          title,
          content,
          status: status ?? "draft",
          updatedAt: sql`datetime('now', 'localtime')`,
        })
        .where(eq(snowflakeSteps.id, existing[0].id));
      return {
        success: true,
        message: `雪花写作法第${stepNum}步「${title}」已更新`,
        stepId: existing[0].id,
      };
    } else {
      // 新建
      const result = await db
        .insert(snowflakeSteps)
        .values({
          novelId,
          stepNum,
          title,
          content,
          status: status ?? "draft",
        })
        .returning({ id: snowflakeSteps.id });
      const newId = result[0]?.id;
      return {
        success: true,
        message: `雪花写作法第${stepNum}步「${title}」已保存`,
        stepId: newId,
      };
    }
  },
  {
    name: "novel_save_snowflake_step",
    description:
      "保存或更新雪花写作法的某一步骤内容。每步对应的编号：1=一句话概括, 2=一段话概括, 3=角色背景, 4=扩展段落, 5=深入角色, 6=场景规划, 7=场景扩展, 8=整合故事线, 9=反复修改, 10=完成初稿。status 为 'draft' 表示草稿（待确认），'completed' 表示已完成。",
    schema: z.object({
      novelId: z.number().describe("所属小说的 ID"),
      stepNum: z.number().min(1).max(10).describe("雪花写作法步骤编号 (1-10)"),
      title: z.string().describe("本步骤的标题/名称"),
      content: z.string().describe("本步骤的详细产出内容"),
      status: z
        .string()
        .optional()
        .describe("步骤状态：'draft' 草稿（待用户确认）, 'completed' 已完成"),
    }),
  }
);

export const getSnowflakeStepsTool = tool(
  async ({ novelId, stepNum }) => {
    const db = getDb();
    const conditions = [eq(snowflakeSteps.novelId, novelId)];
    if (stepNum !== undefined) {
      conditions.push(eq(snowflakeSteps.stepNum, stepNum));
    }
    const rows = await db
      .select()
      .from(snowflakeSteps)
      .where(and(...conditions))
      .orderBy(snowflakeSteps.stepNum);
    return { steps: rows };
  },
  {
    name: "novel_get_snowflake_steps",
    description:
      "查询某部小说的雪花写作法步骤列表。不传 stepNum 则返回全部步骤。",
    schema: z.object({
      novelId: z.number().describe("所属小说的 ID"),
      stepNum: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe("步骤编号 (1-10)，可选，不传则返回全部"),
    }),
  }
);