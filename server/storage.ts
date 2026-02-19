import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import {
  organizations,
  users,
  tasks,
  taskStatuses,
  taskDocuments,
  emergencyContacts,
  notifications,
  vaultAccessCodes,
  emailTemplates,
  type InsertOrganization,
  type InsertUser,
  type InsertTask,
  type InsertTaskStatus,
  type InsertTaskDocument,
  type InsertEmergencyContact,
  type InsertNotification,
  type InsertEmailTemplate,
  type Organization,
  type User,
  type Task,
  type TaskStatus,
  type TaskDocument,
  type EmergencyContact,
  type Notification,
  type EmailTemplate,
} from "@shared/schema";

export class DatabaseStorage {
  // Organizations
  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(data).returning();
    return org;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug));
    return org;
  }

  async updateOrganization(
    id: string,
    data: Partial<InsertOrganization>
  ): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  // Users
  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(
    email: string,
    organizationId: string
  ): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.email, email), eq(users.organizationId, organizationId))
      );
    return user;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }

  async getUsersByRole(
    organizationId: string,
    role: string
  ): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.role, role as any)
        )
      );
  }

  async updateUser(
    id: string,
    data: Partial<InsertUser>
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Task Statuses
  async createTaskStatus(data: InsertTaskStatus): Promise<TaskStatus> {
    const [status] = await db.insert(taskStatuses).values(data).returning();
    return status;
  }

  async getTaskStatuses(organizationId: string): Promise<TaskStatus[]> {
    return db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.organizationId, organizationId))
      .orderBy(taskStatuses.sortOrder);
  }

  async getTaskStatus(id: string): Promise<TaskStatus | undefined> {
    const [status] = await db
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.id, id));
    return status;
  }

  async updateTaskStatus(
    id: string,
    data: Partial<InsertTaskStatus>
  ): Promise<TaskStatus | undefined> {
    const [status] = await db
      .update(taskStatuses)
      .set(data)
      .where(eq(taskStatuses.id, id))
      .returning();
    return status;
  }

  async deleteTaskStatus(id: string): Promise<void> {
    await db.delete(taskStatuses).where(eq(taskStatuses.id, id));
  }

  // Tasks
  async createTask(data: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(data).returning();
    return task;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByOrganization(organizationId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.organizationId, organizationId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByTechnician(technicianId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedTechnicianId, technicianId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksBySalesPerson(salesPersonId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.salesPersonId, salesPersonId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByCreator(creatorId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.createdById, creatorId))
      .orderBy(desc(tasks.createdAt));
  }

  async updateTask(
    id: string,
    data: Partial<InsertTask>
  ): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Task Documents
  async createTaskDocument(data: InsertTaskDocument): Promise<TaskDocument> {
    const [doc] = await db.insert(taskDocuments).values(data).returning();
    return doc;
  }

  async getTaskDocuments(taskId: string): Promise<TaskDocument[]> {
    return db
      .select()
      .from(taskDocuments)
      .where(eq(taskDocuments.taskId, taskId));
  }

  async deleteTaskDocument(id: string): Promise<void> {
    await db.delete(taskDocuments).where(eq(taskDocuments.id, id));
  }

  // Emergency Contacts
  async createEmergencyContact(
    data: InsertEmergencyContact
  ): Promise<EmergencyContact> {
    const [contact] = await db
      .insert(emergencyContacts)
      .values(data)
      .returning();
    return contact;
  }

  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, userId));
  }

  async deleteEmergencyContact(id: string): Promise<void> {
    await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
  }

  // Notifications
  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Vault Access Codes
  async createVaultAccessCode(
    orgId: string,
    code: string,
    createdById: string
  ) {
    const [entry] = await db
      .insert(vaultAccessCodes)
      .values({ organizationId: orgId, code, createdById })
      .returning();
    return entry;
  }

  async validateVaultAccessCode(
    orgId: string,
    code: string
  ): Promise<boolean> {
    const [entry] = await db
      .select()
      .from(vaultAccessCodes)
      .where(
        and(
          eq(vaultAccessCodes.organizationId, orgId),
          eq(vaultAccessCodes.code, code),
          eq(vaultAccessCodes.isActive, true)
        )
      );
    return !!entry;
  }

  // Email Templates
  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db.insert(emailTemplates).values(data).returning();
    return template;
  }

  async getEmailTemplates(organizationId: string): Promise<EmailTemplate[]> {
    return db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.organizationId, organizationId))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    return template;
  }

  async updateEmailTemplate(
    id: string,
    data: Partial<InsertEmailTemplate>
  ): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .update(emailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return template;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // Seed default statuses for new org
  async seedDefaultStatuses(organizationId: string): Promise<void> {
    const defaults = [
      { name: "New", color: "#3B82F6", sortOrder: 0, isDefault: true },
      { name: "In Progress", color: "#F59E0B", sortOrder: 1, isDefault: true },
      { name: "Pending", color: "#EF4444", sortOrder: 2, isDefault: true },
      { name: "Completed", color: "#10B981", sortOrder: 3, isDefault: true },
    ];
    for (const status of defaults) {
      await db
        .insert(taskStatuses)
        .values({ ...status, organizationId });
    }
  }
}

export const storage = new DatabaseStorage();
