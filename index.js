const fs = require("node:fs/promises");

/**
 * @typedef {{handle:string}} Author
 * @typedef {{text:string,reply:{}|undefined}} PostRecord
 * @typedef {{uri:string,author:Author,record:PostRecord,indexedAt:string}} Post
 * @typedef {Post[]} PostFeed
 */

const apiEndpoint =
  "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed";
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
const userHandle = process.env.USER_HANDLE;
const newestPostFilename = "newest_post";

if (!webhookUrl || !userHandle) {
  console.error("Missing environment variables");
  process.exit(1);
}

async function main() {
  const response = await fetch(
    apiEndpoint + "?filter=posts_with_media&actor=" + userHandle
  );

  const json = await response.json();
  /** @type {PostFeed} feed */
  const feed = json.feed.map((postObj) => postObj.post);

  // Only get posts that are from the user and not replies.
  const ownerFeed = feed.filter(
    (post) =>
      post.author.handle === userHandle && post.record.reply === undefined
  );
  if (!ownerFeed.length) {
    console.info("No posts found for the owner");
    return;
  }

  const newestPost = ownerFeed[0];
  const newestIndexedAt = new Date(newestPost.indexedAt);

  // Check if the last_post file exists:
  try {
    await fs.access(newestPostFilename);
  } catch (error) {
    console.info("No last indexed post, write current post at", {
      newestIndexedAt,
    });
    await writeLastPost(newestPost);
    return;
  }

  // Get last indexed post and compare dates to latest post from feed.
  const lastNewestPostData = await fs.readFile(newestPostFilename, {
    encoding: "utf-8",
  });
  const lastNewestPost = JSON.parse(lastNewestPostData);
  const lastNewestPostIndexedAt = new Date(lastNewestPost.indexedAt);

  // Don't post if newest post on feed is not newer than the last posted one.
  if (newestIndexedAt <= lastNewestPostIndexedAt) {
    console.info("No new post since last check");
    return;
  }

  // Write newest post to file.
  await writeLastPost(newestPost);

  // Go through the feed and submit every post that is newer than the last posted one.
  const newPostsFeed = ownerFeed
    .filter((post) => new Date(post.indexedAt) > lastNewestPostIndexedAt)
    .reverse();

  for (const newPost of newPostsFeed) {
    const postHash = newPost.uri.split("/").pop();
    const uri = "https://bsky.app/profile/" + userHandle + "/post/" + postHash;
    const postText = newPost.record.text;
    let messageContent = uri;
    if (postText) {
      messageContent = postText + "\n" + messageContent;
    }

    console.info("Submit post to Discord", uri);

    const postResponse = await fetch(webhookUrl, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        content: messageContent,
      }),
    });

    if (postResponse.ok) {
      console.info("  Posted to Discord");
    } else {
      console.error("  Failed to post to Discord", postResponse.statusText);
    }
  }
}

/**
 * @param {Post} post
 */
async function writeLastPost(post) {
  await fs.writeFile("newest_post", JSON.stringify(post));
}

main();
