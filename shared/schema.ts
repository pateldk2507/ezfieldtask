import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("user_role", [
  "admin",
  "scheduler",
  "sales",
  "technician",
]);

export const urgencyEnum = pgEnum("urgency_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const organizations = pgTable("organizations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#0066FF"),
  secondaryColor: text("secondary_color").default("#1A1A2E"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),
    fullName: text("full_name").notNull(),
    role: roleEnum("role").notNull().default("technician"),
    phone: text("phone"),
    profilePhotoUrl: text("profile_photo_url"),
    isActive: boolean("is_active").default(true).notNull(),
    isLicensed: boolean("is_licensed").default(false).notNull(),
    notificationsEnabled: boolean("notifications_enabled")
      .default(true)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_org_idx").on(table.organizationId),
    index("users_email_idx").on(table.email),
  ]
);

export const taskStatuses = pgTable(
  "task_statuses",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6B7280"),
    isDefault: boolean("is_default").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("task_statuses_org_idx").on(table.organizationId)]
);

export const tasks = pgTable(
  "tasks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    scheduledDate: text("scheduled_date").notNull(),
    scheduledTime: text("scheduled_time").notNull(),
    address: text("address").notNull(),
    contactPersonName: text("contact_person_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    salesPersonId: varchar("sales_person_id").references(() => users.id),
    assignedTechnicianId: varchar("assigned_technician_id").references(
      () => users.id
    ),
    urgency: urgencyEnum("urgency").notNull().default("medium"),
    statusId: varchar("status_id").references(() => taskStatuses.id),
    additionalDetails: text("additional_details"),
    pendingReason: text("pending_reason"),
    vaultAccessCodeRequired: boolean("vault_access_code_required")
      .default(false)
      .notNull(),
    vaultData: text("vault_data"),
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_org_idx").on(table.organizationId),
    index("tasks_technician_idx").on(table.assignedTechnicianId),
    index("tasks_sales_idx").on(table.salesPersonId),
    index("tasks_status_idx").on(table.statusId),
    index("tasks_date_idx").on(table.scheduledDate),
  ]
);

export const taskDocuments = pgTable(
  "task_documents",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    taskId: varchar("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    url: text("url").notNull(),
    name: text("name").notNull(),
    notes: text("notes"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("task_docs_task_idx").on(table.taskId)]
);

export const emergencyContacts = pgTable(
  "emergency_contacts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    relationship: text("relationship"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("emergency_contacts_user_idx").on(table.userId)]
);

export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: text("type").notNull(),
    relatedTaskId: varchar("related_task_id").references(() => tasks.id),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_org_idx").on(table.organizationId),
  ]
);

export const vaultAccessCodes = pgTable(
  "vault_access_codes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("vault_codes_org_idx").on(table.organizationId)]
);

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  tasks: many(tasks),
  taskStatuses: many(taskStatuses),
  notifications: many(notifications),
  vaultAccessCodes: many(vaultAccessCodes),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  assignedTasks: many(tasks, { relationName: "assignedTechnician" }),
  salesTasks: many(tasks, { relationName: "salesPerson" }),
  createdTasks: many(tasks, { relationName: "createdBy" }),
  emergencyContacts: many(emergencyContacts),
  notifications: many(notifications),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  assignedTechnician: one(users, {
    fields: [tasks.assignedTechnicianId],
    references: [users.id],
    relationName: "assignedTechnician",
  }),
  salesPerson: one(users, {
    fields: [tasks.salesPersonId],
    references: [users.id],
    relationName: "salesPerson",
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "createdBy",
  }),
  status: one(taskStatuses, {
    fields: [tasks.statusId],
    references: [taskStatuses.id],
  }),
  documents: many(taskDocuments),
}));

export const taskStatusesRelations = relations(taskStatuses, ({ one }) => ({
  organization: one(organizations, {
    fields: [taskStatuses.organizationId],
    references: [organizations.id],
  }),
}));

export const taskDocumentsRelations = relations(taskDocuments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskDocuments.taskId],
    references: [tasks.id],
  }),
  createdBy: one(users, {
    fields: [taskDocuments.createdById],
    references: [users.id],
  }),
}));

export const emergencyContactsRelations = relations(
  emergencyContacts,
  ({ one }) => ({
    user: one(users, {
      fields: [emergencyContacts.userId],
      references: [users.id],
    }),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  relatedTask: one(tasks, {
    fields: [notifications.relatedTaskId],
    references: [tasks.id],
  }),
}));

// Zod schemas for validation
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskStatusSchema = createInsertSchema(taskStatuses).omit({
  id: true,
  createdAt: true,
});

export const insertTaskDocumentSchema = createInsertSchema(taskDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertEmergencyContactSchema = createInsertSchema(
  emergencyContacts
).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  orgSlug: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  username: z.string().min(3),
  orgName: z.string().min(1),
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskStatus = typeof taskStatuses.$inferSelect;
export type InsertTaskStatus = z.infer<typeof insertTaskStatusSchema>;
export type TaskDocument = typeof taskDocuments.$inferSelect;
export type InsertTaskDocument = z.infer<typeof insertTaskDocumentSchema>;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = z.infer<
  typeof insertEmergencyContactSchema
>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
