# RAJ TRADERS — VPS Read/Write Database Replication & Optimization Handbook

## 1. Architectural Overview

This system implements a production-grade **Read/Write Database Separation (Primary-Replica / Leader-Follower)** model tailored for self-hosted VPS deployments.

```
                                [ Client / Android App / Web ]
                                               │
                                   HTTP Requests (with optional
                                     x-db-recent-write token)
                                               ▼
                                 [ Express API Server ]
                                               │
                                 ┌─────────────┴─────────────┐
                                 │                           │
                     (Writes / Cooldown / Tx)        (Safe Reads / GET)
                                 ▼                           ▼
                        [ Primary Pool ]             [ Replica Pool ]
                       (Drizzle ORM Client)        (Drizzle ORM Client)
                                 │                           │
                                 ▼                           ▼
                       PgBouncer (Port 6432)       PgBouncer (Port 6433)
                                 │                           │
                                 ▼                           ▼
                       PostgreSQL Primary (5432)    PostgreSQL Replica (5433)
                       (Read-Write Master)   WAL    (Read-Only Hot Standby)
                                 │        Stream             │
                                 └───────────────────────────┘
```

### Key Components:
1. **PostgreSQL 16 Primary (Port 5432 / PgBouncer 6432)**:
   - Accepts all data mutations (`INSERT`, `UPDATE`, `DELETE`), DDL schema updates, explicit transactions, and critical checkout operations.
   - Streams Write-Ahead Logging (WAL) continuously to the standby replica.
2. **PostgreSQL 16 Read Replica (Port 5433 / PgBouncer 6433)**:
   - Configured in hot standby mode (`pg_is_in_recovery() = true`).
   - Serves high-volume read traffic (product listings, categories, search queries, storefront summaries, reporting).
3. **Smart Drizzle ORM Proxy & Routing Middleware**:
   - Application-level routing built directly into `@workspace/db` and `@workspace/api-server`.
   - Transparently routes `.select()` calls to the replica pool, while directing mutations and transactions to the primary pool.

---

## 2. Read-Your-Own-Writes Consistency (Replication Lag Mitigation)

### The Challenge
PostgreSQL streaming replication is asynchronous. There is typically a sub-second delay (replication lag) before a transaction committed on the Primary becomes visible on the Standby. Without mitigation, an immediate page refresh or follow-up query after a write could display stale data.

### The Mitigation: 5-Second Stateless Sticky Routing
1. Whenever a client executes a state-changing mutation (`POST`, `PUT`, `DELETE`, `PATCH`), the API server:
   - Executes the operation on the **Primary** database pool.
   - Emits a signed token via the `x-db-recent-write` HTTP response header and HTTP-only cookie.
2. For the subsequent **5 seconds** (the write cooldown window):
   - Any follow-up request carrying this valid token has its queries pinned to the **Primary** pool.
   - The user immediately observes their updated profile, newly placed order, or modified cart.
3. Once the 5-second window elapses:
   - Subsequent `GET` requests automatically transition back to the **Replica** pool for read scaling.

---

## 3. Environment Configuration (`.env`)

Add the following database settings to your VPS API Server `.env` file:

```env
# ─── Read/Write Database Replication (VPS) ─────────────────────
# Primary / Writer Pool (PgBouncer port 6432 or direct PostgreSQL port 5432)
PRIMARY_DATABASE_URL="postgresql://postgres:rajtraders_vps_master_2026@127.0.0.1:6432/rajtraders"

# Read Replica Pool (PgBouncer port 6433 or direct PostgreSQL port 5433)
REPLICA_DATABASE_URL="postgresql://postgres:rajtraders_vps_master_2026@127.0.0.1:6433/rajtraders"

# Optional Connection Pool Tuning
DB_PRIMARY_MAX_CONNECTIONS=15
DB_REPLICA_MAX_CONNECTIONS=25
```

> **Note on Backwards Compatibility:**  
> If `REPLICA_DATABASE_URL` is omitted, the application seamlessly routes all queries through `PRIMARY_DATABASE_URL` (or legacy `DATABASE_URL`) without errors.

---

## 4. Deployment Methods

### Option A: Docker Compose Deployment (Recommended for Quick VPS Setup)

The repository includes a ready-to-use Docker Compose stack: [`docker-compose.db.yml`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/docker-compose.db.yml).

```bash
# 1. Start Primary, Standby Replica, and Dual PgBouncer instances:
docker compose -f docker-compose.db.yml up -d

# 2. Check container status:
docker compose -f docker-compose.db.yml ps

# Containers launched:
# - rajtraders-postgres-primary (Port 5432)
# - rajtraders-postgres-replica (Port 5433)
# - rajtraders-pgbouncer-primary (Port 6432)
# - rajtraders-pgbouncer-replica (Port 6433)
```

### Option B: Native Ubuntu / Debian Host Setup (No Docker)

For bare-metal Ubuntu servers, execute the included automated provisioner: [`scripts/vps/setup-db-replication.sh`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/scripts/vps/setup-db-replication.sh).

```bash
# 1. Make script executable:
chmod +x scripts/vps/setup-db-replication.sh

# 2. Run provisioner (with your custom passwords):
sudo ./scripts/vps/setup-db-replication.sh "your_db_password" "your_replication_password"
```

The script automatically:
- Installs PostgreSQL 16 and PgBouncer.
- Configures `wal_level = replica`, `max_wal_senders = 10`, `hot_standby = on`.
- Creates the `replicator` role with streaming replication privileges in `pg_hba.conf`.
- Executes `pg_basebackup -R` to bootstrap the standby cluster on port 5433.
- Enables systemd services (`postgresql@16-main` and `postgresql@16-replica`).

---

## 5. Health Monitoring & Replication Lag Inspection

The API server provides a dedicated endpoint to observe replication health in real time:

```http
GET /api/health/db
```

### Sample Response (Healthy):
```json
{
  "status": "ok",
  "timestamp": "2026-10-14T18:25:00.000Z",
  "isReplicaConfigured": true,
  "isReplicaHealthy": true,
  "lagSeconds": 0,
  "primaryConnected": true,
  "replicaConnected": true,
  "activeRouting": "replica"
}
```

### Automated Circuit Breaker & Fallback:
If the replica:
- Exceeds **10 seconds** of replication lag, OR
- Becomes unreachable due to network or service restart:

The system automatically switches `activeRouting` to `"primary_fallback"`. All incoming read traffic is routed safely to the Primary pool so no customer requests fail. Once the replica catches up or reconnects, read routing automatically restores.

---

## 6. Verification CLI Commands

Run these commands on your VPS to verify the replication stream:

### 1. On Primary (Port 5432):
```bash
sudo -u postgres psql -p 5432 -c "SELECT client_addr, usename, state, sync_state FROM pg_stat_replication;"
```
Expected output:
```
 client_addr │ usename    │   state   │ sync_state 
─────────────┼────────────┼───────────┼────────────
 127.0.0.1   │ replicator │ streaming │ async
```

### 2. On Replica (Port 5433):
```bash
sudo -u postgres psql -p 5433 -c "SELECT pg_is_in_recovery() AS is_standby, pg_last_wal_replay_lsn() AS replay_lsn;"
```
Expected output:
```
 is_standby │ replay_lsn 
────────────┼────────────
 t          │ 0/3000148
```
