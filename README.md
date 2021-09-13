 
## Installing

Install Node.js 14 (preferably by downloading [NVM](https://github.com/nvm-sh/nvm) and running `nvm install 14 && nvm use 14`) and [Docker](https://www.docker.com/).

Run `npm ci` to install the modules.

## Configuring

You'll need to add configuration options to `.env.local` in the root folder of this project.

When I use "`{...}`" your expected to use your issued API credentials.  

```text
MONGO_URI=mongodb://localhost:8201/third-act
REDIS_URI=redis://localhost:8202/0

AWS_ACCESS_KEY_ID={...}
AWS_SECRET_ACCESS_KEY={...}

SMTP_URI={...}
SMTP_FROM={...}
```

## Running

Start the database by running `docker compose up -d mongo`.

Finally, you can start the server by running `npm run dev`. If you're using VSCode (or any Chrome-compatible IDE) you'll
probably want to use [debugging](https://nextjs.org/docs/advanced-features/debugging).

