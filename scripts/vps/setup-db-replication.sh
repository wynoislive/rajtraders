#!/usr/bin/env bash
# ==============================================================================
# RAJ TRADERS — VPS Native PostgreSQL 16 Streaming Replication Provisioner
# ==============================================================================
# Usage:
#   chmod +x setup-db-replication.sh
#   sudo ./setup-db-replication.sh [PRIMARY_PASS] [REPLICA_PASS]
# ==============================================================================

set -euo pipefail

PRIMARY_PORT=5432
REPLICA_PORT=5433
PG_VERSION=16
CLUSTER_PRIMARY="main"
CLUSTER_REPLICA="replica"

DB_USER="postgres"
DB_NAME="rajtraders"
DB_PASS="${1:-rajtraders_vps_master_2026}"
REPL_USER="replicator"
REPL_PASS="${2:-rajtraders_repl_secret_2026}"

echo "===================================================================="
echo " Starting PostgreSQL $PG_VERSION Streaming Replication Setup on VPS"
echo "===================================================================="

# 1. Install PostgreSQL repository if needed
if ! command -v psql &> /dev/null; then
  echo "Installing PostgreSQL $PG_VERSION and PgBouncer..."
  apt-get update -y
  apt-get install -y curl ca-certificates gnupg lsb-release
  install -d /etc/apt/keyrings
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg
  echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
  apt-get install -y postgresql-$PG_VERSION postgresql-client-$PG_VERSION pgbouncer
fi

# 2. Configure Primary Cluster
PRIMARY_CONF="/etc/postgresql/$PG_VERSION/$CLUSTER_PRIMARY/postgresql.conf"
PRIMARY_HBA="/etc/postgresql/$PG_VERSION/$CLUSTER_PRIMARY/pg_hba.conf"

echo "Configuring Primary cluster ($CLUSTER_PRIMARY on port $PRIMARY_PORT)..."
systemctl start postgresql@$PG_VERSION-$CLUSTER_PRIMARY

# Set postgres password & create database
sudo -u postgres psql -p $PRIMARY_PORT -c "ALTER USER postgres PASSWORD '$DB_PASS';"
sudo -u postgres psql -p $PRIMARY_PORT -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -p $PRIMARY_PORT -c "CREATE DATABASE $DB_NAME OWNER postgres;"

# Create replication user
sudo -u postgres psql -p $PRIMARY_PORT -tc "SELECT 1 FROM pg_roles WHERE rolname = '$REPL_USER'" | grep -q 1 || \
sudo -u postgres psql -p $PRIMARY_PORT -c "CREATE ROLE $REPL_USER WITH REPLICATION LOGIN PASSWORD '$REPL_PASS';"

# Tuning postgresql.conf for replication
sed -i "s/#\?wal_level\s*=.*/wal_level = replica/" "$PRIMARY_CONF"
sed -i "s/#\?max_wal_senders\s*=.*/max_wal_senders = 10/" "$PRIMARY_CONF"
sed -i "s/#\?max_replication_slots\s*=.*/max_replication_slots = 10/" "$PRIMARY_CONF"
sed -i "s/#\?hot_standby\s*=.*/hot_standby = on/" "$PRIMARY_CONF"
sed -i "s/#\?listen_addresses\s*=.*/listen_addresses = '*'/" "$PRIMARY_CONF"

# Append pg_hba.conf rules if missing
if ! grep -q "host replication $REPL_USER" "$PRIMARY_HBA"; then
  echo "host replication $REPL_USER 127.0.0.1/32 scram-sha-256" >> "$PRIMARY_HBA"
  echo "host replication $REPL_USER ::1/128 scram-sha-256" >> "$PRIMARY_HBA"
fi

systemctl restart postgresql@$PG_VERSION-$CLUSTER_PRIMARY
echo "Primary cluster restarted with replication enabled."

# 3. Create and initialize Standby Replica Cluster
REPLICA_DATA="/var/lib/postgresql/$PG_VERSION/$CLUSTER_REPLICA"
REPLICA_CONF="/etc/postgresql/$PG_VERSION/$CLUSTER_REPLICA/postgresql.conf"

echo "Provisioning Standby Replica cluster ($CLUSTER_REPLICA on port $REPLICA_PORT)..."
if pg_lsclusters | grep -q "$CLUSTER_REPLICA"; then
  systemctl stop postgresql@$PG_VERSION-$CLUSTER_REPLICA || true
  pg_dropcluster --stop $PG_VERSION $CLUSTER_REPLICA
fi

pg_createcluster $PG_VERSION $CLUSTER_REPLICA --port $REPLICA_PORT
systemctl stop postgresql@$PG_VERSION-$CLUSTER_REPLICA || true
rm -rf "$REPLICA_DATA"/*

echo "Taking physical basebackup from Primary to Standby..."
PGPASSWORD="$REPL_PASS" pg_basebackup \
  -h 127.0.0.1 \
  -p $PRIMARY_PORT \
  -U "$REPL_USER" \
  -D "$REPLICA_DATA" \
  -Fp -Xs -R

chown -R postgres:postgres "$REPLICA_DATA"
chmod 700 "$REPLICA_DATA"

# Configure replica port & hot standby
sed -i "s/port\s*=\s*[0-9]*/port = $REPLICA_PORT/" "$REPLICA_CONF"
sed -i "s/#\?hot_standby\s*=.*/hot_standby = on/" "$REPLICA_CONF"

systemctl start postgresql@$PG_VERSION-$CLUSTER_REPLICA
echo "Standby Replica started on port $REPLICA_PORT."

# 4. Verify Replication Stream
sleep 2
echo "Verifying active replication stream on Primary..."
sudo -u postgres psql -p $PRIMARY_PORT -c "SELECT client_addr, usename, application_name, state, sync_state FROM pg_stat_replication;"

echo "Verifying standby status on Replica..."
sudo -u postgres psql -p $REPLICA_PORT -c "SELECT pg_is_in_recovery() AS is_in_standby, pg_last_wal_replay_lsn() AS replay_lsn;"

echo "===================================================================="
echo " REPLICATION READY!"
echo " Primary: postgresql://postgres:$DB_PASS@127.0.0.1:$PRIMARY_PORT/$DB_NAME"
echo " Replica: postgresql://postgres:$DB_PASS@127.0.0.1:$REPLICA_PORT/$DB_NAME"
echo ""
echo " Set in your API Server .env file:"
echo " PRIMARY_DATABASE_URL=\"postgresql://postgres:$DB_PASS@127.0.0.1:$PRIMARY_PORT/$DB_NAME\""
echo " REPLICA_DATABASE_URL=\"postgresql://postgres:$DB_PASS@127.0.0.1:$REPLICA_PORT/$DB_NAME\""
echo "===================================================================="
