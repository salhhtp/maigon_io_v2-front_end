# Database Migration Instructions

## Deploy Custom Solutions Table

To enable the AI custom solutions functionality, you need to run the database migration. Here are the instructions:

### Option 1: Via Supabase CLI (Recommended)
```bash
# Navigate to your project directory
cd your-project-directory

# Apply the migration
supabase db reset --db-url postgresql://[your-connection-string]

# Or apply just this migration
psql -d your_database_url -f supabase/migrations/20250107_create_custom_solutions.sql
```

### Option 2: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250107_create_custom_solutions.sql`
4. Run the SQL script

### Option 3: Using the MCP Integration
If you have the Supabase MCP connected:
```bash
# Use the apply_migration function
mcp_supabase_apply_migration("create_custom_solutions", [SQL_CONTENT])
```

## What This Migration Does

1. **Creates `custom_solutions` table** - Stores admin-created AI analysis solutions
2. **Sets up RLS policies** - Ensures users can only see their own solutions + public ones  
3. **Adds foreign key columns** - Links contracts and reviews to custom solutions
4. **Creates indexes** - Optimizes query performance
5. **Inserts default solutions** - Provides 3 pre-built solutions:
   - GDPR Compliance Review
   - Financial Risk Assessment  
   - Employment Contract Review

## Verification

After running the migration, verify it worked:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'custom_solutions';

-- Check if default solutions were created
SELECT name, contract_type, is_public 
FROM custom_solutions 
WHERE is_public = true;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'custom_solutions';
```

## Expected Result

You should see:
- ✅ `custom_solutions` table created
- ✅ 3 default public solutions inserted
- ✅ RLS policies active
- ✅ Foreign key columns added to existing tables

## Next Steps

Once the migration is applied:
1. The CustomSolutionModal will save real data to the database
2. Users can create and manage custom AI solutions
3. The AI service will use custom solutions during analysis
4. Admin users can create public solutions for all users

## Troubleshooting

If you encounter errors:
- Ensure you have admin privileges on the database
- Check that the Supabase project has the latest schema
- Verify all dependent tables (`auth.users`, `user_profiles`, etc.) exist
- Review any constraint violations in the error message
