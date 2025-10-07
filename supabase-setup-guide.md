# Supabase Setup Guide for New Project

## Database Migrations (Run in Order)

Copy and paste each migration file content into Supabase SQL Editor and run them in this exact order:

### 1. Initial Schema (0001_initial_schema.sql)

- Creates users, goals, tasks, progress_entries, categories tables
- Sets up basic indexes and triggers

### 2. Features and Sample Data (0002_add_features_and_sample_data.sql)

- Adds recurring goals, notes, notifications tables
- Inserts sample categories
- Creates progress calculation function

### 3. Knowledge Base (0003_add_knowledge_base.sql)

- Creates FAQ and knowledge base tables
- Sets up article management system

### 4. App API Schema (0004_app_api_schema.sql)

- Creates goals and daily_logs tables with BIGSERIAL IDs
- Matches your Next.js API expectations

### 5. Supabase Policies (0005_supabase_schema_and_policies.sql)

- Sets up Row Level Security (RLS) policies
- Creates proper access controls

### 6. Advanced Features (0006_projects_memories_mistakes_habits.sql)

- Creates projects, memories, mistakes, habits tables
- Sets up storage bucket for memory images
- Implements comprehensive RLS policies

### 7. Chat System (0007_chat_conversations.sql)

- Creates chat conversations and messages tables
- Sets up chat-related RLS policies

### 8. Admin Settings (0008_admin_settings.sql)

- Creates admin settings table for AI configuration

## Storage Setup

### Memory Images Bucket

The migration will automatically create a 'memories' storage bucket, but verify:

1. Go to Storage in Supabase Dashboard
2. Ensure 'memories' bucket exists and is private
3. RLS policies should be automatically applied

## Authentication Setup

### Enable Auth Providers (if needed)

1. Go to Authentication > Settings in Supabase Dashboard
2. Configure any auth providers you want to use
3. Set up redirect URLs if using OAuth

## Environment Variables (Already Done)

Your .env.local is correctly configured with:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Code Status

✅ All your code is already properly configured
✅ API routes are using correct Supabase client
✅ Authentication system is ready
✅ No code changes needed

## Next Steps After Migration

1. Test your application locally
2. Create a test user account
3. Verify all features work with new database
4. Deploy to production when ready
