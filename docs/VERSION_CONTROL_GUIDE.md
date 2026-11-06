# Version Control Guide

## Overview

This guide covers Git workflow and version control best practices for TAL.GOV development.

## Git Workflow

### Branch Strategy

```
main (production)
  ├── develop (staging/integration)
  │   ├── feature/service-detail-page
  │   ├── feature/admin-dashboard
  │   ├── fix/navigation-bug
  │   └── hotfix/security-patch
  └── release/v1.0.0
```

### Branch Types

#### Main Branch

- **Name**: `main`
- **Purpose**: Production-ready code
- **Protection**: Require pull requests, status checks
- **Deployment**: Automatically deploys to production

#### Develop Branch

- **Name**: `develop`
- **Purpose**: Integration branch for features
- **Deployment**: Automatically deploys to staging
- **Protection**: Require pull requests

#### Feature Branches

- **Naming**: `feature/<feature-name>`
- **Purpose**: Develop new features
- **Source**: Branch from `develop`
- **Target**: Merge back to `develop`

#### Bugfix Branches

- **Naming**: `fix/<bug-description>`
- **Purpose**: Fix bugs
- **Source**: Branch from `develop`
- **Target**: Merge back to `develop`

#### Hotfix Branches

- **Naming**: `hotfix/<hotfix-description>`
- **Purpose**: Critical production fixes
- **Source**: Branch from `main`
- **Target**: Merge to both `main` and `develop`

#### Release Branches

- **Naming**: `release/v<version>`
- **Purpose**: Prepare for release
- **Source**: Branch from `develop`
- **Target**: Merge to both `main` and `develop`

## Branch Naming Conventions

### Feature Branches

```
feature/user-authentication
feature/service-detail-page
feature/admin-dashboard
feature/citizen-portal
```

### Bugfix Branches

```
fix/mobile-navigation-bug
fix/login-error
fix/database-connection
```

### Hotfix Branches

```
hotfix/security-vulnerability
hotfix/critical-bug-fix
hotfix-production-down
```

### Release Branches

```
release/v1.0.0
release/v1.1.0
release/v2.0.0
```

## Commit Conventions

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting) |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `ci` | CI/CD changes |
| `build` | Build system changes |
| `revert` | Revert previous commit |

### Commit Examples

```bash
# Feature
feat(auth): add JWT token refresh mechanism

# Bug fix
fix(api): resolve database connection timeout issue

# Documentation
docs(readme): update installation instructions

# Refactor
refactor(services): simplify service data fetching logic

# Performance
perf(images): implement lazy loading for images

# Test
test(auth): add unit tests for authentication

# Chore
chore(deps): update npm dependencies
```

### Commit Body

```bash
feat(services): add service filtering by category

- Add category filter to services page
- Implement backend API endpoint
- Add unit tests for filtering logic

Closes #123
```

## Pull Request Process

### Creating a Pull Request

1. **Update develop branch**

```bash
git checkout develop
git pull origin develop
```

2. **Create feature branch**

```bash
git checkout -b feature/new-feature
```

3. **Make changes and commit**

```bash
git add .
git commit -m "feat: add new feature"
```

4. **Push to remote**

```bash
git push -u origin feature/new-feature
```

5. **Create pull request**

- Go to GitHub
- Click "New Pull Request"
- Select `feature/new-feature` → `develop`
- Fill in PR template
- Request reviewers

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Tests pass locally

## Related Issues
Closes #123
```

### Pull Request Review

#### Reviewer Checklist

- [ ] Code is clear and understandable
- [ ] Code follows project conventions
- [ ] Tests are adequate
- [ ] Documentation is updated
- [ ] No security issues
- [ ] No performance issues
- [ ] No breaking changes (unless documented)

#### Review Guidelines

- Be constructive and respectful
- Explain the "why" for suggestions
- Approve when changes are satisfactory
- Request changes when needed
- Comment directly on code

## Merging Strategy

### Feature Branch Merge

```bash
# Squash merge for feature branches
git checkout develop
git merge --squash feature/new-feature
git commit -m "feat: add new feature"
git branch -d feature/new-feature
```

### Hotfix Merge

```bash
# Merge hotfix to main
git checkout main
git merge hotfix/critical-fix
git tag -a v1.0.1 -m "Hotfix: critical fix"

