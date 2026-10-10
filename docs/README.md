# TAL.GOV Documentation

Welcome to the TAL.GOV documentation hub. This directory contains comprehensive documentation for developing, maintaining, and optimizing the TAL.GOV digital platform.

## Documentation Index

- [Sprint 5 Advanced Frontend and Sprint 6 QA](./SPRINT5_ADVANCED_FRONTEND.md) — live maps, prepared-answer chatbot, graceful fallbacks, coverage scope and CI verification.

- [Sprint 5 Search](./SPRINT5_SEARCH.md) — query/filter/result contract, mock server, search page, verification and pending BE/FE agreement.

- [Sprint 4 Admin Dashboard](./SPRINT4_ADMIN_DASHBOARD.md) — permission contract, mock layout, user management, CMS editors, reports, and validation.

- [Sprint 3 E-Services Frontend](./SPRINT3_FRONTEND.md) — shared wizard, five form integrations, submission tracking, payment dependency handoff, and verification.

- [Sprint 2 Public Frontend](./SPRINT2_PUBLIC_FRONTEND.md) — services, news, public API integration, search, and verification.

- [API Contract Handoff](./API_CONTRACT_HANDOFF.md) — OpenAPI, example mock server, About routes, and BE/FE sign-off workflow.

- [Sprint 1 Frontend Foundation](./FRONTEND_FOUNDATION.md) — routing, contexts, UI controls, auth and tests.
- [Supabase Environments](./SUPABASE_ENVIRONMENTS.md) — S1-INT-01 provisioning plan, public/private variable contract and pending FE/BE sign-off.

### Core Documentation

#### [AI Skills Development Guide](./AI_SKILLS_DEVELOPMENT_GUIDE.md)
**Purpose**: Comprehensive guide for understanding, using, and developing AI skills for the TAL.GOV project.

**Contents**:
- What are AI skills and how they work
- Available skills overview
- Skill structure and patterns
- Using AI skills effectively
- Developing new skills
- Skill maintenance and optimization
- Token optimization strategies for skills
- Skill governance and best practices

**Target Audience**: All developers, skill maintainers, technical leads

**When to Read**:
- Before starting development with AI assistance
- When creating or modifying skills
- When optimizing development workflows
- When onboarding new developers

---

#### [System Overview](./SYSTEM_OVERVIEW.md)
**Purpose**: High-level architectural and technical overview of the TAL.GOV platform.

**Contents**:
- Executive summary and system goals
- System architecture diagrams
- Technology stack details
- System components breakdown
- Security architecture
- Data flow diagrams
- Deployment architecture
- Monitoring and observability
- Scalability considerations
- Disaster recovery procedures
- Future roadmap

**Target Audience**: All developers, architects, system administrators, stakeholders

**When to Read**:
- Before starting development
- When understanding system architecture
- When planning new features
- When troubleshooting system issues
- When planning deployments

---

#### [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md)
**Purpose**: Strategies for optimizing token usage and cost efficiency when using AI assistance.

**Contents**:
- Understanding token usage and costs
- Context management strategies
- Skill optimization techniques
- Code reading strategies
- Prompt engineering best practices
- Task decomposition methods
- Code generation optimization
- Skill-specific optimization
- Common token wastes and solutions
- Cost optimization checklist
- Advanced optimization techniques
- Cost-benefit analysis
- Monitoring and reporting

**Target Audience**: All developers using AI assistance, technical leads

**When to Read**:
- Before starting AI-assisted development
- When token costs are high
- When optimizing development workflows
- When measuring AI ROI
- Regularly for continuous improvement

---

## Project Documentation

### Root Level Documentation

- **[README.md](../README.md)** - Main project README with setup instructions, project goals, and contribution guidelines
- **[DEVELOPMENT_ROADMAP.md](../DEVELOPMENT_ROADMAP.md)** - Development phases, tasks, and timeline
- **[TECHNICAL_GUIDE.txt](../TECHNICAL_GUIDE.txt)** - Technical implementation details
- **[IMPROVEMENTS.md](../IMPROVEMENTS.md)** - Suggested improvements and enhancements

