# AI Skills Development Guide

## Overview

This guide provides comprehensive documentation for developing and working with AI skills in the TAL.GOV project. It explains how to use, modify, and extend the existing AI skills to accelerate development and maintain consistency across the codebase.

## What Are AI Skills?

AI skills are specialized, context-aware instructions that guide AI agents (like Devin) in performing specific tasks within the TAL.GOV codebase. Each skill encapsulates domain-specific knowledge, patterns, and best practices for a particular area of development.

## Available Skills

The TAL.GOV project includes the following specialized skills:

1. **API Integration Skill** - Backend API development and frontend API consumption
2. **Backend Development Skill** - NestJS, TypeScript, and Supabase backend development
3. **Database Operations Skill** - Supabase and PostgreSQL database operations
4. **Deployment & DevOps Skill** - Deployment pipelines, CI/CD, and infrastructure
5. **Frontend Development Skill** - React, TypeScript, and Vite frontend development
6. **Testing & QA Skill** - Testing and quality assurance across the stack

## Skill Structure

Each skill follows a consistent structure:

```
.devin/skills/[skill-name]/
└── SKILL.md
```

The SKILL.md file contains:
- **When to Use This Skill** - Clear guidance on when to invoke the skill
- **Efficient Workflow** - Step-by-step process for common tasks
- **Cost-Effective Operations** - Token optimization strategies
- **Code Patterns** - Reusable code templates and examples
- **Best Practices** - Security, performance, and maintainability guidelines
- **Quick Reference** - Common commands, decorators, and patterns
- **Checklist** - Verification steps before task completion

## Using AI Skills

### When to Invoke Skills

Skills should be invoked when you need to:
- Create new features in a specific domain
- Modify existing code following established patterns
- Debug issues in a specific area
- Understand the codebase architecture
- Implement changes consistently with existing code

### How Skills Work

When you request a task that matches a skill's domain:
1. The AI agent automatically loads the relevant skill
2. The skill provides context-specific guidance
3. The agent follows the skill's workflow and patterns
4. Code is generated following the skill's best practices
5. The skill's checklist ensures quality standards

### Example Workflow

**Task**: "Add a new API endpoint for managing municipal events"

1. **Skill Invocation**: The API Integration Skill is automatically invoked
2. **Context Loading**: The skill reads existing controller/service patterns
3. **Pattern Following**: The agent follows the established REST conventions
4. **Implementation**: Code is generated using skill templates
5. **Verification**: The skill's checklist is applied to ensure completeness

## Developing New Skills

### When to Create a New Skill

Consider creating a new skill when:
- A distinct domain of development emerges (e.g., "Payment Integration")
- Common patterns repeat across multiple files
- Complex logic requires specialized knowledge
- Multiple developers work in a specific area
- Token usage can be optimized through context bundling

### Skill Template

```markdown
# [Skill Name] Skill

[One-sentence description of the skill's purpose]

## When to Use This Skill

Use this skill when:
- [Condition 1]
- [Condition 2]
- [Condition 3]

## Efficient Workflow

### 1. [Step Name]
```bash
# Command or action
```

### 2. [Step Name]
```bash
# Command or action
```

### 3. Implementation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Cost-Effective Operations

### [Strategy Name]
```typescript
// Code example or pattern
```

## Code Patterns

### [Pattern Name]
```typescript
// Code template
```

## Best Practices

- [Practice 1]
- [Practice 2]
- [Practice 3]

## Quick Reference

### [Category]
- [Item 1]
- [Item 2]

## Checklist Before Completion

- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]
```

### Skill Development Guidelines

1. **Keep It Focused**: Each skill should address a specific domain
2. **Provide Examples**: Include real code examples from the codebase
3. **Optimize for Tokens**: Balance completeness with conciseness
4. **Maintain Consistency**: Follow the established skill structure
5. **Test Thoroughly**: Verify the skill produces expected results
6. **Document Changes**: Update the skill when patterns evolve

## Skill Integration Patterns

### Cross-Skill Coordination

Some tasks may require multiple skills:

```text
Task: "Create a new e-service form with payment integration"

Skills Involved:
1. Frontend Development Skill - Form UI components
2. API Integration Skill - Form submission endpoints
3. Backend Development Skill - Form processing logic
4. Database Operations Skill - Form data storage
5. Deployment & DevOps Skill - Payment gateway configuration
```

### Skill Dependencies

Skills may depend on each other:
- **API Integration** depends on **Backend Development** for patterns
- **Frontend Development** depends on **API Integration** for service patterns
- **Testing & QA** spans all other skills

## Skill Maintenance

### When to Update Skills

Update a skill when:
- Code patterns change significantly
- New libraries or frameworks are adopted
- Security best practices evolve
- Performance optimization opportunities emerge
- User feedback indicates confusion or inefficiency

