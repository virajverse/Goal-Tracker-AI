# Quick Supabase Setup - Problem Fixed

## Step 1: Clean Start (Recommended)

Supabase SQL Editor में यह run करें:

```sql
-- Clean slate - remove any existing tables
DROP TABLE IF EXISTS daily_logs CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS progress_entries CASCADE;
DROP TABLE IF EXISTS goal_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS faq_categories CASCADE;
DROP TABLE IF EXISTS faq_articles CASCADE;
DROP TABLE IF EXISTS article_tags CASCADE;
DROP TABLE IF EXISTS article_tag_relations CASCADE;
DROP TABLE IF EXISTS article_feedback CASCADE;
DROP TABLE IF EXISTS kb_categories CASCADE;
DROP TABLE IF EXISTS kb_articles CASCADE;
DROP TABLE IF EXISTS article_revisions CASCADE;
```

## Step 2: Run Fixed Migration

अब `migrations/0004_app_api_schema_fixed.sql` की content को copy करके SQL Editor में run करें।

## Step 3: Continue with Other Migrations

इसके बाद बाकी migrations run करें:

- 0005_supabase_schema_and_policies.sql
- 0006_projects_memories_mistakes_habits.sql
- 0007_chat_conversations.sql
- 0008_admin_settings.sql

## Why This Approach?

- Migration 0001-0003 में UUID-based goals table बनती है
- Migration 0004 में BIGSERIAL-based goals table चाहिए
- यह conflict create करता है
- Fixed version automatically handle करता है यह conflict

## Test After Setup

```bash
npm run dev
```

फिर test करें कि सब कुछ काम कर रहा है।
