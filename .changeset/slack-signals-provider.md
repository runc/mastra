---
'@mastra/slack': minor
---

Added `SlackSignals`, a polling signal provider that wakes agent threads when new messages arrive in subscribed Slack conversations. It authorizes your Slack user account (not a bot), so it can watch any thread, channel, or DM you can see — with no webhooks, tunnels, or public endpoints required.

```ts
import { Agent } from '@mastra/core/agent';
import { SlackSignals } from '@mastra/slack';

const agent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  model: 'openai/gpt-4.1',
  instructions: 'Watch Slack threads and follow up on replies.',
  signals: [new SlackSignals()],
});
```

The agent gets `slack_subscribe_thread`, `slack_unsubscribe_thread`, and `slack_list_subscriptions` tools to manage its own subscriptions. Subscriptions and last-seen cursors persist on thread metadata, so restarts never re-deliver old messages.

Also added `SlackUserAuth`, the user-token auth helper behind `SlackSignals`. It connects your Slack account to a pre-existing Slack app via a browser OAuth flow (PKCE, no client secret), refreshes tokens proactively, persists rotated refresh tokens safely, and raises a clear reconnect-required error when credentials die instead of failing with `invalid_token`. Pass a static `token` to skip OAuth in headless or CI environments.
