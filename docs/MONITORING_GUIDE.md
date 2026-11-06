# Monitoring Guide

## Overview

This guide covers monitoring strategies and tools for TAL.GOV, ensuring system health, performance, and reliability.

## Monitoring Objectives

- **Availability**: Ensure platform is always accessible
- **Performance**: Maintain fast response times
- **Security**: Detect and prevent security incidents
- **User Experience**: Monitor user satisfaction
- **Capacity**: Plan for growth and scale

## Monitoring Levels

### Infrastructure Monitoring

Monitor the underlying infrastructure:

- Server health
- CPU usage
- Memory usage
- Disk space
- Network connectivity
- Database performance

### Application Monitoring

Monitor the application itself:

- Response times
- Error rates
- Throughput
- API performance
- Transaction health

### Business Monitoring

Monitor business metrics:

- User activity
- Service usage
- Content performance
- Conversion rates
- User satisfaction

## Monitoring Tools

### Infrastructure Monitoring

#### Uptime Monitoring

**Tool**: UptimeRobot, Pingdom

**Configuration**:
```yaml
endpoints:
  - url: https://talibon.gov.ph
    interval: 1 minute
    alert: 5 consecutive failures
  - url: https://api.talibon.gov.ph/health
    interval: 1 minute
    alert: 3 consecutive failures
```

**Alerts**:
- Email to IT team
- SMS for critical issues
- Slack integration

#### Server Monitoring

**Tool**: Datadog, New Relic, or custom solutions

**Metrics to Monitor**:
```yaml
cpu:
  warning: 70%
  critical: 90%

memory:
  warning: 80%
  critical: 95%

disk:
  warning: 70%
  critical: 85%

network:
  warning: 80% bandwidth
  critical: 95% bandwidth
```

### Application Monitoring

#### Application Performance Monitoring (APM)

**Tool**: Sentry, New Relic, Datadog

**Setup**:
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  }
});
```

**Key Metrics**:
- Response time (p50, p95, p99)
- Error rate
- Throughput (requests per second)
- Apdex score (user satisfaction)

#### Custom Metrics

```typescript
// Track custom business metrics
export const trackServiceView = (serviceId: string) => {
  metrics.increment('service.view', { serviceId });
};

export const trackServiceSearch = (query: string, results: number) => {
  metrics.increment('service.search', {
    queryLength: query.length,
    resultCount: results
  });
};

export const trackAPICall = (endpoint: string, duration: number) => {
  metrics.timing('api.duration', duration, { endpoint });
};
```

### Database Monitoring

#### Database Performance

**Tool**: Supabase Dashboard, pg_stat_statements

**Key Metrics**:
```sql
-- Connection pool usage
SELECT
  state,
  count(*)
FROM pg_stat_activity
GROUP BY state;

-- Slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

#### Database Health Checks

```typescript
export const checkDatabaseHealth = async () => {
  try {
    // Test connection
    await this.dataSource.query('SELECT 1');

    // Check connection pool
    const poolStatus = await this.checkConnectionPool();

    // Check query performance
    const queryPerformance = await this.checkQueryPerformance();

    return {
      status: 'healthy',
      pool: poolStatus,
      performance: queryPerformance
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};
```

### User Experience Monitoring

#### Real User Monitoring (RUM)

**Tool**: Google Analytics, Custom RUM

**Metrics**:
- Page load time
- Time to interactive
- Core Web Vitals
- User paths
- Conversion rates

#### User Feedback

```typescript
// Implement feedback collection
export const collectFeedback = async (feedback: {
  page: string;
  rating: number;
  comment?: string;
}) => {
  await this.feedbackRepository.save(feedback);
  metrics.increment('feedback.submitted', {
    rating: feedback.rating,
    page: feedback.page
  });
};
```

## Alerting

### Alert Strategy

### Alert Levels

| Level | Response Time | Example |
|-------|---------------|---------|
| Critical | 15 minutes | System down, data breach |
| High | 1 hour | API errors, slow performance |
| Medium | 4 hours | High error rate, resource warning |
| Low | 24 hours | Minor issues, warnings |

### Alert Rules

```yaml
alerts:
  - name: High Error Rate
    condition: error_rate > 1%
    duration: 5 minutes
    level: High
    channels: [email, slack]

  - name: Slow Response Time
    condition: p95_response_time > 2s
    duration: 10 minutes
    level: Medium
    channels: [email]

  - name: Database Connection Pool Exhausted
    condition: db_pool_usage > 90%
    duration: 1 minute
    level: Critical
    channels: [email, sms, slack]

  - name: Disk Space Low
    condition: disk_usage > 80%
    duration: 5 minutes
    level: Medium
    channels: [email]

  - name: Unauthorized Access Attempt
    condition: auth_failure_rate > 10%
    duration: 1 minute
    level: Critical
    channels: [email, sms, slack]
```

