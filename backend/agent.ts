import { ChatDeepSeek } from "@langchain/deepseek";
import { Annotation, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, ToolMessage } from "@langchain/core/messages";

import {
  saveOutlineTool,
  getOutlinesTool,
  saveChapterOutlineTool,
  getChapterOutlinesTool,
  saveChapterTool,
  getChaptersTool,
  saveCharacterTool,
  getCharactersTool,
  saveClueTool,
  getCluesTool,
  saveNovelTool,
  getNovelsTool,
  deleteRecordTool,
  switchNovelTool,
  saveSnowflakeStepTool,
  getSnowflakeStepsTool,
} from "./tools/novel/index.js";

// 1. 收集所有工具
const tools = [
  saveOutlineTool,
  getOutlinesTool,
  saveChapterOutlineTool,
  getChapterOutlinesTool,
  saveChapterTool,
  getChaptersTool,
  saveCharacterTool,
  getCharactersTool,
  saveClueTool,
  getCluesTool,
  saveNovelTool,
  getNovelsTool,
  deleteRecordTool,
  switchNovelTool,
  saveSnowflakeStepTool,
  getSnowflakeStepsTool,
];

// 2. 配置模型并绑定工具
const model = new ChatDeepSeek("deepseek-v4-flash").bindTools(tools);

// 3. 自定义 State：在 MessagesAnnotation 基础上增加当前小说字段
const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  currentNovelId: Annotation<number | null>({
    reducer: (a, b) => (b !== undefined ? b : a),
    default: () => null,
  }),
  currentNovelName: Annotation<string>({
    reducer: (a, b) => (b !== undefined ? b : a),
    default: () => "",
  }),
});

// 4. 构建雪花写作法的系统提示
const SNOWFLAKE_STEPS = [
  { num: 1, title: "一句话概括", desc: "用一句话总结故事核心，尽量不超过20-25字，不写角色名，突出故事背景和愿景。" },
  { num: 2, title: "一段话概括", desc: "将一句话扩展为五句左右的段落，概述故事设定、主要灾祸和结局。" },
  { num: 3, title: "角色背景", desc: "为每个主要角色写一页纸，描述其背景、动机、目标和冲突。" },
  { num: 4, title: "扩展段落", desc: "将第二步的每句话扩展为完整段落，形成故事大纲。" },
  { num: 5, title: "深入角色", desc: "详细记录角色心理、性格矛盾、希望与恐惧、人生哲学等。" },
  { num: 6, title: "场景规划", desc: "为每个场景设计人物、场景特征、冲突、对话及时间线。" },
  { num: 7, title: "场景扩展", desc: "将每个场景写成完整文本，通常每个场景1000字以上。" },
  { num: 8, title: "整合故事线", desc: "将所有场景和角色线索整合，确保逻辑连贯。" },
  { num: 9, title: "反复修改", desc: "根据需要调整故事结构、角色动机和情节发展。" },
  { num: 10, title: "完成初稿", desc: "在十步完成后，形成较为完整的小说初稿，可进一步润色。" },
];

// 4. 节点：首次加载时查询最新小说，设为当前小说，注入到上下文中
async function loadNovels(state: typeof AgentState.State) {
  // 检查是否已经注入过上下文（避免每次对话都重复注入）
  const hasNovelContext = state.messages.some(
    (m) => m._getType() === "system" && typeof m.content === "string" && m.content.startsWith("当前小说")
  );
  if (hasNovelContext) return {};

  // 查询所有小说（按 id 降序，取最新的）
  const result = await getNovelsTool.invoke({});
  const novels = (result as any).novels || [];

  // 按 id 降序排列，最新的排在前面
  novels.sort((a: any, b: any) => b.id - a.id);

  let novelListText = "当前小说列表：\n";
  if (novels.length === 0) {
    novelListText += "（暂无小说）\n";
  } else {
    for (const novel of novels) {
      novelListText += `- ${novel.name} (ID: ${novel.id})\n`;
    }
  }

  // 如果有小说，自动选取最新的作为当前小说
  let defaultNovelId: number | null = null;
  let defaultNovelName = "";
  if (novels.length > 0) {
    defaultNovelId = novels[0].id;
    defaultNovelName = novels[0].name;
    novelListText += `\n当前正在操作的小说：${defaultNovelName} (ID: ${defaultNovelId})。`;
    novelListText += `你可以对我说"切换到小说X"来切换其他小说。`;
  }

  return {
    messages: [
      {
        role: "system",
        content: novelListText,
      },
    ],
    currentNovelId: defaultNovelId,
    currentNovelName: defaultNovelName,
  };
}

