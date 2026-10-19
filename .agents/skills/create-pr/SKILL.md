---
name: create-pr
description: >-
  Automated GitHub Pull Request (PR) publishing workflow.
  Use when the user wants to publish verified code changes via a Pull Request rather than committing directly to main.
  Handles feature branch creation, staging, conventional commits, remote push, pre-filling the PR template,
  and summoning GitHub Copilot for automated code review.
---

# Pull Request Publishing & Copilot Review Skill

This skill defines the standardized, zero-leakage workflow for publishing code changes via GitHub Pull Requests (PR) and automatically summoning the **GitHub Copilot Code Review Agent**.

---

## 🛑 Golden Rule: Never Commit Directly to `main`

Whenever the user requests to publish changes:
1. **Never** run `git commit` or `git push` directly on the `main` branch.
2. Always isolate work into a descriptively named feature or topic branch.

---

## 📋 Standard PR Publishing Workflow

Follow these 5 steps in order:

### Step 1: Pre-Commit Inspection & Branch Setup
1. Check repository status:
   ```powershell
   git status
   ```
2. Generate a clean, descriptive branch name based on the changes:
   - Features: `feat/<feature-name>` (e.g., `feat/cardekho-dataset`, `feat/web-dataset-tabs`)
   - Documentation: `docs/<doc-topic>` (e.g., `docs/copilot-review-guidelines`)
   - Bug fixes: `fix/<issue-name>`
3. Create and switch to the new branch:
   ```powershell
   git checkout -b <branch-name>
   ```

### Step 2: Stage & Semantic Commit
1. Verify files against `.gitignore`: Ensure temporary files (`.pkl`, `__pycache__`, `pdf_extracted_text.txt`) are excluded.
2. Stage modified and untracked project files:
   ```powershell
   git add <target-files>
   ```
3. Craft a **Conventional Commit** message:
   - Format: `<type>(<scope>): <concise description>`
   - Example: `feat(ml): add CarDekho used car price regression notebook and multi-dataset web tabs`

### Step 3: Push Feature Branch to Remote
Push the newly created branch to GitHub with upstream tracking:
```powershell
git push -u origin <branch-name>
```

### Step 4: Generate Pull Request & Summon Copilot

#### A. If GitHub CLI (`gh`) is installed:
Execute:
```powershell
gh pr create --base main --head <branch-name> --title "<PR Title>" --body-file ".github/pull_request_template.md"
```
Then summon Copilot by adding a review comment:
```powershell
gh pr comment --body "@copilot review this pull request"
```

#### B. If using Browser / GitHub Web (Standard fallback):
1. Construct the direct GitHub one-click compare URL:
   ```text
   https://github.com/contemplator/nchu-startup-50/compare/main...<branch-name>?expand=1
   ```
2. Provide the user with:
   - The direct clickable URL.
   - The pre-filled PR Title.
   - The pre-filled PR Description adopting `.github/pull_request_template.md`, with `@copilot review` appended at the top or bottom to immediately trigger the review bot.

---

## 🤖 Copilot Review Trigger Standards

To ensure the GitHub Copilot Agent reviews the PR:
1. **In PR Body or Comments**: Include the trigger phrase:
   > `@copilot review` or `@copilot please review this pull request based on .github/copilot-instructions.md`
2. **On GitHub PR Page**: In the right sidebar under **Reviewers**, click the gear icon and select **GitHub Copilot** (if Copilot for PRs is enabled in your GitHub organization/account).
3. **Follow-up**: Review Copilot's suggestions and use this workspace's `code-review` skill to assist in addressing feedback.
