import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const researchProject = pgTable('research_project', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('violet'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const researchSession = pgTable('research_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').notNull(),
  projectId: uuid('projectId').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const researchMessage = pgTable('research_message', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').notNull(),
  sessionId: uuid('sessionId').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const researchNote = pgTable('research_note', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').notNull(),
  projectId: uuid('projectId').notNull(),
  sessionId: uuid('sessionId').notNull(),
  selectedText: text('selectedText').notNull(),
  url: text('url').notNull(),
  color: text('color').notNull().default('yellow'),
  sourceTab: text('sourceTab'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const browserTab = pgTable('browser_tab', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').notNull(),
  sessionId: uuid('sessionId').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  tabId: integer('tabId').notNull(),
  favicon: text('favicon'),
  selectedText: text('selectedText').notNull().default(''),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const tabs = browserTab

export const user = pgTable('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: text('emailVerified').notNull().default('false'),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: uuid('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull(),
})

export const account = pgTable('account', {
  id: uuid('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  password: text('password'),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: uuid('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
})

export const researchHighlight = pgTable('research_highlight', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').notNull(),
  sessionId: uuid('sessionId').notNull(),
  url: text('url').notNull(),
  selectedText: text('selectedText').notNull().default(''),
  relevanceScore: integer('relevanceScore').notNull().default(0),
  color: text('color').notNull().default('red'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const projects = researchProject
export const sessions = researchSession
export const messages = researchMessage
export const highlights = researchHighlight
