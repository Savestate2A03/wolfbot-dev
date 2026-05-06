# wolfbot-dev

Discord bot that runs on AWS Lambda, it is "serverless" (derogatory) so I don't have to worry about EC2 instance failures. It works because Lambda functions are capable of being configured with a Function URL endpoint, and Discord bots now having an Interactions Endpoint URL configuration option lets us point them to these function endpoint URLs.

> **Interactions Endpoint URL**
> 
> You can optionally configure an interactions endpoint
> to receive interactions via HTTP POSTs rather than over
> Gateway with a bot user.

No runtime dependencies!

## Current Commands

| Command                         | Description                                   |
|---------------------------------|-----------------------------------------------|
| `/syncwatch`                    | host a syncwatch!                             |
| `/source`                       | link to here :3 (hi)                          |

## Setup

### Prerequisites

- Node.js 22+
- AWS SAM CLI
- AWS credentials configured
- Bot token

Additionally, make sure the development dependencies are installed:

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in the blanks:

```ini
DISCORD_BOT_TOKEN=
DISCORD_PUBLIC_KEY=
DISCORD_APPLICATION_ID=
DISCORD_GUILD_ID=Optional
```

### Deploy

```bash
npm run deploy
```

This builds the project, then uses `scripts/deploy.ts` to run `sam build` and `sam deploy`, reading parameters from `.env`.

**IMPORTANT**: After you deploy for the first time, you will need to copy `BotEndpoint` (URL in the `sam` CLI output) and then paste it into your bot's `Interactions Endpoint URL` configuration option in the Discord dev portal.

### Register Commands

To get Discord to show your bot's commands, you need to register them with Discord.

```bash
npm run deploy:commands
```

**Note**: Set `DISCORD_GUILD_ID` in `.env` for guild-specific registration. Useful for testing, as it's generally going to be instant. Once you have finished with testing, you can then leave it empty to do global registration (do note however that it can take something around an hour to propagate sometimes).

## Command Info

Sync commands (i.e. `/bark`, `/source`, `/lumch`) run on invocation. Deferred commands (i.e. `/lunch set`, `/lunch refresh`) return a temp response, then re-invokes the Lambda asynchronously to do (presumably) heavy work, which then PATCHes the response when finished using Discord's webhook API. This is because commands must be responded to within 3 seconds, so if something might take longer, we have to let it know we are working on it.

## Adding a Command

- Create a file in `src/commands/src/`
- Implement `Command` or `DeferredCommand` from the registry
- Import your new command in `src/commands/src/index.ts`

The definition, handler, and deploy config are all self-contained in the command file.