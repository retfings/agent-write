import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const novels = sqliteTable("novels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const outlines = sqliteTable("outlines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").default("datetime('now', 'localtime')"),
  updatedAt: text("updated_at").default("datetime('now', 'localtime')"),
});

export const chapterOutlines = sqliteTable("chapter_outlines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  chapterNum: integer("chapter_num").notNull(),
  title: text("title").notNull(),
  outlineContent: text("outline_content").notNull(),
  createdAt: text("created_at").default("datetime('now', 'localtime')"),
  updatedAt: text("updated_at").default("datetime('now', 'localtime')"),
});

export const characters = sqliteTable("characters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  description: text("description").notNull().default(""),
  traits: text("traits").notNull().default(""),
  relationships: text("relationships").notNull().default(""),
  createdAt: text("created_at").default("datetime('now', 'localtime')"),
  updatedAt: text("updated_at").default("datetime('now', 'localtime')"),
});

export const clues = sqliteTable("clues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  relatedChapters: text("related_chapters").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").default("datetime('now', 'localtime')"),
  updatedAt: text("updated_at").default("datetime('now', 'localtime')"),
});

export const chapters = sqliteTable("chapters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  chapterNum: integer("chapter_num").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").default("datetime('now', 'localtime')"),
  updatedAt: text("updated_at").default("datetime('now', 'localtime')"),
});

export const snowflakeSteps = sqliteTable("snowflake_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  stepNum: integer("step_num").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("draft"),
  // status: 'draft' | 'completed'
  createdAt: text("created_at").default("datetime('now', 'localtime')"),
  updatedAt: text("updated_at").default("datetime('now', 'localtime')"),
});