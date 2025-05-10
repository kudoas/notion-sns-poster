# notion-sns-poster (Notion to SNS Auto Post)

## Overview

This project is a system that periodically checks article bookmarks saved in a Notion database and automatically posts unposted articles to SNS (e,g., BlueSky, Twitter).

It is built using Cloudflare Workers, Hono, and Bun, and it distinguishes between posted and unposted articles by managing a specific property (e.g., a "Posted" flag) in the Notion database.

## Design

1.  **Add Flag to Notion Database:** A flag property is added to the Notion database to indicate if an article has been posted. The default value is `false`.
2.  **Notion Webhook:** Notion Webhook is configured to send a POST request to the Worker's endpoint when a new page (article) is added to the database.
3.  **Worker Execution:** The Worker, triggered by the Notion Webhook, uses the Notion API to retrieve the newly added article's data from the database. It checks if the "Posted" flag is `false`.
4.  **Post to SNS:** Using the retrieved article data (title, URL, etc.), the article is posted using the configured SNS API. For future extensibility, the SNS integration is abstracted using an interface (`SnsPoster`). The current implementation supports Bluesky and X (Twitter).
5.  **Update Flag:** If the post is successful, the "Posted" flag for the corresponding article in the Notion database is updated to `true` using the Notion API.
6.  **Error Handling:** If an error occurs during posting or API calls, the flag for that article is not updated, allowing it to be retried during the next execution.

## Requirements

- You have article bookmarks managed as a list in a Notion database.
- The Notion database has a property, such as a checkbox, to determine if an article has been posted.

## Technology Stack

- **Platform:** Cloudflare Workers
- **Framework:** Hono
- **Runtime & Package Manager:** Bun
- **Libraries Used:** `@notionhq/client`, `@atproto/api`, `oauth-1.0a`

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

TWITTER_CONSUMER_KEY="Your Twitter App Consumer Key"
TWITTER_CONSUMER_SECRET="Your Twitter App Consumer Secret"
TWITTER_ACCESS_TOKEN="Your Twitter App Access Token"
TWITTER_ACCESS_SECRET="Your Twitter App Access Secret"
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

bun wrangler secret put TWITTER_CONSUMER_KEY
# Enter your Twitter App Consumer Key when prompted

bun wrangler secret put TWITTER_CONSUMER_SECRET
# Enter your Twitter App Consumer Secret when prompted

bun wrangler secret put TWITTER_ACCESS_TOKEN
# Enter your Twitter App Access Token when prompted

bun wrangler secret put TWITTER_ACCESS_SECRET
# Enter your Twitter App Access Secret when prompted
```

### 4. Configure Notion Database

Ensure your target Notion database for automatic posting has the following properties:

- Article Title: Property name used in the code (assumed to be `Title`)
- Article URL: Property name used in the code (assumed to be `URL`) (URL type recommended)
- Posted Flag: Property name used in the code (assumed to be `Posted`) (Checkbox type recommended)

Please check and modify the Notion property names in the Notion database query section of the `src/index.ts` file according to your database setup.

### 5. Configure Notion Webhook 

To trigger the Worker when a new article is added to your Notion database, you need to configure a Notion Webhook.

1.  **Get Worker URL:** After deploying your Worker to Cloudflare, you will get a URL for your Worker. This will be the endpoint for the Notion Webhook.
2.  **Create a Notion Integration:** If you haven't already, create a Notion integration and get the internal integration token (this is your `NOTION_API_KEY`).
3.  **Share Database with Integration:** Share your Notion database with the integration you created.
4.  **Set up Webhook in Notion (Manual or via API):**
    *   Currently, Notion does not provide a direct UI to set up webhooks for database changes. You might need to use a third-party service or a custom script to listen for Notion events (e.g., via the Notion API's audit log or by periodically checking for new pages if direct webhooks are not feasible for your specific Notion setup or plan) and then trigger your Cloudflare Worker endpoint.
    *   Alternatively, if Notion introduces database webhooks directly, configure it to send a POST request to your Worker URL when a page is added. The Worker expects the page ID in the request body (this might require a specific setup or a small intermediary service depending on Notion's Webhook capabilities).

    **Note:** The specifics of Notion Webhook setup can vary. Please refer to the [official Notion API documentation](https://developers.notion.com/docs/webhooks) for the latest information and capabilities. The current project structure assumes that the Worker's `/run-scheduled` endpoint (or a new dedicated endpoint) will be called with the necessary information (e.g., page ID) when a new article is added. You might need to adjust `src/index.ts` to correctly handle the incoming Webhook payload from Notion.

## How to Run

### Local Development

You can start a local development server. Since the primary trigger is now a Notion Webhook, directly testing the full flow locally requires a way to simulate the Webhook or trigger the relevant Worker function manually.

```bash
bun wrangler dev
```

To manually simulate an event (e.g., a new article added), you might need to send a POST request to your local Worker's endpoint (e.g., `http://127.0.0.1:8787/your-webhook-endpoint`) with a payload similar to what Notion Webhook would send. The exact endpoint and payload will depend on how you've configured your Worker to receive Webhook requests.

Alternatively, you can modify the code to have a manual trigger endpoint for development purposes, similar to the previous `run-scheduled` if that helps in testing the core logic.

Logs regarding interactions with the Notion and SNS APIs will be printed to the terminal.

### Deploy to Cloudflare Workers

After configuring environment variables as Secrets in Cloudflare Workers, run the following command:

```bash
bun wrangler deploy
```

After deployment, the Worker will be triggered by Notion Webhook (once configured) whenever a new article is added to your database.
