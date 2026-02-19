# EZ Field Task

## Overview

EZ Field Task is a cross-platform mobile application built for MSPs (Managed Service Providers) and technician-based service companies to manage field tasks, scheduling, documentation, and reporting. The app targets Android, iOS, and web platforms.

The project uses a monorepo structure with an Expo/React Native frontend and an Express.js backend, connected to a PostgreSQL database via Drizzle ORM. It features multi-tenant organization support, JWT-based authentication, role-based access control (RBAC) with four user roles (Admin, Scheduler, Sales, Technician), and AES-256-GCM vault encryption for sensitive data.

Domain: ezfieldtask.ca

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React Native with Expo SDK 54, using expo-router for file-based routing
- **Routing**: File-based routing via `expo-router` with role-based route groups:
  - `app/(auth)/` — Login and registration screens
  - `app/(admin)/` — Admin dashboard with tabs: Tasks, Staff, Email Config, Templates, Settings
  - `app/(technician)/` — Technician view with tabs: My Day, Calendar, Settings
  - `app/(scheduler)/` — Scheduler view with tabs: Tasks, Schedule, Calendar, Settings
  - `app/(sales)/` — Sales view with tabs: Dashboard, My Tasks, Settings
  - `app/task/` — Shared task detail (`[id].tsx`) and creation (`create.tsx`) screens
- **Navigation pattern**: The root `app/index.tsx` acts as a router guard — it checks auth state and redirects to the appropriate role-based route group
- **State management**: TanStack React Query for server state; React Context (`AuthProvider`) for auth state
- **API communication**: Custom `authFetch` wrapper in `lib/api.ts` that attaches JWT tokens from AsyncStorage to all requests
- **Styling**: React Native StyleSheet with a custom color system (`constants/colors.ts`) supporting light/dark themes
- **Fonts**: Inter font family loaded via `@expo-google-fonts/inter`
- **Native features**: Supports native tab bars via `expo-router/unstable-native-tabs` with iOS SF Symbols, falls back to Ionicons-based classic tabs on other platforms

### Backend Architecture

- **Framework**: Express.js v5 running on Node.js
- **Language**: TypeScript, compiled with `tsx` for development and `esbuild` for production
- **API pattern**: RESTful JSON API under `/api/` prefix
- **Authentication**: JWT-based auth with `bcryptjs` for password hashing, middleware-based RBAC via `requireRole()` 
- **Key API routes** (defined in `server/routes.ts`):
  - `POST /api/auth/register` — Register new organization + admin user
  - `POST /api/auth/login` — Login with email, password, and org slug
  - CRUD for tasks, users, task statuses, emergency contacts, email templates, notifications
  - Dashboard stats endpoint
  - Email/SMTP configuration
  - Vault encryption/decryption endpoints
- **Storage layer**: `DatabaseStorage` class in `server/storage.ts` wraps all Drizzle queries, providing a clean data access layer
- **Vault encryption**: AES-256-GCM encryption with PBKDF2 key derivation for sensitive fields (`server/vault.ts`)
- **CORS**: Dynamic CORS configuration supporting Replit domains and localhost development

### Database

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema location**: `shared/schema.ts` (shared between frontend and backend)
- **Key tables**:
  - `organizations` — Multi-tenant support with branding (logo, colors) and SMTP config
  - `users` — With role enum (admin, scheduler, sales, technician), organization scoping, licensing
  - `tasks` — Field tasks with urgency enum (low, medium, high, critical), scheduling, contact info
  - `task_statuses` — Custom, org-scoped task statuses with colors
  - `task_documents` — File attachments for tasks
  - `emergency_contacts` — Per-organization emergency contacts
  - `notifications` — In-app notification system
  - `vault_access_codes` — Encrypted vault entries
  - `email_templates` — Customizable email templates with variable substitution
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not migration files)
- **IDs**: UUID primary keys generated via PostgreSQL's `gen_random_uuid()`

### Multi-Tenancy

The app is multi-tenant at the organization level. Each organization has a unique slug used during login. All data (users, tasks, statuses, etc.) is scoped to an organization via `organizationId` foreign keys.

### Build & Deployment

- **Development**: Two processes run concurrently — Expo dev server for the mobile/web frontend and `tsx` for the Express backend
- **Production build**: Expo static web build via custom `scripts/build.js`, Express server bundled with esbuild
- **Static serving**: In production, the Express server serves the built Expo web app as static files

## External Dependencies

### Database
- **PostgreSQL** — Primary data store, connected via `pg` driver with connection pooling. Required `DATABASE_URL` environment variable.

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** — Database ORM and migration tooling
- **express** v5 — HTTP server
- **jsonwebtoken** — JWT token generation/verification
- **bcryptjs** — Password hashing
- **connect-pg-simple** — PostgreSQL session store (available but JWT is primary auth)
- **@tanstack/react-query** — Server state management on frontend
- **expo** SDK 54 — Cross-platform mobile framework
- **expo-router** — File-based routing
- **expo-image-picker** — Image upload capability
- **expo-location** — GPS/location services
- **zod** — Schema validation (via drizzle-zod)

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `SESSION_SECRET` — JWT signing secret (defaults to fallback if not set)
- `EXPO_PUBLIC_DOMAIN` — Public domain for API communication
- `REPLIT_DEV_DOMAIN` — Replit development domain for CORS and Expo config