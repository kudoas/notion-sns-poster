# notion-sns-poster (Notion to SNS Auto Post)

## Overview

This project is a system that periodically checks article bookmarks saved in a Notion database and automatically posts unposted articles to SNS (e,g., BlueSky).

It is built using Cloudflare Workers, Hono, and Bun, and it distinguishes between posted and unposted articles by managing a specific property (e.g., a "Posted" flag) in the Notion database.

## Architecture

This system is designed as a serverless application leveraging Cloudflare Workers and integrates with external services like Notion and various SNS platforms.

Here's a high-level overview of the architecture:

1.  **Notion Database:** Acts as the central data source for article bookmarks. It stores article information (title, URL) and a "Posted" flag to track publication status.
2.  **Cloudflare Scheduler:** A time-based trigger configured to run the Cloudflare Worker at regular intervals (e.g., every minute).
3.  **Cloudflare Worker:**
    *   The core processing unit.
    *   Triggered by the Cloudflare Scheduler.
    *   Uses the `@notionhq/client` to query the Notion database for articles where the "Posted" flag is `false`.
    *   Iterates through the retrieved unposted articles.
    *   For each article, it uses an `SnsPoster` implementation (currently `BlueskyPoster` using `@atproto/api`) to post the article to the target SNS.
    *   Upon successful posting, it updates the corresponding article's "Posted" flag to `true` in the Notion database using the Notion API.
    *   Includes basic error handling to prevent reprocessing failed posts immediately.
4.  **SNS APIs (e.g., Bluesky AT Protocol API):** External APIs used by the `SnsPoster` implementations to publish content to specific social networking services.

## Requirements

- You have article bookmarks managed as a list in a Notion database.
- The Notion database has a property, such as a checkbox, to determine if an article has been posted.

## Technology Stack

- **Platform:** Cloudflare Workers
- **Framework:** Hono
- **Runtime & Package Manager:** Bun
- **Libraries Used:** `@notionhq/client`, `@atproto/api`

## Design

1.  **Add Flag to Notion Database:** A flag property is added to the Notion database to indicate if an article has been posted. The default value is `false`.
2.  **Cloudflare Scheduler:** Cloudflare Scheduler is configured to trigger the Worker periodically (e.g., every minute).
3.  **Worker Execution:** The scheduled Worker uses the Notion API to search for and retrieve articles from the database where the "Posted" flag is `false`.
4.  **Post to SNS:** Using the retrieved article data (title, URL, etc.), the article is posted using the configured SNS API. For future extensibility, the SNS integration is abstracted using an interface (`SnsPoster`). The current implementation supports Bluesky.
5.  **Update Flag:** If the post is successful, the "Posted" flag for the corresponding article in the Notion database is updated to `true` using the Notion API.
6.  **Error Handling:** If an error occurs during posting or API calls, the flag for that article is not updated, allowing it to be retried during the next execution.

## Setup

### 1. Clone the Repository

```bash
git clone <URL of this repository>
cd <repository name>
```

### 2. Install Dependencies

Install the necessary libraries using Bun.

```bash
bun install
```

### 3. Configure Environment Variables

The configuration method differs for local development and Cloudflare deployment. The following variables are primarily for the currently implemented Bluesky integration. Other SNS integrations may require different environment variables.

#### Local Development Environment

Create a `.dev.vars` file in the project root directory and add the environment variables in the following format. The `.dev.vars` file is excluded from Git management via `.gitignore`.

```bash
cp .dev.vars.sample .dev.vars
```

```.dev.vars
NOTION_API_KEY="Your Notion API Key"
NOTION_DATABASE_ID="Your Notion Database ID"
BLUESKY_IDENTIFIER="Your Bluesky Handle or Email"
BLUESKY_PASSWORD="Your Bluesky Password"
# BLUESKY_SERVICE="bsky.social or other service URL (optional)"
```

#### Cloudflare Workers Environment

Configure environment variables (Secrets) for the Worker using the Cloudflare dashboard or the `wrangler secret put` command.

```bash
bun wrangler secret put NOTION_API_KEY
# Enter your Notion API Key when prompted

bun wrangler secret put NOTION_DATABASE_ID
# Enter your Notion Database ID when prompted

bun wrangler secret put BLUESKY_IDENTIFIER
# Enter your Bluesky Identifier when prompted

bun wrangler secret put BLUESKY_PASSWORD
# Enter your Bluesky Password when prompted
```

### 4. Configure Notion Database

Ensure your target Notion database for automatic posting has the following properties:

- Article Title: Property name used in the code (assumed to be `Title`)
- Article URL: Property name used in the code (assumed to be `URL`) (URL type recommended)
- Posted Flag: Property name used in the code (assumed to be `Posted`) (Checkbox type recommended)

Please check and modify the Notion property names in the Notion database query section of the `src/index.ts` file according to your database setup.

### 5. Configure Cloudflare Scheduler

In the Cloudflare dashboard, configure a Scheduler trigger for the deployed Worker. Specify the execution interval (e.g., every minute).

## How to Run

### Local Development

You can start a local development server and manually trigger the `scheduled` handler for testing.

```bash
bun wrangler dev
```

Once the local server is running, access the following URL via your browser or curl:

```bash
curl http://127.0.0.1:8787/run-scheduled
```

Logs regarding interactions with the Notion and Bluesky APIs will be printed to the terminal.

### Deploy to Cloudflare Workers

After configuring environment variables as Secrets in Cloudflare Workers, run the following command:

```bash
bun wrangler deploy
```

After deployment, the Worker will be executed periodically according to the Cloudflare Scheduler configuration.

## For Developers

- The SNS integration is abstracted by the `SnsPoster` interface in `src/snsPoster.ts`. To add support for a new SNS, create a class that implements this interface and update `src/index.ts` to use the new poster based on configuration or other logic.
- The current Bluesky implementation (`BlueskyPoster`) uses `@atproto/api`'s `RichText` class and External Embed (`app.bsky.embed.external`) to display OGP previews when posting articles.

## License

Please refer to the [LICENSE](LICENSE) file. (Note: Add license information as needed)

