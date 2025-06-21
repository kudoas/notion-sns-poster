# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Local Development:**
```bash
# Start local development server
wrangler dev

# Deploy to Cloudflare Workers
wrangler deploy

# Set secrets for Cloudflare Workers
wrangler secret put VARIABLE_NAME
```

**Environment Setup:**
```bash
# Install dependencies
bun install

# Copy environment template
cp .dev.vars.sample .dev.vars
```

## Architecture Overview

This is a **Cloudflare Workers application** that automatically posts articles from a Notion database to social media platforms (Bluesky, Twitter). The system:

1. **Webhook-driven**: Triggered by Notion webhooks when new articles are added to a database
2. **Multi-platform posting**: Uses a strategy pattern with `SnsPoster` interface for different social platforms
3. **AI-powered summaries**: Generates article summaries using Google Gemini AI
4. **Secure verification**: Validates webhook signatures using HMAC

### Core Components

- **`src/index.ts`**: Main Hono application with webhook handler
- **`src/notion.ts`**: Notion API integration with webhook verification
- **`src/config.ts`**: Environment variable configuration and validation
- **`src/sns/`**: Social media posting implementations
  - `interface.ts`: Common `SnsPoster` interface and `Article` type
  - `bluesky.ts`: Bluesky/AT Protocol implementation
  - `twitter.ts`: Twitter API v1.1 implementation
  - `utils.ts`: Shared utilities for SNS posting

### Required Environment Variables

**Notion Integration:**
- `NOTION_API_KEY`: Notion integration token
- `NOTION_DATABASE_ID`: Target database ID
- `NOTION_VERIFICATION_TOKEN`: Webhook signature verification

**Social Media APIs:**
- `BLUESKY_IDENTIFIER`: Bluesky handle/email
- `BLUESKY_PASSWORD`: Bluesky app password
- `TWITTER_CONSUMER_KEY/SECRET`: Twitter app credentials
- `TWITTER_ACCESS_TOKEN/SECRET`: Twitter user tokens

**AI Integration:**
- `GEMINI_API_KEY`: Google Generative AI API key

### Database Schema

The Notion database must have these properties:
- `Title`: Article title (title or rich_text type)
- `URL`: Article URL (url type)
- `Posted`: Boolean flag for posting status (checkbox type)
- `AISummary`: AI-generated summary (rich_text type)

### Technology Stack

- **Runtime**: Cloudflare Workers with Node.js compatibility
- **Framework**: Hono for HTTP handling
- **Package Manager**: Bun
- **APIs**: Notion API, AT Protocol (Bluesky), Twitter API v1.1, Google Generative AI
- **Security**: HMAC webhook verification, OAuth 1.0a for Twitter