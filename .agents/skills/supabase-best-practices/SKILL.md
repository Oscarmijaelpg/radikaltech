---
name: Supabase Best Practices
description: A skill providing comprehensive guidelines and procedures for optimizing Supabase projects, including database performance, RLS security, and efficient connection management.
---

# Supabase Best Practices

Use this skill to ensure all Supabase-related development follows industry standards and optimized patterns.

## 1. Database & Schema Optimization
- **Naming Conventions**: Use `snake_case` and lowercase identifiers for all tables and columns. Avoid camelCase to prevent double-quoting in SQL.
- **Primary Keys**: Ensure every table has a primary key (UUIDs are preferred for distributed systems).
- **Indexing**:
  - Always index columns used in `WHERE`, `JOIN`, and `ORDER BY` clauses.
  - Use **Partial Indexes** for columns frequently filtered by specific values.
  - Use **Covering Indexes** (using `INCLUDE`) for index-only scans.
  - Use **GIN Indexes** for `JSONB` columns.
- **Pagination**: Use **Keyset Pagination** (cursor-based) instead of `OFFSET` for large datasets to maintain performance.

## 2. Row Level Security (RLS) & Security
- **Enable RLS**: Always enable RLS on every table that contains sensitive or user-specific data.
- **Optimize Policies**: Ensure that columns used in RLS policy conditions (e.g., `user_id`) are indexed.
- **Least Privilege**: Grant the minimum necessary permissions to roles. Use the `authenticated` and `anon` roles strictly as intended.
- **Schema Separation**: Keep sensitive application logic in private schemas and only expose necessary tables/views in the `public` schema.

## 3. Connection Management
- **Supavisor**: Use the Supabase connection pooler (Supavisor) for high-concurrency applications to avoid "too many connections" errors.
- **Transaction Management**: Keep transactions as short as possible to release connections quickly.

## 4. Performance Monitoring & Debugging
- **Query Plans**: Use `EXPLAIN ANALYZE` to diagnose slow queries.
- **Extensions**: Enable `pg_stat_statements` to track and analyze query performance over time.

## 5. Deployment & Migrations
- **Version Control**: Use the Supabase CLI for all schema changes. Never make manual DDL changes in the production dashboard.
- **Edge Functions**:
  - Use environment variables for sensitive keys.
  - Implement proper error handling and logging.
  - Keep functions focused and lightweight.

## Implementation Procedure
When working on a Supabase task:
1. Review the proposed schema/query against these best practices.
2. If creating a table, ensure RLS and appropriate indexes are included in the migration.
3. If writing a query, check if it can benefit from keyset pagination or specific index types.
4. Validate performance using `mcp_supabase-mcp-server_execute_sql` with `EXPLAIN ANALYZE` if necessary.
