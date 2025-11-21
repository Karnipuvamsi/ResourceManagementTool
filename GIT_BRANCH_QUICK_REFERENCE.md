# Git Branch Quick Reference Guide

## Quick Commands to Push Current Code to New Branch

### Step-by-Step Commands

```bash
# 1. Check current status
git status

# 2. Stage all changes
git add .

# 3. Commit changes with descriptive message
git commit -m "Implement cascading dropdowns for Customer form (Country/State/City)"

# 4. Create and switch to new branch
git checkout -b feature/customer-cascading-dropdowns

# 5. Push branch to remote repository
git push -u origin feature/customer-cascading-dropdowns
```

### One-Liner Version

```bash
git add . && git commit -m "Implement cascading dropdowns for Customer form" && git checkout -b feature/customer-cascading-dropdowns && git push -u origin feature/customer-cascading-dropdowns
```

## If You Have Uncommitted Changes

```bash
# Option 1: Commit first, then branch
git add .
git commit -m "Your commit message"
git checkout -b feature/customer-cascading-dropdowns
git push -u origin feature/customer-cascading-dropdowns

# Option 2: Stash, branch, then apply
git stash save "WIP: Cascading dropdowns"
git checkout -b feature/customer-cascading-dropdowns
git stash pop
git add .
git commit -m "Your commit message"
git push -u origin feature/customer-cascading-dropdowns
```

## Verify Your Branch

```bash
# List all branches (local and remote)
git branch -a

# Check current branch
git branch

# View branch on remote
git ls-remote --heads origin
```

## Common Branch Names

- `feature/customer-cascading-dropdowns` - Feature implementation
- `feat/customer-dropdowns` - Shorter version
- `bugfix/dropdown-selection-issue` - Bug fix
- `enhancement/customer-form` - Enhancement

## After Creating Branch

### Create Pull Request (GitHub)
1. Go to your repository on GitHub
2. Click "Compare & pull request"
3. Add description
4. Request reviewers
5. Click "Create pull request"

### Create Merge Request (GitLab)
1. Go to your repository on GitLab
2. Click "Create merge request"
3. Select your branch
4. Add description
5. Submit merge request

## Useful Git Commands

```bash
# View commit history
git log --oneline

# View changes in current branch vs main
git diff main..feature/customer-cascading-dropdowns

# Rename branch (if needed)
git branch -m old-name new-name

# Delete local branch (after merge)
git branch -d feature/customer-cascading-dropdowns

# Delete remote branch
git push origin --delete feature/customer-cascading-dropdowns
```

## Troubleshooting

### "Branch already exists" error
```bash
# Switch to existing branch
git checkout feature/customer-cascading-dropdowns

# Or delete and recreate
git branch -D feature/customer-cascading-dropdowns
git checkout -b feature/customer-cascading-dropdowns
```

### "No upstream branch" warning
```bash
# Set upstream after pushing
git push --set-upstream origin feature/customer-cascading-dropdowns
```

### "Your branch is ahead of origin" message
```bash
# Push your commits
git push
```

---

**Quick Tip**: Always commit your changes before creating a new branch to avoid losing work!