### AI Skills Reference

The following AI skills are available in `.devin/skills/`:

1. **[API Integration Skill](../.devin/skills/api-integration/SKILL.md)** - Backend API development and frontend API consumption
2. **[Backend Development Skill](../.devin/skills/backend-development/SKILL.md)** - NestJS, TypeScript, and Supabase backend development
3. **[Database Operations Skill](../.devin/skills/database-operations/SKILL.md)** - Supabase and PostgreSQL database operations
4. **[Deployment & DevOps Skill](../.devin/skills/deployment-devops/SKILL.md)** - Deployment pipelines, CI/CD, and infrastructure
5. **[Frontend Development Skill](../.devin/skills/frontend-development/SKILL.md)** - React, TypeScript, and Vite frontend development
6. **[Testing & QA Skill](../.devin/skills/testing-qa/SKILL.md)** - Testing and quality assurance across the stack

### Backend Documentation

- **[SPRINT2_API.md](../backend/SPRINT2_API.md)** - Backend API contracts for Sprint 2
- **[admin-api.md](../backend/docs/admin-api.md)** - Admin reports and user management API
- **[admin-rbac.md](../backend/docs/admin-rbac.md)** - Role and permission matrix

### Database Documentation

- **[Supabase README](../supabase/README.md)** - Supabase configuration and setup
- **[DATABASE/](../DATABASE/)** - Database schemas, migrations, and SQL files

## Documentation by Role

### For New Developers

1. Start with [README.md](../README.md) for project overview
2. Read [System Overview](./SYSTEM_OVERVIEW.md) for architecture understanding
3. Review [AI Skills Development Guide](./AI_SKILLS_DEVELOPMENT_GUIDE.md) for AI assistance
4. Explore relevant skills in `.devin/skills/`
5. Follow setup instructions in README.md

### For Frontend Developers

1. [System Overview](./SYSTEM_OVERVIEW.md) - Frontend stack and architecture
2. [Frontend Development Skill](../.devin/skills/frontend-development/SKILL.md) - Frontend patterns
3. [API Integration Skill](../.devin/skills/api-integration/SKILL.md) - Frontend API integration
4. [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md) - Optimization strategies

### For Backend Developers

1. [System Overview](./SYSTEM_OVERVIEW.md) - Backend stack and architecture
2. [Backend Development Skill](../.devin/skills/backend-development/SKILL.md) - Backend patterns
3. [API Integration Skill](../.devin/skills/api-integration/SKILL.md) - API development
4. [Database Operations Skill](../.devin/skills/database-operations/SKILL.md) - Database patterns
5. [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md) - Optimization strategies

### For DevOps Engineers

1. [System Overview](./SYSTEM_OVERVIEW.md) - Deployment architecture
2. [Deployment & DevOps Skill](../.devin/skills/deployment-devops/SKILL.md) - DevOps patterns
3. [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md) - Cost optimization

### For QA Engineers

1. [System Overview](./SYSTEM_OVERVIEW.md) - System architecture
2. [Testing & QA Skill](../.devin/skills/testing-qa/SKILL.md) - Testing patterns
3. [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md) - Optimization strategies

### For Technical Leads

1. [System Overview](./SYSTEM_OVERVIEW.md) - Complete system understanding
2. [AI Skills Development Guide](./AI_SKILLS_DEVELOPMENT_GUIDE.md) - Skill governance
3. [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md) - Cost management
4. [DEVELOPMENT_ROADMAP.md](../DEVELOPMENT_ROADMAP.md) - Development planning

## Documentation by Task

### Setting Up Development Environment
1. [README.md](../README.md) - Setup instructions
2. [System Overview](./SYSTEM_OVERVIEW.md) - Architecture understanding
3. [Supabase README](../supabase/README.md) - Database setup

### Creating New Features
1. [AI Skills Development Guide](./AI_SKILLS_DEVELOPMENT_GUIDE.md) - Using skills
2. Relevant skill in `.devin/skills/`
3. [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md) - Optimization

