#!/bin/bash
set -e

# Creates replication user and grants replication permissions
echo "Creating replication role '${REPLICATION_USER}' on PostgreSQL Primary..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE ${REPLICATION_USER} WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
EOSQL

# Append replication permissions to pg_hba.conf
echo "host replication ${REPLICATION_USER} all scram-sha-256" >> "$PGDATA/pg_hba.conf"
echo "host all all all scram-sha-256" >> "$PGDATA/pg_hba.conf"

echo "Primary replication initialization complete."
