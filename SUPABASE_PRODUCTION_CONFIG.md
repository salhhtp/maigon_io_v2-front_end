# Supabase Production Configuration

## 🏗️ **Database Configuration**

### **Row Level Security (RLS) Review**

#### **Current Tables Requiring RLS:**
- `user_profiles`
- `contracts` 
- `contract_reviews`
- `user_activities`
- `user_usage_stats`

#### **RLS Policy Verification:**
```sql
-- Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

#### **Recommended RLS Policies:**
```sql
-- User profiles - users can only access their own data
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Contracts - users can only access their own contracts
CREATE POLICY "Users can view own contracts" ON contracts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts" ON contracts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin access for all tables
CREATE POLICY "Admins full access" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### **Database Performance Optimization**

#### **Index Analysis:**
```sql
-- Check for missing indexes on frequently queried columns
EXPLAIN ANALYZE SELECT * FROM contracts WHERE user_id = 'uuid';
EXPLAIN ANALYZE SELECT * FROM contract_reviews WHERE contract_id = 'uuid';
EXPLAIN ANALYZE SELECT * FROM user_activities WHERE user_id = 'uuid' ORDER BY created_at DESC;

-- Create recommended indexes
CREATE INDEX CONCURRENTLY idx_contracts_user_id ON contracts(user_id);
CREATE INDEX CONCURRENTLY idx_contracts_created_at ON contracts(created_at);
CREATE INDEX CONCURRENTLY idx_contract_reviews_contract_id ON contract_reviews(contract_id);
CREATE INDEX CONCURRENTLY idx_contract_reviews_user_id ON contract_reviews(user_id);
CREATE INDEX CONCURRENTLY idx_user_activities_user_id_created_at ON user_activities(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_user_usage_stats_user_id ON user_usage_stats(user_id);
```

#### **Query Optimization:**
```sql
-- Optimize user dashboard queries
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.company,
  COUNT(c.id) as total_contracts,
  COUNT(cr.id) as total_reviews,
  nus.contracts_reviewed,
  nus.total_pages_reviewed
FROM user_profiles up
LEFT JOIN contracts c ON c.user_id = up.id
LEFT JOIN contract_reviews cr ON cr.user_id = up.id
LEFT JOIN user_usage_stats nus ON nus.user_id = up.id
GROUP BY up.id, up.full_name, up.email, up.company, nus.contracts_reviewed, nus.total_pages_reviewed;
```

## 🔐 **Authentication Configuration**

### **Email Authentication Settings**
```sql
-- Configure email settings in Supabase Dashboard
-- Auth > Settings > Email Auth

-- Required settings for production:
-- ✅ Confirm email: ON
-- ✅ Email change confirmation: ON  
-- ✅ Secure password requirements: ON
-- ✅ Min password length: 8 characters
```

### **Redirect URLs Configuration**
```
Site URL: https://yourdomain.com
Redirect URLs:
- https://yourdomain.com/auth/callback
- https://yourdomain.com/email-verification
- https://yourdomain.com/reset-password
- https://yourdomain.com (for general auth redirects)
```

### **Session Configuration**
```sql
-- Optimize session settings
-- Auth > Settings > Sessions

-- Recommended settings:
-- Session timeout: 24 hours
-- Refresh token lifetime: 30 days
-- Enable automatic refresh: ON
```

## 🚀 **API Configuration**

### **Rate Limiting Setup**
```sql
-- Enable rate limiting in Supabase Dashboard
-- API > Settings > Rate Limiting

-- Recommended limits:
-- Anonymous requests: 100/hour
-- Authenticated requests: 1000/hour
-- File uploads: 10/minute
-- Auth requests: 50/hour
```

### **CORS Configuration**
```json
{
  "allowedOrigins": ["https://yourdomain.com"],
  "allowedHeaders": ["authorization", "x-client-info", "apikey", "content-type"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "maxAge": 86400
}
```

## 📊 **Connection Pooling**

### **PgBouncer Configuration**
```ini
# Recommended PgBouncer settings for production
[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5
max_db_connections = 95
```