### Alert Channels

#### Email

```typescript
// Configure email alerts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendAlert = async (alert: Alert) => {
  await transporter.sendMail({
    from: 'monitoring@talibon.gov.ph',
    to: 'it-team@talibon.gov.ph',
    subject: `[${alert.level}] ${alert.name}`,
    text: alert.message
  });
};
```

#### Slack

```typescript
// Configure Slack alerts
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_TOKEN);

export const sendSlackAlert = async (alert: Alert) => {
  await slack.chat.postMessage({
    channel: '#monitoring',
    text: `:alert: *${alert.level}* ${alert.name}\n${alert.message}`
  });
};
```

#### SMS

```typescript
// Configure SMS alerts for critical issues
export const sendSMSAlert = async (alert: Alert) => {
  if (alert.level === 'Critical') {
    await smsService.send({
      to: process.env.ON_CALL_PHONE,
      message: `[CRITICAL] ${alert.name}: ${alert.message}`
    });
  }
};
```

## Dashboards

### Infrastructure Dashboard

Key metrics:
- Server uptime
- CPU/Memory/Disk usage
- Network status
- Database health

### Application Dashboard

Key metrics:
- Response times
- Error rates
- Throughput
- API performance

### Business Dashboard

Key metrics:
- Active users
- Service views
- Content performance
- User satisfaction

### Dashboard Tools

- Grafana
- Datadog Dashboards
- Supabase Dashboard
- Custom dashboards

## Logging

### Log Levels

```typescript
enum LogLevel {
  ERROR = 'error',    // Critical errors
  WARN = 'warn',      // Warning conditions
  INFO = 'info',      // Informational messages
  DEBUG = 'debug',    // Debug information
  TRACE = 'trace'     // Detailed tracing
}
```

### Structured Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage
logger.info('User login', {
  userId: user.id,
  ip: req.ip,
  timestamp: new Date()
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack
});
```

### Log Retention

- Error logs: 90 days
- Application logs: 30 days
- Access logs: 7 days
- Audit logs: 1 year

## Performance Monitoring

### Key Performance Indicators (KPIs)

### Frontend KPIs

- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1
- Time to Interactive (TTI) < 3.8s

### Backend KPIs

- API response time (p95) < 500ms
- Error rate < 0.1%
- Throughput > 100 req/s
- Database query time (p95) < 100ms

### Business KPIs

- Page load success rate > 99%
- User satisfaction > 4.5/5
- Service information accuracy > 95%

## Incident Response

### Incident Detection

1. **Automated Alerts**: Monitoring tools detect issues
2. **User Reports**: Citizens report problems
3. **Health Checks**: Regular health check failures

### Incident Triage

```typescript
export const triageIncident = (incident: Incident) => {
  // Assess severity
  incident.severity = assessSeverity(incident);

  // Assign to team
  incident.team = assignTeam(incident);

  // Set response time SLA
  incident.sla = getSLA(incident.severity);

  // Notify stakeholders
  notifyStakeholders(incident);
};
```

### Incident Documentation

```markdown
## Incident Report

**ID**: INC-2024-001
**Date**: 2024-01-01
**Severity**: Critical
**Duration**: 2 hours

### Summary
Brief description of incident

### Impact
- Affected users: 5000
- Downtime: 2 hours
- Data loss: None

### Timeline
- 10:00: Alert received
- 10:15: Investigation started
- 11:00: Fix implemented
- 12:00: Service restored

### Root Cause
Technical root cause analysis

### Resolution
Steps taken to resolve

### Prevention
Preventive measures
```

## Monitoring Best Practices

### Do's

- Monitor everything critical
- Set appropriate alert thresholds
- Use structured logging
- Create meaningful dashboards
- Review alerts regularly
- Document incidents
- Learn from failures

### Don'ts

- Over-alert (alert fatigue)
- Ignore false positives
- Monitor without action
- Forget to test alerts
- Skip documentation
- Ignore trends
- Set and forget

## Monitoring Checklist

### Setup

- [ ] Infrastructure monitoring configured
- [ ] Application monitoring configured
- [ ] Database monitoring configured
- [ ] Alert rules defined
- [ ] Alert channels configured
- [ ] Dashboards created
- [ ] Logging configured
- [ ] Retention policies set

### Regular Review

- [ ] Monthly: Review alert rules
- [ ] Monthly: Review dashboards
- [ ] Quarterly: Review monitoring strategy
- [ ] Annually: Full monitoring audit

## References

- [Sentry Documentation](https://docs.sentry.io/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Observability Best Practices](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Maintenance Guide](MAINTENANCE_GUIDE.md)
