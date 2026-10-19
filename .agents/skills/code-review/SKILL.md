---
name: code-review
description: >-
  Expert Code Review Agent specialized for Machine Learning, Regression pipelines,
  CRISP-DM processes, and static web dashboards in the nchu-startup-50 repository.
  Use when reviewing code changes, pull requests, git diffs, or ensuring data science integrity.
---

# Code Review Agent Skill

This skill guides the AI Agent in performing professional, comprehensive, and pedagogical code reviews for this repository.

## Review Workflow

When requested to review code (or when a PR is inspected):

### Step 1: Context & Diff Gathering
1. Inspect the modified files using `git status` and `git diff`.
2. Identify the nature of the change:
   - Data Science / Jupyter Notebook (`.ipynb` / Python pipelines).
   - Frontend Dashboard (`web/index.html`, `web/style.css`, `web/app.js`, `web/data.json`).
   - CI/CD Configuration (`.github/workflows/`).

### Step 2: Multi-Dimensional Evaluation Checklist

#### 1. Machine Learning & Statistics Integrity
* **Data Leakage**: Are scalers or transformers fitted exclusively on `X_train`?
* **Reproducibility**: Is `random_state` explicitly assigned in stochastic operations?
* **Dummy Variable Trap**: Does `pd.get_dummies` or `OneHotEncoder` specify `drop_first=True`?
* **Evaluation Metrics**: Are both RMSE (magnitude) and R² (variance explained) calculated on the test split?
* **Bias-Variance Balance**: Does the feature selection logic properly identify overfitting when test RMSE increases?

#### 2. Code Quality & Architecture
* **Path Cleanliness**: Ensure **no absolute local paths** (`file:///c:/...` or `/home/...`) exist in committed files.
* **Model Serialization**: Are `.pkl` files prevented from git tracking?
* **Network & Data Loading**: Are remote dataset URLs robust and fetched gracefully?

#### 3. Web & Frontend Integrity (under `web/`)
* **Static Serverless Compatibility**: Can the app function purely on client-side GitHub Pages without a backend?
* **Chart Lifecycle**: Are existing `Chart.js` instances properly destroyed (`chart.destroy()`) before re-instantiation?
* **Responsiveness**: Are UI elements mobile-responsive and accessible?

### Step 3: Structured Review Output Format

Structure review reports as follows:

```markdown
## 🔎 Code Review Summary
* **Files Inspected**: list of files.
* **Overall Assessment**: [Approved / Approved with Suggestions / Changes Requested].

### 🌟 Strengths & Highlights
* Highlight 1-2 commendable design decisions or clean code implementations.

### ⚠️ Findings & Actionable Recommendations

#### [High / Medium / Low] Issue Title
* **Location**: `filepath:linenumber`
* **Observation**: Detailed explanation of the issue (e.g., potential data leakage or missing drop_first).
* **Suggested Fix**:
```python
# Provide concrete code diff or example
```

### 📋 Checklist Verification
- [x] No hardcoded local paths
- [x] Random state defined for reproducibility
- [x] No data leakage detected
- [x] .gitignore excludes binary models
```