### API Development
1. [API Integration Skill](../.devin/skills/api-integration/SKILL.md)
2. [Backend Development Skill](../.devin/skills/backend-development/SKILL.md)
3. [SPRINT2_API.md](../backend/SPRINT2_API.md) - API contracts

### Database Changes
1. [Database Operations Skill](../.devin/skills/database-operations/SKILL.md)
2. [Supabase README](../supabase/README.md)
3. [DATABASE/](../DATABASE/) - Schema files

### Frontend Development
1. [Frontend Development Skill](../.devin/skills/frontend-development/SKILL.md)
2. [API Integration Skill](../.devin/skills/api-integration/SKILL.md) - API integration

### Testing
1. [Testing & QA Skill](../.devin/skills/testing-qa/SKILL.md)
2. [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md) - Optimization

### Deployment
1. [Deployment & DevOps Skill](../.devin/skills/deployment-devops/SKILL.md)
2. [System Overview](./SYSTEM_OVERVIEW.md) - Deployment architecture

### Optimizing AI Usage
1. [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md)
2. [AI Skills Development Guide](./AI_SKILLS_DEVELOPMENT_GUIDE.md)

## Documentation Standards

### Writing Documentation

When contributing documentation:
- Use clear, concise language
- Include code examples where applicable
- Provide context and rationale
- Use markdown formatting consistently
- Include diagrams for complex concepts
- Update related documentation when making changes
- Add dates for time-sensitive information

### Documentation Review

Before submitting documentation:
- Check for clarity and completeness
- Verify accuracy of technical information
- Ensure consistency with existing documentation
- Test any code examples
- Update table of contents if needed
- Review against documentation standards

## Contributing to Documentation

### Adding New Documentation

1. Create new file in `docs/` directory
2. Use descriptive filename in uppercase with underscores
3. Include title, purpose, and contents sections
4. Add reference to this README.md
5. Update relevant skill or project documentation

### Updating Existing Documentation

1. Make clear, concise changes
2. Update modification date if applicable
3. Review impact on related documentation
4. Update cross-references if needed
5. Communicate significant changes to team

## Documentation Maintenance

### Regular Review Schedule

- **Weekly**: Check for outdated information
- **Monthly**: Review and update skills
- **Quarterly**: Comprehensive documentation audit
- **Annually**: Complete documentation overhaul

### Documentation Health Metrics

Track:
- Documentation completeness
- Documentation accuracy
- Documentation usage
- Outdated content percentage
- Developer satisfaction with documentation

## Getting Help

If you have questions about documentation:
1. Check the relevant documentation section
2. Search existing issues in the repository
3. Consult with technical lead
4. Create an issue for documentation gaps
5. Propose improvements via pull request

## Documentation Changelog

### 2026-10-07
- Created [AI Skills Development Guide](./AI_SKILLS_DEVELOPMENT_GUIDE.md)
- Created [System Overview](./SYSTEM_OVERVIEW.md)
- Created [Cost & Token Optimization Guide](./COST_TOKEN_OPTIMIZATION.md)
- Created documentation index (this file)

## Future Documentation Plans

- [ ] API Documentation (Swagger/OpenAPI integration)
- [ ] Component Library Documentation
- [ ] Database Schema Documentation
- [ ] Deployment Guide
- [ ] Troubleshooting Guide
- [ ] Security Best Practices
- [ ] Performance Optimization Guide
- [ ] User Guide for Admin Dashboard
- [ ] Citizen User Guide

## Quick Links

- **Project Repository**: [GitHub](https://github.com/your-org/talibon-website)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-org/talibon-website/issues)
- **Main README**: [README.md](../README.md)
- **Development Roadmap**: [DEVELOPMENT_ROADMAP.md](../DEVELOPMENT_ROADMAP.md)

---

**Last Updated**: 2026-10-07
**Maintained By**: TAL.GOV Development Team
**Version**: 1.0
