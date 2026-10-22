# ⚡ Intelligent DBMS Studio

**Intelligent DBMS Studio** is a full-stack, AI-powered database development platform that combines visual ER diagramming, Monaco SQL IDE, AI query generation & optimization, database schema health analysis, and simulated execution performance monitoring.

---

## 🌟 Key Features

1. **Visual ER Database Designer**
   - Interactive drag-and-drop schema canvas powered by React Flow
   - Add tables, configure data types, Primary Keys, Unique constraints, Nullability, and Auto-increment
   - Connect tables to create foreign key relationships (One-to-One, One-to-Many, Many-to-Many)
   - One-click SQL schema generation (compatible with MySQL, PostgreSQL, SQLite, SQL Server, and Oracle)

2. **AI SQL Generator**
   - Natural Language to SQL translation
   - Context-aware querying referencing your active database schema
   - Returns complete SQL, human-friendly explanation, referenced tables, assumptions, and query performance tips

3. **AI Database Copilot**
   - Floating AI assistant drawer accessible across every page
   - Context-aware database chat, quick prompts, and real-time SQL suggestions

4. **Monaco SQL IDE**
   - VS Code Monaco SQL Editor with syntax highlighting, autocomplete, and indentation
   - Safe simulated query execution sandbox with data tables and execution metrics
   - One-click SQL query formatter and AI clause breakdown explainer

5. **AI Query Optimizer**
   - Instant SQL anti-pattern detection (Full table scans, correlated subqueries, missing indexes, `SELECT *`)
   - Before/After performance scoring (e.g. `45/100 -> 81/100`)
   - Side-by-side SQL diff and estimated percentage improvement

6. **Schema Health Analyzer**
   - AI evaluation of database design health score (out of 100)
   - Category breakdowns: Structure, Indexing, Naming conventions, Normalization, Relationships, Performance
   - Actionable severity badges (🔴 Critical, 🟡 Warning, 🔵 Info) with auto-fix suggestions

7. **Performance Monitor**
   - Live query metrics: Avg execution time, Slow queries, Query volume, Index usage
   - Recharts visual graphs: Execution time curves, Queries per minute, Query type distribution (SELECT/INSERT/UPDATE/DELETE)

8. **Project & Query Management**
   - Multi-project workspaces (Preloaded with E-Commerce, Hospital, College, and Banking schemas)
   - Searchable and filterable query history log with re-run and export capabilities

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Flow, Monaco Editor, Recharts, Zustand, Lucide Icons, Vite
- **Backend**: Node.js, Express, TypeScript, TSX, Better-SQLite3, JWT authentication, bcryptjs, Helmet, CORS
- **Database**: SQLite (Zero-config local persistence)
- **AI Architecture**: Pluggable AI Service Layer featuring **Google Gemma 4** (31B Dense, 26B MoE, 12B Workstation, E4B Edge) with local Ollama inference, thinking mode, OpenAI-compatible cloud proxies, and safe deterministic fallback.

---

## 🚀 Quick Start Guide

### 1. Backend Server
```bash
cd backend
npm install
npm run dev
```
Backend runs at `http://localhost:5000`

### 2. Frontend Development Server
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`

---

## 🔑 Demo Account Credentials

- **Email**: `demo@dbmsstudio.com`
- **Password**: `demo1234`
*(The application also auto-authenticates in demo mode for instant evaluation)*

---

## 📂 Preloaded Projects

1. **E-Commerce Database** (MySQL): `users`, `categories`, `products`, `orders`, `order_items`, `payments`
2. **Hospital Management System** (PostgreSQL): `patients`, `doctors`, `appointments`, `prescriptions`
3. **College Management System** (PostgreSQL): `students`, `teachers`, `courses`, `enrollments`
4. **Banking Database** (PostgreSQL): `accounts`, `transactions`, `customers`, `loans`

---

## 🤖 Running Google Gemma 4 Locally

Intelligent DBMS Studio is pre-configured to use **Google Gemma 4**:

```bash
# 1. Pull and run Gemma 4 in Ollama (Flagship reasoning model)
ollama run gemma4:31b

# Or lightweight variants for laptops / edge devices:
# ollama run gemma4:26b   (Mixture-of-Experts)
# ollama run gemma4:12b   (Balanced Workstation)
# ollama run gemma4:e4b   (Ultra-fast Edge)
```

In the app, visit **Settings** to test the connection, toggle Gemma 4 Thinking Mode, or specify a custom remote inference endpoint. When Ollama is not active, the system automatically engages an intelligent offline simulation fallback so your workflow is never interrupted.