# Merge hotfix to develop
git checkout develop
git merge hotfix/critical-fix
git branch -d hotfix/critical-fix
```

### Release Merge

```bash
# Merge release to main
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"

# Merge release to develop
git checkout develop
git merge release/v1.0.0
git branch -d release/v1.0.0
```

## Versioning

### Semantic Versioning

Follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality
- **PATCH**: Backwards-compatible bug fixes

### Version Examples

```
v1.0.0 - Initial release
v1.0.1 - Bug fix
v1.1.0 - New feature
v2.0.0 - Breaking changes
```

### Release Process

1. **Create release branch**

```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0
```

2. **Update version number**

```json
// package.json
{
  "version": "1.0.0"
}
```

3. **Update CHANGELOG**

```markdown
## [1.0.0] - 2024-01-01

### Added
- User authentication
- Service listing
- Admin dashboard

### Changed
- Updated UI framework

### Fixed
- Mobile navigation bug
```

4. **Commit and merge**

```bash
git add .
git commit -m "chore: release v1.0.0"
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags
```

## Git Configuration

### Global Configuration

```bash
# Set user name
git config --global user.name "Your Name"

# Set user email
git config --global user.email "your.email@example.com"

# Set default branch
git config --global init.defaultBranch main

# Set line endings
git config --global core.autocrlf input  # Linux/Mac
git config --global core.autocrlf true   # Windows
```

### Project Configuration

```bash
# Set project-specific config
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## .gitignore

### Common .gitignore

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production
build/
dist/
.next/
out/

# Misc
.DS_Store
*.pem
.env
.env.local
.env.production

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db
```

## Git Hooks

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linting
npm run lint

# Run tests
npm run test

# Check if failed
if [ $? -ne 0 ]; then
  echo "Linting or tests failed. Commit aborted."
  exit 1
fi
```

### Commit Message Hook

```bash
#!/bin/sh
# .git/hooks/commit-msg

# Validate commit message format
commit_regex='^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
  echo "Invalid commit message format. Use: type(scope): subject"
  exit 1
fi
```

### Pre-push Hook

```bash
#!/bin/sh
# .git/hooks/pre-push

# Run full test suite
npm run test:full

# Check if failed
if [ $? -ne 0 ]; then
  echo "Tests failed. Push aborted."
  exit 1
fi
```

## Git Best Practices

### Do's

- Write clear, descriptive commit messages
- Make small, focused commits
- Pull before pushing
- Use branches for features
- Review code before merging
- Keep main branch stable
- Tag releases

### Don'ts

- Commit sensitive data
- Commit directly to main
- Make large, unrelated commits
- Ignore merge conflicts
- Skip code review
- Break the build
- Commit generated files

## Troubleshooting

### Common Issues

#### Merge Conflicts

```bash
# Resolve conflicts
git status
# Edit conflicted files
git add <resolved-files>
git commit
```

#### Undo Last Commit

```bash
# Undo commit but keep changes
git reset --soft HEAD~1

# Undo commit and discard changes
git reset --hard HEAD~1
```

#### Change Last Commit Message

```bash
git commit --amend
```

#### Discard Local Changes

```bash
# Discard all changes
git reset --hard HEAD

# Discard specific file
git checkout -- <file>
```

## Git Commands Reference

### Daily Commands

```bash
git status          # Check status
git add .           # Stage all changes
git commit -m "msg" # Commit changes
git push            # Push to remote
git pull            # Pull from remote
```

### Branch Commands

```bash
git branch                    # List branches
git branch <name>             # Create branch
git checkout <name>           # Switch branch
git checkout -b <name>        # Create and switch
git branch -d <name>          # Delete branch
git merge <branch>            # Merge branch
```

### History Commands

```bash
git log               # View history
git log --oneline      # Condensed history
git diff               # View changes
git diff <file>        # View file changes
git show <commit>      # View commit details
```

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
