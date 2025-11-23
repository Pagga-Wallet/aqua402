#!/bin/bash
# Optimized entrypoint for ZooKeeper with automatic initialization

set -e

echo "🚀 Starting ZooKeeper with automatic initialization..."

# Start ZooKeeper in background through standard entrypoint
/docker-entrypoint.sh zkServer.sh start-foreground &
ZK_PID=$!

echo "⏳ Waiting for ZooKeeper to be ready..."

# Wait for ZooKeeper to be ready (up to 30 seconds)
for i in {1..30}; do
    if echo "ruok" | nc localhost 2181 2>/dev/null | grep -q "imok"; then
        echo "✅ ZooKeeper started and ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Timeout: ZooKeeper did not respond within 30 seconds"
        kill $ZK_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo "🔧 Initializing data structure..."

# Create root node /clickhouse (ignore if already exists)
zkCli.sh -server localhost:2181 create /clickhouse "" 2>&1 | grep -E "Created|already exists" && echo "✅ Node /clickhouse ready" || echo "⚠️ Failed to create node (may already exist)"

echo "✅ Initialization completed! ZooKeeper is running."
echo "📊 Healthcheck will be performed automatically by Docker"

# Continue ZooKeeper operation
wait $ZK_PID
