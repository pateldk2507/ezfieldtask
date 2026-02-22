import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import {
  authMiddleware,
  requireRole,
  hashPassword,
  comparePassword,
  generateToken,
  type AuthRequest,
} from "./auth";
import { encryptVaultData, decryptVaultData } from "./vault";
import { sendWelcomeEmail, sendTaskAssignmentEmail, generateTempPassword, sendEmail, verifySmtpConnection } from "./email";
import { loginSchema, registerSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ──── Auth Routes ────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }

      const { email, password, fullName, username, orgName } = parsed.data;
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const existingOrg = await storage.getOrganizationBySlug(slug);
      if (existingOrg) {
        return res.status(400).json({ message: "Organization name already taken" });
      }

      const org = await storage.createOrganization({ name: orgName, slug });
      await storage.seedDefaultStatuses(org.id);

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        organizationId: org.id,
        email,
        password: hashedPassword,
        fullName,
        username,
        role: "admin",
        isActive: true,
        isLicensed: true,
        notificationsEnabled: true,
      });

      const token = generateToken({
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        username: user.username,
      });

      const { password: _, ...safeUser } = user;
      res.json({ token, user: safeUser, organization: org });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const { email, password, orgSlug } = parsed.data;

      const org = await storage.getOrganizationBySlug(orgSlug);
      if (!org) {
        return res.status(401).json({ message: "Organization not found" });
      }

      const user = await storage.getUserByEmail(email, org.id);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated" });
      }

      const valid = await comparePassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken({
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        username: user.username,
      });

      const { password: _, ...safeUser } = user;
      res.json({ token, user: safeUser, organization: org });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const org = await storage.getOrganization(user.organizationId);
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser, organization: org });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ──── User Management Routes (Admin only) ────
  app.get("/api/users", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const allUsers = await storage.getUsersByOrganization(req.user!.organizationId);
      const safeUsers = allUsers.map(({ password: _, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/role/:role", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const roleUsers = await storage.getUsersByRole(
        req.user!.organizationId,
        req.params.role
      );
      const safeUsers = roleUsers.map(({ password: _, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post(
    "/api/users",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { email, fullName, username, role, phone } = req.body;

        const existing = await storage.getUserByEmail(email, req.user!.organizationId);
        if (existing) {
          return res.status(400).json({ message: "Email already exists in this organization" });
        }

        const tempPassword = req.body.password || generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);
        const user = await storage.createUser({
          organizationId: req.user!.organizationId,
          email,
          password: hashedPassword,
          fullName,
          username,
          role: role || "technician",
          phone,
          isActive: true,
          isLicensed: false,
          notificationsEnabled: true,
        });

        const org = await storage.getOrganization(req.user!.organizationId);
        if (org) {
          sendWelcomeEmail(org, email, fullName, tempPassword, role || "technician").catch((err) =>
            console.error("Welcome email failed:", err)
          );
        }

        const { password: _, ...safeUser } = user;
        res.json({ ...safeUser, tempPassword });
      } catch (error) {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  );

  app.put(
    "/api/users/:id",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const existingUser = await storage.getUser(req.params.id);
        if (!existingUser || existingUser.organizationId !== req.user!.organizationId) {
          return res.status(404).json({ message: "User not found" });
        }

        if (req.user!.role !== "admin" && req.user!.id !== req.params.id) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        const { password, ...updateData } = req.body;
        if (password) {
          (updateData as any).password = await hashPassword(password);
        }

        const user = await storage.updateUser(req.params.id, updateData);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { password: _, ...safeUser } = user;
        res.json(safeUser);
      } catch (error) {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  );

  app.delete(
    "/api/users/:id",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        await storage.deleteUser(req.params.id);
        res.json({ message: "User deleted" });
      } catch (error) {
        res.status(500).json({ message: "Failed to delete user" });
      }
    }
  );

  // ──── Task Status Routes ────
  app.get("/api/task-statuses", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const statuses = await storage.getTaskStatuses(req.user!.organizationId);
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statuses" });
    }
  });

  app.post(
    "/api/task-statuses",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const status = await storage.createTaskStatus({
          ...req.body,
          organizationId: req.user!.organizationId,
        });
        res.json(status);
      } catch (error) {
        res.status(500).json({ message: "Failed to create status" });
      }
    }
  );

  app.put(
    "/api/task-statuses/:id",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const status = await storage.updateTaskStatus(req.params.id, req.body);
        res.json(status);
      } catch (error) {
        res.status(500).json({ message: "Failed to update status" });
      }
    }
  );

  app.delete(
    "/api/task-statuses/:id",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        await storage.deleteTaskStatus(req.params.id);
        res.json({ message: "Status deleted" });
      } catch (error) {
        res.status(500).json({ message: "Failed to delete status" });
      }
    }
  );

  // ──── Task Routes ────
  app.get("/api/tasks", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { role, id, organizationId } = req.user!;
      let taskList: any[];

      if (role === "admin" || role === "scheduler") {
        taskList = await storage.getTasksByOrganization(organizationId);
      } else if (role === "technician") {
        taskList = await storage.getTasksByTechnician(id);
      } else if (role === "sales") {
        taskList = await storage.getTasksByCreator(id);
      } else {
        taskList = [];
      }

      res.json(taskList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task || task.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: "Task not found" });
      }

      const { role, id } = req.user!;
      if (role === "technician" && task.assignedTechnicianId !== id) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (role === "sales" && task.createdById !== id && task.salesPersonId !== id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post(
    "/api/tasks",
    authMiddleware,
    requireRole("admin", "scheduler", "sales"),
    async (req: AuthRequest, res: Response) => {
      try {
        const statuses = await storage.getTaskStatuses(req.user!.organizationId);
        const newStatus = statuses.find((s) => s.name === "New");

        let vaultData = req.body.vaultData;
        if (req.body.vaultAccessCodeRequired && vaultData && req.body.vaultAccessCode) {
          vaultData = encryptVaultData(vaultData, req.body.vaultAccessCode);
        }

        const task = await storage.createTask({
          ...req.body,
          organizationId: req.user!.organizationId,
          createdById: req.user!.id,
          statusId: req.body.statusId || newStatus?.id,
          vaultData,
        });

        if (task.assignedTechnicianId) {
          const tech = await storage.getUser(task.assignedTechnicianId);
          const org = await storage.getOrganization(req.user!.organizationId);
          if (tech && org) {
            sendTaskAssignmentEmail(
              org,
              tech.email,
              tech.fullName,
              task.title,
              task.description || "",
              task.scheduledDate || "",
              task.scheduledTime || "",
              task.address || "",
              task.contactPersonName || "",
              task.contactPhone || "",
              task.urgency || "medium"
            ).catch((err) => console.error("Task assignment email failed:", err));
          }
        }

        res.json(task);
      } catch (error) {
        console.error("Create task error:", error);
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  );

  app.put("/api/tasks/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task || task.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: "Task not found" });
      }

      const { role, id } = req.user!;

      if (role === "technician") {
        const allowed = ["statusId", "pendingReason"];
        const keys = Object.keys(req.body);
        const hasDisallowed = keys.some((k) => !allowed.includes(k));
        if (hasDisallowed) {
          return res.status(403).json({ message: "Technicians can only update status" });
        }
      }

      if (role === "sales" && task.createdById !== id) {
        return res.status(403).json({ message: "Sales can only edit their own tasks" });
      }

      let updateData = { ...req.body };
      if (updateData.vaultData && updateData.vaultAccessCode) {
        updateData.vaultData = encryptVaultData(
          updateData.vaultData,
          updateData.vaultAccessCode
        );
        delete updateData.vaultAccessCode;
      }

      const previousTechId = task.assignedTechnicianId;
      const updated = await storage.updateTask(req.params.id, updateData);

      if (updated && updateData.assignedTechnicianId && updateData.assignedTechnicianId !== previousTechId) {
        const tech = await storage.getUser(updateData.assignedTechnicianId);
        const org = await storage.getOrganization(req.user!.organizationId);
        if (tech && org) {
          sendTaskAssignmentEmail(
            org,
            tech.email,
            tech.fullName,
            updated.title,
            updated.description || "",
            updated.scheduledDate || "",
            updated.scheduledTime || "",
            updated.address || "",
            updated.contactPersonName || "",
            updated.contactPhone || "",
            updated.urgency || "medium"
          ).catch((err) => console.error("Task reassignment email failed:", err));
        }
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete(
    "/api/tasks/:id",
    authMiddleware,
    requireRole("admin", "scheduler"),
    async (req: AuthRequest, res: Response) => {
      try {
        const task = await storage.getTask(req.params.id);
        if (!task || task.organizationId !== req.user!.organizationId) {
          return res.status(404).json({ message: "Task not found" });
        }
        await storage.deleteTask(req.params.id);
        res.json({ message: "Task deleted" });
      } catch (error) {
        res.status(500).json({ message: "Failed to delete task" });
      }
    }
  );

  // ──── Vault Routes ────
  app.post("/api/tasks/:id/vault/decrypt", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task || task.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!task.vaultData) {
        return res.status(400).json({ message: "No vault data" });
      }

      const { accessCode } = req.body;
      if (!accessCode) {
        return res.status(400).json({ message: "Access code required" });
      }

      const decrypted = decryptVaultData(task.vaultData, accessCode);
      if (!decrypted) {
        return res.status(401).json({ message: "Invalid access code" });
      }

      res.json({ data: decrypted });
    } catch (error) {
      res.status(500).json({ message: "Failed to decrypt vault" });
    }
  });

  // ──── Emergency Contacts ────
  app.get("/api/emergency-contacts", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const contacts = await storage.getEmergencyContacts(req.user!.id);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/emergency-contacts", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const contact = await storage.createEmergencyContact({
        ...req.body,
        userId: req.user!.id,
      });
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.delete("/api/emergency-contacts/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteEmergencyContact(req.params.id);
      res.json({ message: "Contact deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // ──── Notifications ────
  app.get("/api/notifications", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const notifs = await storage.getNotifications(req.user!.id);
      res.json(notifs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id/read", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ message: "Marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification" });
    }
  });

  // ──── Organization Routes ────
  app.get("/api/organization", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const org = await storage.getOrganization(req.user!.organizationId);
      res.json(org);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.put(
    "/api/organization",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const org = await storage.updateOrganization(
          req.user!.organizationId,
          req.body
        );
        res.json(org);
      } catch (error) {
        res.status(500).json({ message: "Failed to update organization" });
      }
    }
  );

  // ──── Email Config (Organization SMTP) ────
  app.get(
    "/api/email-config",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const org = await storage.getOrganization(req.user!.organizationId);
        if (!org) return res.status(404).json({ message: "Organization not found" });
        res.json({
          smtpHost: org.smtpHost || "",
          smtpPort: org.smtpPort || 587,
          smtpUser: org.smtpUser || "",
          smtpPass: org.smtpPass ? "********" : "",
          hasPassword: !!org.smtpPass,
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch email config" });
      }
    }
  );

  app.put(
    "/api/email-config",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
        const updateData: any = {};
        if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
        if (smtpPort !== undefined) updateData.smtpPort = parseInt(smtpPort) || 587;
        if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
        if (smtpPass !== undefined && smtpPass !== "********") updateData.smtpPass = smtpPass;

        const org = await storage.updateOrganization(req.user!.organizationId, updateData);
        res.json({
          smtpHost: org?.smtpHost || "",
          smtpPort: org?.smtpPort || 587,
          smtpUser: org?.smtpUser || "",
          smtpPass: org?.smtpPass ? "********" : "",
          hasPassword: !!org?.smtpPass,
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to update email config" });
      }
    }
  );

  app.post(
    "/api/email-config/test",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const org = await storage.getOrganization(req.user!.organizationId);
        if (!org?.smtpHost || !org?.smtpUser || !org?.smtpPass) {
          return res.status(400).json({ message: "SMTP not configured. Please save your SMTP host, username, and password first." });
        }

        const verification = await verifySmtpConnection(org);
        if (!verification.success) {
          return res.status(400).json({ message: `SMTP connection failed: ${verification.error}` });
        }

        const sent = await sendEmail(org, {
          to: org.smtpUser,
          subject: `EZ Field Task - SMTP Test (${org.name})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #0066FF;">SMTP Test Successful!</h2>
              <p>Your email configuration for <strong>${org.name}</strong> is working correctly.</p>
              <p style="color: #666; font-size: 14px;">This is a test email from EZ Field Task.</p>
            </div>
          `,
        });

        if (sent) {
          res.json({ message: `Test email sent successfully to ${org.smtpUser}` });
        } else {
          res.status(400).json({ message: "SMTP connected but failed to send test email. Check your email provider settings." });
        }
      } catch (error: any) {
        console.error("Test email error:", error);
        res.status(500).json({ message: "Failed to test email: " + (error?.message || "Unknown error") });
      }
    }
  );

  // ──── Email Templates ────
  app.get(
    "/api/email-templates",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const templates = await storage.getEmailTemplates(req.user!.organizationId);
        res.json(templates);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch email templates" });
      }
    }
  );

  app.get(
    "/api/email-templates/:id",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const template = await storage.getEmailTemplate(req.params.id);
        if (!template || template.organizationId !== req.user!.organizationId) {
          return res.status(404).json({ message: "Template not found" });
        }
        res.json(template);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch template" });
      }
    }
  );

  app.post(
    "/api/email-templates",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { name, subject, body } = req.body;
        if (!name || !subject || !body) {
          return res.status(400).json({ message: "Name, subject, and body are required" });
        }
        const template = await storage.createEmailTemplate({
          name,
          subject,
          body,
          organizationId: req.user!.organizationId,
          createdById: req.user!.id,
          isActive: true,
        });
        res.json(template);
      } catch (error) {
        res.status(500).json({ message: "Failed to create template" });
      }
    }
  );

  app.put(
    "/api/email-templates/:id",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const existing = await storage.getEmailTemplate(req.params.id);
        if (!existing || existing.organizationId !== req.user!.organizationId) {
          return res.status(404).json({ message: "Template not found" });
        }
        const template = await storage.updateEmailTemplate(req.params.id, req.body);
        res.json(template);
      } catch (error) {
        res.status(500).json({ message: "Failed to update template" });
      }
    }
  );

  app.delete(
    "/api/email-templates/:id",
    authMiddleware,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const existing = await storage.getEmailTemplate(req.params.id);
        if (!existing || existing.organizationId !== req.user!.organizationId) {
          return res.status(404).json({ message: "Template not found" });
        }
        await storage.deleteEmailTemplate(req.params.id);
        res.json({ message: "Template deleted" });
      } catch (error) {
        res.status(500).json({ message: "Failed to delete template" });
      }
    }
  );

  // ──── Dashboard Stats ────
  app.get("/api/dashboard/stats", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { role, id, organizationId } = req.user!;
      let taskList: any[];

      if (role === "admin" || role === "scheduler") {
        taskList = await storage.getTasksByOrganization(organizationId);
      } else if (role === "technician") {
        taskList = await storage.getTasksByTechnician(id);
      } else {
        taskList = await storage.getTasksByCreator(id);
      }

      const statuses = await storage.getTaskStatuses(organizationId);
      const today = new Date().toISOString().split("T")[0];
      const todayTasks = taskList.filter((t) => t.scheduledDate === today);

      const statusCounts: Record<string, number> = {};
      for (const status of statuses) {
        statusCounts[status.name] = taskList.filter(
          (t) => t.statusId === status.id
        ).length;
      }

      res.json({
        totalTasks: taskList.length,
        todayTasks: todayTasks.length,
        statusCounts,
        statuses,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
