# bluesky-to-discord

Pushes new media posts from a Bluesky account to a Discord Webhook

## How to run

- Install NodeJS >= 20
- Copy the .env file to .env.local
  - Put the desired Bluesky at-handle for the `USER_HANDLE` variable
  - Get your Discord webhook url (Server settings > Integrations > Webhooks) and place it for the `DISCORD_WEBHOOK_URL` variable
- Run the script
  - `node --env-file=.env.local index.js`

The script will fetch the last 50 posts from the Bluesky profile defined in the env file.

On the first run the script will not post anything to Discord and will record the newest post from the feed (saved to a file called `newest_post`).

On subsequent runs, any newer posts will be submitted to Discord one by one.

_Note_: Only posts by the given author that include media and are not replies will be posted.