### **Connection Pool Monitoring**
```sql
-- Monitor connection usage
SELECT 
  datname,
  numbackends,
  xact_commit,
  xact_rollback,
  blks_read,
  blks_hit,
  temp_files,
  temp_bytes
FROM pg_stat_database 
WHERE datname = current_database();

-- Check for connection pool health
SELECT 
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY state;
```

## 🔄 **Backup Configuration**

### **Automated Backups**
```sql
-- Verify backup settings in Supabase Dashboard
-- Database > Backups

-- Recommended settings:
-- ✅ Daily automated backups: ON
-- ✅ Backup retention: 30 days
-- ✅ Point-in-time recovery: ON (if available)
```

### **Manual Backup Script**
```bash
#!/bin/bash
# backup-database.sh

SUPABASE_DB_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump $SUPABASE_DB_URL > "${BACKUP_DIR}/maigon_backup_${DATE}.sql"

# Compress backup
gzip "${BACKUP_DIR}/maigon_backup_${DATE}.sql"

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "maigon_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: maigon_backup_${DATE}.sql.gz"
```

## 📈 **Monitoring & Alerts**

### **Database Monitoring**
```sql
-- Key metrics to monitor
SELECT 
  'Active Connections' as metric,
  COUNT(*) as value
FROM pg_stat_activity 
WHERE state = 'active'

UNION ALL

SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value

UNION ALL

SELECT 
  'Total Queries Today' as metric,
  (xact_commit + xact_rollback)::text as value
FROM pg_stat_database 
WHERE datname = current_database();
```

### **Alert Thresholds**
- **Connection Usage**: > 80% of max connections
- **Database Size**: > 80% of plan limit
- **Query Performance**: Average query time > 1s
- **Error Rate**: > 5% failed queries

## 🛡️ **Security Hardening**

### **SSL Configuration**
```sql
-- Verify SSL is enforced
SHOW ssl;

-- Check connection security
SELECT 
  usename,
  application_name,
  client_addr,
  state,
  ssl,
  ssl_version
FROM pg_stat_ssl 
JOIN pg_stat_activity USING (pid);
```

### **User Permissions Audit**
```sql
-- Review user permissions
SELECT 
  r.rolname as username,
  r.rolsuper as is_superuser,
  r.rolcreaterole as can_create_roles,
  r.rolcreatedb as can_create_databases,
  r.rolcanlogin as can_login
FROM pg_roles r
WHERE r.rolname NOT LIKE 'pg_%'
ORDER BY r.rolname;

-- Review table permissions
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasinserts,
  hasselects,
  hasupdates,
  hasdeletes
FROM pg_tables 
WHERE schemaname = 'public';
```

## 🔧 **Production Deployment Checklist**

### **Pre-Deployment:**
- [ ] All RLS policies reviewed and tested
- [ ] Database indexes optimized
- [ ] Connection pooling configured
- [ ] Backup system verified
- [ ] Monitoring alerts configured
- [ ] SSL/TLS enforced
- [ ] Rate limiting enabled
- [ ] CORS policies set

### **Post-Deployment:**
- [ ] Monitor connection usage
- [ ] Verify backup creation
- [ ] Test RLS policies with production data
- [ ] Monitor query performance
- [ ] Verify email delivery
- [ ] Test Edge Functions
- [ ] Monitor error rates

### **Performance Validation:**
```sql
-- Test critical queries performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM user_profiles WHERE id = 'test-user-id';

EXPLAIN (ANALYZE, BUFFERS)
SELECT c.*, cr.review_type, cr.created_at as review_date
FROM contracts c
LEFT JOIN contract_reviews cr ON cr.contract_id = c.id
WHERE c.user_id = 'test-user-id'
ORDER BY c.created_at DESC
LIMIT 10;

-- Verify indexes are being used
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 📋 **Maintenance Schedule**

### **Daily:**
- Monitor connection usage
- Check error logs
- Verify backup completion

### **Weekly:**
- Review query performance
- Analyze slow queries
- Check index usage
- Monitor database growth

### **Monthly:**
- Review and optimize RLS policies
- Analyze user access patterns
- Update connection pool settings
- Performance tuning review

---

**🎯 Critical Actions:**
1. Review and test all RLS policies
2. Optimize database indexes
3. Configure automated backups
4. Set up monitoring alerts
5. Test production performance
