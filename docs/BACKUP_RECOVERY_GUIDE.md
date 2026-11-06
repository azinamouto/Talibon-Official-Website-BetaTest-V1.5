# Backup and Recovery Guide

## Overview

This guide provides comprehensive backup and recovery procedures for TAL.GOV to ensure data protection and business continuity.

## Backup Strategy

### Backup Philosophy

- **3-2-1 Rule**: 3 copies, 2 different media, 1 offsite
- **Automated**: Automated scheduled backups
- **Tested**: Regular restore testing
- **Documented**: Clear procedures for all scenarios
- **Secure**: Encrypted backups, access controls

### Backup Types

#### Full Backups

Complete backup of all data:

- **Frequency**: Weekly
- **Retention**: 12 months
- **Content**: Database, files, configuration

#### Incremental Backups

Backup of changes since last backup:

- **Frequency**: Daily
- **Retention**: 30 days
- **Content**: Database changes, new files

#### Differential Backups

Backup of changes since last full backup:

- **Frequency**: Daily
- **Retention**: 7 days
- **Content**: Database changes, file changes

## Database Backups

### PostgreSQL Backups

#### Automated Backups via Supabase

Supabase provides automated backups:

- **Daily backups**: Included in all plans
- **Point-in-time recovery**: Up to 7 days (Pro plan)
- **Physical backups**: Every 24 hours
- **WAL archiving**: Continuous

#### Manual Backup

```bash
# Backup entire database
supabase db dump -f backup-$(date +%Y%m%d).sql

# Backup specific schema
supabase db dump -f backup-users.sql --schema auth

# Backup with data only
supabase db dump -f backup-data.sql --data-only

# Compressed backup
supabase db dump -f backup.sql | gzip > backup-$(date +%Y%m%d).sql.gz
```

#### Restore from Backup

```bash
# Restore from SQL file
supabase db restore backup-20240101.sql

# Restore from compressed backup
gunzip < backup-20240101.sql.gz | supabase db restore

# Point-in-time recovery
supabase db restore --timestamp "2024-01-01 12:00:00"
```

### Backup Schedule

```yaml
schedule:
  daily:
    time: "02:00"
    type: incremental
    retention: 30 days

  weekly:
    day: sunday
    time: "03:00"
    type: full
    retention: 12 weeks

  monthly:
    day: 1
    time: "04:00"
    type: full
    retention: 12 months
```

## File Backups

### Supabase Storage Backups

Supabase Storage provides:

- **Automatic backups**: Included
- **Version history**: 30 days
- **Bucket replication**: Available

### Document Backups to R2/S3

```typescript
// Backup documents to R2
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const backupDocument = async (document: Document) => {
  const command = new PutObjectCommand({
    Bucket: 'talgov-backups',
    Key: `documents/${document.id}-${Date.now()}.pdf`,
    Body: document.file,
    Metadata: {
      originalId: document.id,
      backupDate: new Date().toISOString()
    }
  });

  await s3Client.send(command);
};
```

### Code Repository Backups

Git repository serves as backup for code:

- **GitHub**: Primary repository
- **Mirrors**: Optional mirror services
- **Local clones**: Developer machines

## Configuration Backups

### Environment Variables

```bash
# Backup environment variables
env > backup-env-$(date +%Y%m%d).txt

# Encrypt backup
gpg --encrypt --recipient admin@talibon.gov.ph backup-env-20240101.txt
```

### Configuration Files

```bash
# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  .env \
  vercel.json \
  supabase/config.toml \
  nginx.conf
```

## Backup Verification

### Integrity Checks

```bash
# Verify database backup
supabase db dump -f test-backup.sql
supabase db restore test-backup.sql
# Run health checks
supabase status
```

### Restore Testing

Monthly restore testing:

1. **Select random backup**
2. **Restore to test environment**
3. **Verify data integrity**
4. **Test application functionality**
5. **Document results**

### Backup Logs

Monitor backup operations:

```bash
# Check backup logs
supabase logs backup

# Custom backup logging
logger.info('Backup completed', {
  type: 'database',
  size: '1.2GB',
  duration: '300s',
  timestamp: new Date()
});
```

## Recovery Procedures

### Disaster Recovery Scenarios

#### Scenario 1: Database Corruption

**Detection**:
- Database errors
- Data inconsistencies
- Query failures

**Recovery Steps**:

1. **Identify corruption point**
   ```bash
   # Check database logs
   supabase logs --database
   ```

2. **Stop application**
   ```bash
   # Stop writes to prevent further corruption
   pm2 stop talgov-backend
   ```

3. **Restore from backup**
   ```bash
   # Find last good backup
   supabase db restore backup-20240101.sql
   ```

4. **Verify restore**
   ```bash
   # Run health checks
   supabase status
   # Test queries
   ```

5. **Restart application**
   ```bash
   pm2 restart talgov-backend
   ```

6. **Monitor for issues**
   ```bash
   # Monitor logs
   pm2 logs talgov-backend
   ```

#### Scenario 2: Accidental Data Deletion

**Detection**:
- User reports missing data
- Audit log shows deletion
- Application errors

**Recovery Steps**:

