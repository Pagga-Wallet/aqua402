# ClickHouse Cluster — Implementation Plan

## Goals

-   Deploy ClickHouse cluster for storing protocol telemetry and analytics.
-   Support sharding and replication for high-load scenarios.
-   Integrate migrations using [clickhouse-migrator](https://github.com/martirosharutyunyan/clickhouse-migrator/blob/master/README.md).

## Architecture

-   Four ClickHouse nodes (`clickhouse-1…4`) in a 2×2 scheme (two shards × two replicas).
-   Coordination via ZooKeeper (`zookeeper` service in `app/clickhouse/docker-compose.yml`).
-   Load balancing and entry point — HAProxy (exports `8123`, `9000`, `8404`).
-   `migrator` container with built-in `clickhouse-migrator`, invoked via `docker compose run`.
-   Shared network `clickhouse-network`; external service access goes only through HAProxy.
-   Each node uses its own configurations `config-{n}.xml`, `macros-{n}.xml`, shared `users.xml` and `clusters.xml`.

```
app/clickhouse/
├── docker-compose.yml
├── config/
│   ├── config-1.xml
│   ├── config-2.xml
│   ├── config-3.xml
│   ├── config-4.xml
│   ├── users.xml
│   ├── macros-1.xml … macros-4.xml
│   └── clusters.xml
├── scripts/
│   └── zookeeper-entrypoint.sh
└── migrations/
    ├── sql/
    └── go/
```

## Data

-   Local volumes: `app/data/ch` mounted to `/var/lib/clickhouse` for each node (`clickhouse_{n}_data`, `clickhouse_{n}_logs`).
-   ZooKeeper stores state in volume `zookeeper_data`, logs — `zookeeper_logs`.
-   Configs stored in `app/clickhouse/config`.

## Migrations

-   `clickhouse-migrator` repository included in `app/clickhouse/clickhouse-migrator` (with Dockerfile).
-   Environment variables (`.env` next to `docker-compose.yml`) contain `CLICKHOUSE_*`, `ZOOKEEPER_*`, `CLICKHOUSE_CLUSTER`, `CLICKHOUSE_MIGRATOR_DSN`, etc.
-   Migration structure:
    -   `migrations/sql/` — SQL files with parameters (`{{ .Cluster }}`, `{{ .Database }}`).
    -   `migrations/go/` — custom Go steps (optional).
-   Example run:
    ```
    docker compose -f app/clickhouse/docker-compose.yml run --rm migrator \
      --dsn ${CLICKHOUSE_MIGRATOR_DSN:-clickhouse://user:pass@haproxy-clickhouse:9000/default} \
      --cluster ${CLICKHOUSE_CLUSTER} \
      --dir /migrations/sql \
      --table goose_db_version \
      up
    ```
-   Directory `app/clickhouse/migrations` is mounted in container (`/migrations`).
-   For seeding, create `*.sql`/`*.go` files with sequential numbering, use `--allow-missing` flag if needed.

## Indexer Integration

-   Ingest service writes data to ClickHouse via `INSERT INTO ...`.
-   Use `ReplicatedMergeTree` / `Distributed` tables.
-   Materialized views for aggregations.

## Roadmap

1. Prepare docker-compose (`app/clickhouse/docker-compose.yml`) with Keeper and nodes.
2. Initialize migrations and tables (`agents`, `credit_lines`, `streams`, `webhook_events`).
3. Configure backend service connections to cluster.
4. Add automatic migration runs in CI/CD.
