```markdown
# Telegram → GitHub Issue Bot (MVP Plan)

A Telegram bot that allows developers to create GitHub issues directly from Telegram using their personal GitHub token.

---

# 1. Goal

Build a minimal Telegram bot where a developer can:

- Connect their GitHub account using a Personal Access Token
- Select a repository
- Create an issue
- Receive the issue link

Primary use case:

```

Telegram → Create GitHub issue quickly

```

---

# 2. Core User Flow

### Connect GitHub

```

/connect

```

Bot asks:

```

Paste your GitHub Personal Access Token

```

User sends token.

Bot stores token.

Response:

```

✅ GitHub connected successfully

```

---

### List repositories

```

/repos

```

Bot fetches repositories via GitHub API.

Example response:

```

Your repositories:

1. phalla/project-alpha
2. phalla/frontend-ui
3. phalla/api-server

```

---

### Create issue

```

/issue owner/repo

```

Example:

```

/issue phalla/project-alpha

```

Bot conversation:

```

Bot:
Issue title?

User:
Login button broken

Bot:
Issue description?

User:
When clicking login with Google it redirects to 404

```

Bot creates issue and returns:

```

✅ Issue created

[https://github.com/phalla/project-alpha/issues/24](https://github.com/phalla/project-alpha/issues/24)

```

---

# 3. Tech Stack

Bot:

- Telegraf (Telegram bot framework)
- Node.js
- TypeScript

Backend / Database:

- Convex

GitHub API:

- Octokit

Infrastructure:

```

Telegram
↓
Telegram Bot (Node + Telegraf)
↓
Convex (DB + server functions)
↓
GitHub API

```

---

# 4. Database (Convex)

Minimal schema.

## users table

```

users
{
_id
telegramId: string
githubToken: string
}

```

Optional fields:

```

createdAt
updatedAt

````

### Convex Schema Example

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    telegramId: v.string(),
    githubToken: v.string()
  }).index("by_telegram", ["telegramId"])
});
````

---

# 5. Convex Functions

## saveToken

Stores or updates GitHub token.

```
saveToken(telegramId, token)
```

Logic:

```
if user exists
    update token
else
    create user
```

---

## getUserToken

Returns token for GitHub API calls.

```
getUserToken(telegramId)
```

---

## disconnectUser

Removes token.

```
deleteUser(telegramId)
```

Used for:

```
/disconnect
```

---

# 6. Telegram Commands

MVP commands:

```
/start
/connect
/repos
/issue
/disconnect
/help
```

---

# 7. Issue Creation Logic

Using GitHub API.

Example:

```ts
import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: userToken
});

await octokit.request("POST /repos/{owner}/{repo}/issues", {
  owner,
  repo,
  title,
  body
});
```

Response contains:

```
issue.html_url
```

Send back to Telegram.

---

# 8. Conversation State

Need temporary state tracking.

Example in memory:

```
Map<telegramId, DraftIssue>
```

Example object:

```
{
  repo: "owner/repo",
  step: "title",
  title: "",
  body: ""
}
```

Steps:

```
repo_selected
title_received
description_received
create_issue
```

This does NOT need to be stored in database.

---

# 9. Security

GitHub tokens are sensitive.

Recommendations:

1. Encrypt token before storing
2. Use AES encryption with secret key
3. Allow user to remove token

Command:

```
/disconnect
```

Deletes token from database.

---

# 10. Project Structure

Example layout:

```
project-root

bot/
  index.ts
  telegram.ts
  commands/
    connect.ts
    repos.ts
    issue.ts
    disconnect.ts

convex/
  schema.ts
  users.ts

services/
  github.ts
  encryption.ts
```

---

# 11. Environment Variables

```
TELEGRAM_BOT_TOKEN=
CONVEX_URL=
ENCRYPTION_SECRET=
```

---

# 12. GitHub Token Permission

User must create token with permissions:

```
Issues: Read + Write
Repository metadata: Read
```

No other permissions needed for MVP.

---

# 13. Error Handling

Cases to handle:

### Token invalid

```
❌ GitHub token invalid
Reconnect using /connect
```

---

### Repo not found

```
❌ Repository not accessible
```

---

### API rate limit

```
⚠️ GitHub API rate limit reached
Try again later
```

---

# 14. Logging

Log important events:

```
user_connected
issue_created
token_removed
api_error
```

This helps debugging.

---

# 15. Future Features (v2)

## Natural language issue creation

Example:

```
/issue

Login page crashes when using Safari
```

Bot auto-generates title + description.

---

## Reply-to-message issue

User replies to a message in Telegram.

Bot command:

```
Create GitHub issue
```

Message becomes issue body.

---

## Notifications

GitHub webhooks send:

```
New issue
New comment
Assigned to you
```

Bot forwards notifications.

---

## Quick issue command

```
/bug repo login broken | google auth fails
```

Fast issue creation.

---

## Assign issue

```
/assign 24 @username
```

---

# 16. Long-Term Vision

Turn Telegram into a lightweight developer control panel.

Examples:

```
/issue
/pr
/deploy
/review
/build
```

Possible integrations:

* GitHub
* CI/CD
* Deployment pipelines
* Monitoring alerts

---

# 17. Estimated Build Time

MVP timeline:

```
Setup bot               30 minutes
Convex schema           10 minutes
Token storage           20 minutes
Issue creation flow     40 minutes
Testing                 20 minutes
```

Total:

```
~2 hours for working MVP
```

---

# End

```
```