// 5. 节点：调用 LLM，决定是否使用工具
async function callModel(state: typeof AgentState.State) {
  // 构建带当前小说上下文的 system prompt
  let novelContextInfo = "";
  if (state.currentNovelId) {
    novelContextInfo = `当前正在操作的小说：${state.currentNovelName} (ID: ${state.currentNovelId})。`;
  } else {
    novelContextInfo = "当前没有选定的小说。";
  }

  const response = await model.invoke([
    {
      role: "system",
      content:
        "你是一个悬疑小说创作助手，负责帮助用户创作和管理悬疑小说。\n\n" +
        "【核心流程：雪花写作法】\n" +
        "当用户想要创建新小说时，请严格按照以下步骤引导用户完成创作：\n\n" +
        "第一步：询问主题\n" +
        "  首先问用户想写什么类型的悬疑小说。提供建议组合如：\n" +
        "  - 悬疑 + 游戏 + 群像\n" +
        "  - 悬疑 + 脑洞 + 搞笑\n" +
        "  - 悬疑 + 密室 + 本格推理\n" +
        "  - 悬疑 + 科幻 + 赛博朋克\n" +
        "  - 悬疑 + 古风 + 宫廷\n" +
        "  也允许用户自定义。得到主题后，创建小说（使用 novel_save），然后进入第1步。\n\n" +
        "第二步：逐步骤创作（1-10步）\n" +
        "  雪花写作法各步骤：\n" +
        "  1. 一句话概括：用一句话总结故事核心，尽量不超过20-25字，不写角色名，突出故事背景和愿景。\n" +
        "  2. 一段话概括：将一句话扩展为五句左右的段落，概述故事设定、主要灾祸和结局。\n" +
        "  3. 角色背景：为每个主要角色写一页纸，描述其背景、动机、目标和冲突。\n" +
        "  4. 扩展段落：将第二步的每句话扩展为完整段落，形成故事大纲。\n" +
        "  5. 深入角色：详细记录角色心理、性格矛盾、希望与恐惧、人生哲学等。\n" +
        "  6. 场景规划：为每个场景设计人物、场景特征、冲突、对话及时间线。\n" +
        "  7. 场景扩展：将每个场景写成完整文本，通常每个场景1000字以上。\n" +
        "  8. 整合故事线：将所有场景和角色线索整合，确保逻辑连贯。\n" +
        "  9. 反复修改：根据需要调整故事结构、角色动机和情节发展。\n" +
        "  10. 完成初稿：形成较为完整的小说初稿，可进一步润色。\n\n" +
        "【每步必须征求用户意见】\n" +
        "  完成每一步的创作后，必须保存该步骤（使用 novel_save_snowflake_step，status='draft'），\n" +
        "  然后问用户是否满意。\n" +
        "  - 如果用户满意，将该步骤标记为 completed（使用 novel_save_snowflake_step，status='completed'），然后进入下一步。\n" +
        "  - 如果用户要求修改，根据反馈调整内容并重新保存（仍为 draft），再次征求用户意见，直到用户满意为止。\n" +
        "  - **未得到用户明确同意前，不得擅自进入下一步。**\n" +
        "  当第10步完成后，通知用户小说初稿已完成。\n\n" +
        "【已有小说的操作】\n" +
        "  如果用户只是想操作已有小说（查看、编辑大纲/章节/人物/线索等），按正常流程使用对应工具即可。\n" +
        "  不需要强制启动雪花写作法流程。\n\n" +
        "【进度查询】\n" +
        "  用户可以随时询问创作进度，使用 novel_get_snowflake_steps 查询当前步骤状态。\n" +
        "  也可以说「回到第X步」来修改之前的步骤。\n\n" +
        novelContextInfo +
        "对于需要 novelId 的工具调用，请自动使用当前小说的 ID。" +
        "如果用户想要操作其他小说，请使用 novel_switch 工具进行切换。",
    },
    ...state.messages,
  ]);
  return { messages: response };
}

// 6. 节点：处理工具调用的结果，检测 novel_switch 切换
async function handleToolResults(state: typeof AgentState.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // 检查最后一条消息是否为 ToolMessage，且对应的是 novel_switch
  if (
    lastMessage._getType() === "tool" &&
    typeof lastMessage.content === "string"
  ) {
    try {
      const parsed = JSON.parse(lastMessage.content);
      if (parsed.success && parsed.novelId) {
        return {
          currentNovelId: parsed.novelId,
          currentNovelName: parsed.novelName,
        };
      }
    } catch {
      // 不是 JSON 格式，忽略
    }
  }

  // 也检查是否有 ToolMessage 携带了 tool_call_id 对应的 novel_switch
  // 通过追溯最后一次 AI message 的 tool_calls 来判断
  const aiMessage = [...messages].reverse().find((m) => m._getType() === "ai") as AIMessage | undefined;
  if (aiMessage?.tool_calls) {
    const switchCall = aiMessage.tool_calls.find((tc) => tc.name === "novel_switch");
    if (switchCall) {
      const toolMsg = messages.find(
        (m) => m._getType() === "tool" && (m as ToolMessage).tool_call_id === switchCall.id
      );
      if (toolMsg && typeof toolMsg.content === "string") {
        try {
          const parsed = JSON.parse(toolMsg.content);
          if (parsed.success && parsed.novelId) {
            return {
              currentNovelId: parsed.novelId,
              currentNovelName: parsed.novelName,
            };
          }
        } catch {
          // 忽略
        }
      }
    }
  }

  return {};
}

// 7. 条件边：判断是否要调用工具
function shouldContinue(state: typeof AgentState.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  if ((lastMessage as AIMessage).tool_calls?.length) {
    return "tools";
  }
  return "__end__";
}

// 8. 构建图
const workflow = new StateGraph(AgentState)
  .addNode("loadNovels", loadNovels)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode(tools))
  .addNode("handleToolResults", handleToolResults)
  .addEdge("__start__", "loadNovels")
  .addEdge("loadNovels", "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", "__end__"])
  .addEdge("tools", "handleToolResults")
  .addEdge("handleToolResults", "agent");

export const agent = workflow.compile();