1. **Identify deletion time**
   ```sql
   -- Check audit logs
   SELECT * FROM audit_logs
   WHERE action = 'DELETE'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. **Point-in-time recovery**
   ```bash
   # Restore to before deletion
   supabase db restore --timestamp "2024-01-01 11:59:00"
   ```

3. **Export deleted data**
   ```bash
   # Export the deleted records
   supabase db dump --table deleted_records
   ```

4. **Restore to current time**
   ```bash
   # Restore to current state
   supabase db restore --timestamp "2024-01-01 12:00:00"
   ```

5. **Re-insert deleted data**
   ```sql
   -- Insert the deleted records
   INSERT INTO table (...)
   VALUES (...);
   ```

#### Scenario 3: Ransomware Attack

**Detection**:
- Files encrypted
- Ransom note
- Application inaccessible

**Recovery Steps**:

1. **Isolate affected systems**
   ```bash
   # Disconnect from network
   # Stop all services
   ```

2. **Assess damage**
   ```bash
   # Check which systems affected
   # Determine data extent
   ```

3. **Contact security team**
   - Report incident
   - Follow security procedures

4. **Restore from clean backup**
   ```bash
   # Use backup before attack
   supabase db restore backup-before-attack.sql
   ```

5. **Scan for malware**
   ```bash
   # Security scan
   # Verify clean state
   ```

6. **Change credentials**
   ```bash
   # Rotate all passwords
   # Update API keys
   ```

7. **Monitor for recurrence**
   ```bash
   # Enhanced monitoring
   # Security alerts
   ```

#### Scenario 4: Server Failure

**Detection**:
- Server unresponsive
- Application down
- Alerts triggered

**Recovery Steps**:

1. **Assess failure**
   ```bash
   # Check server status
   # Identify failure type
   ```

2. **Provision new server**
   ```bash
   # Spin up new instance
   # Configure environment
   ```

3. **Restore from backup**
   ```bash
   # Restore database
   supabase db restore latest-backup.sql
   # Restore files
   # Restore configuration
   ```

4. **Update DNS**
   ```bash
   # Point to new server
   # Wait for propagation
   ```

5. **Verify functionality**
   ```bash
   # Test application
   # Run health checks
   ```

6. **Monitor performance**
   ```bash
   # Monitor metrics
   # Check logs
   ```

## Backup Storage

### Storage Locations

#### Primary Storage

- **Supabase**: Database backups
- **GitHub**: Code repository
- **Vercel**: Application builds

#### Secondary Storage

- **R2/S3**: Document backups
- **Local**: On-site backups
- **External drives**: Physical backups

#### Offsite Storage

- **Cloud storage**: Different region
- **Tape backups**: Long-term archival
- **Multiple cloud providers**: Redundancy

### Backup Encryption

```bash
# Encrypt backups with GPG
gpg --encrypt --recipient admin@talibon.gov.ph backup.sql

# Decrypt backups
gpg --decrypt backup.sql.gpg > backup.sql

# Encrypt with symmetric key
gpg --symmetric --cipher-algo AES256 backup.sql
```

## Retention Policy

### Database Backups

- **Daily**: 30 days
- **Weekly**: 12 weeks
- **Monthly**: 12 months
- **Yearly**: 7 years

### File Backups

- **Daily**: 30 days
- **Weekly**: 12 weeks
- **Monthly**: 12 months

### Code Backups

- **All commits**: Indefinite (Git)
- **Tags**: Indefinite

### Configuration Backups

- **Daily**: 30 days
- **Weekly**: 12 weeks
- **Monthly**: 12 months

## Backup Monitoring

### Automated Monitoring

```typescript
// Monitor backup status
const checkBackupStatus = async () => {
  const lastBackup = await getLastBackup();

  if (!lastBackup) {
    alert('No recent backup found');
    return;
  }

  const age = Date.now() - lastBackup.timestamp;
  if (age > 36 * 60 * 60 * 1000) { // 36 hours
    alert('Backup is older than 36 hours');
  }

  if (lastBackup.status !== 'success') {
    alert('Last backup failed');
  }
};
```

### Backup Alerts

Configure alerts for:

- Backup failures
- Backup too old
- Backup size unusual
- Restore failures

## Disaster Recovery Plan

### Recovery Time Objectives (RTO)

| System | RTO | Priority |
|--------|-----|----------|
| Database | 4 hours | Critical |
| Application | 2 hours | Critical |
| Files | 8 hours | High |
| Configuration | 2 hours | Critical |

### Recovery Point Objectives (RPO)

| System | RPO | Priority |
|--------|-----|----------|
| Database | 1 hour | Critical |
| Application | 24 hours | High |
| Files | 24 hours | High |
| Configuration | 1 hour | Critical |

### Emergency Contacts

- **Platform Lead**: [Name] - [Phone]
- **Database Admin**: [Name] - [Phone]
- **Security Officer**: [Name] - [Phone]
- **Vendor Support**: [Contact]

## Backup Checklist

### Daily

- [ ] Automated backups completed
- [ ] Backup logs reviewed
- [ ] Backup status verified
- [ ] Alerts checked

### Weekly

- [ ] Backup integrity verified
- [ ] Backup size reviewed
- [ ] Storage capacity checked
- [ ] Retention policy applied

### Monthly

- [ ] Restore test performed
- [ ] Backup procedure reviewed
- [ ] Recovery plan updated
- [ ] Team trained on procedures

### Quarterly

- [ ] Full backup audit
- [ ] Disaster recovery drill
- [ ] Backup strategy reviewed
- [ ] Vendor SLA reviewed

## Best Practices

### Do's

- Automate backups
- Test restores regularly
- Encrypt sensitive backups
- Keep multiple copies
- Document procedures
- Monitor backup status
- Plan for disasters

### Don'ts

- Skip backups
- Ignore backup failures
- Store backups insecurely
- Forget to test restores
- Keep only one copy
- Skip documentation
- Assume backups work

## References

- [Supabase Backup](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL Backup](https://www.postgresql.org/docs/current/backup.html)
- [Disaster Recovery Planning](https://www.nist.gov/publications/disaster-recovery-guide)
- [Maintenance Guide](MAINTENANCE_GUIDE.md)