### Update Process

1. Review existing skill content
2. Identify outdated patterns or missing information
3. Add new patterns or examples
4. Remove deprecated content
5. Test the updated skill with sample tasks
6. Document the change in the skill's history

## Skill Best Practices

### For Developers Using Skills

1. **Review Before Invoking**: Understand what the skill covers
2. **Provide Context**: Give specific details about your task
3. **Trust the Patterns**: Follow skill guidance even if it differs from your preference
4. **Report Issues**: If a skill produces incorrect results, document the issue
5. **Suggest Improvements**: Propose enhancements to skill maintainers

### For Skill Maintainers

1. **Keep Skills Current**: Regularly review and update skills
2. **Gather Feedback**: Collect input from developers using skills
3. **Measure Effectiveness**: Track token usage and task success rates
4. **Optimize for Reuse**: Design skills to be applicable across multiple scenarios
5. **Document Changes**: Maintain a changelog for skill modifications

## Token Optimization Strategies

### Skill-Level Optimization

1. **Selective Loading**: Only load relevant sections of a skill
2. **Context Pruning**: Remove unnecessary examples for specific tasks
3. **Pattern References**: Use references instead of repeating code
4. **Hierarchical Structure**: Organize skills to allow selective depth

### Usage-Level Optimization

1. **Task Scoping**: Define clear, focused tasks to avoid loading multiple skills
2. **Context Provision**: Provide relevant context to reduce skill exploration
3. **Incremental Development**: Break large tasks into smaller, skill-specific steps
4. **Skill Chaining**: Use skills sequentially rather than simultaneously

## Skill Examples

### Example 1: Using the API Integration Skill

**Request**: "Add an endpoint to get all active news items"

**Skill Application**:
1. Load API Integration Skill
2. Check existing controller patterns
3. Follow REST conventions (GET /api/news)
4. Implement service logic with Supabase
5. Add authentication guards
6. Apply skill checklist

**Result**: Consistent, secure, and well-documented API endpoint

### Example 2: Using the Frontend Development Skill

**Request**: "Create a news card component for the homepage"

**Skill Application**:
1. Load Frontend Development Skill
2. Check existing component patterns
3. Follow design system guidelines
4. Implement TypeScript interfaces
5. Add responsive design
6. Apply skill checklist

**Result**: Reusable, type-safe, and accessible component

## Skill Metrics and KPIs

Track the following metrics to evaluate skill effectiveness:

1. **Token Efficiency**: Tokens used per task completion
2. **Success Rate**: Percentage of tasks completed without manual intervention
3. **Code Quality**: Adherence to patterns and best practices
4. **Developer Satisfaction**: Feedback from developers using skills
5. **Maintenance Burden**: Time required to keep skills current

## Troubleshooting

### Common Issues

**Issue**: Skill produces code that doesn't compile
- **Solution**: Update skill with current library versions and patterns

**Issue**: Skill context is too large
- **Solution**: Refactor skill into sub-skills or use selective loading

**Issue**: Skill guidance conflicts with project requirements
- **Solution**: Document exceptions and update skill to accommodate variations

**Issue**: Skill is not invoked for relevant tasks
- **Solution**: Review skill description and improve trigger conditions

## Skill Governance

### Approval Process

1. **Proposal**: Submit skill proposal with rationale
2. **Review**: Technical team reviews for alignment
3. **Testing**: Test skill with sample tasks
4. **Approval**: Project lead approves for inclusion
5. **Documentation**: Add to skill registry and communicate to team

### Version Control

Skills should be versioned when:
- Major structural changes occur
- New patterns are added
- Breaking changes are introduced
- Security updates are required

## Skill Registry

Maintain a central registry of all skills with:
- Skill name and description
- Author and maintainer
- Version history
- Dependencies on other skills
- Usage statistics
- Known issues and limitations

## Training and Onboarding

### For New Developers

1. **Skill Overview**: Introduction to all available skills
2. **Skill Selection**: Guidance on when to use which skill
3. **Skill Usage**: Hands-on practice with common tasks
4. **Skill Contribution**: How to propose and develop new skills

### For Skill Maintainers

1. **Skill Design**: Principles and patterns for effective skills
2. **Skill Testing**: How to validate skill effectiveness
3. **Skill Optimization**: Techniques for token efficiency
4. **Skill Documentation**: Best practices for skill documentation

## Conclusion

AI skills are a powerful tool for accelerating development while maintaining code quality and consistency. By understanding how to use, develop, and maintain skills effectively, the TAL.GOV team can leverage AI assistance to its full potential.

For questions or suggestions about skills, contact the technical lead or create an issue in the project repository.
