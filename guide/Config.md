# Configuration

Configuration takes place mainly through environment variables.

I've included a sample set of environment variables under `.env.sample`, you can either
copy the file to `.env` and change that file, or set the environment variables using your
IDE or shell.

## Redirection

When testing external login providers (e.g., Google) they will require you put down a publicly accessible 
redirect uri. For that purpose, I recommend using [ngrok])(https://ngrok.com/).

Create two ngrok tunnels, one for the attic server and one for the app. The tunnel for the 
attic server becomes `ATTIC_URI` in the environment variables, and the tunnel for the app becomes 
both `NEXTAUTH_URL` and `SITE_URI` (they should be the same).

## Attic
The Marketplace app depends on Attic ([`znetstar/attic-server`](https://github.com/znetstar/attic)) for
OAuth and password-based login. The configuration options in the first section configure the connection to Attic.

Make sure to change the various client secrets to random values, and to add the Google OAuth key.

## Databases

The Marketplace and Attic both depend on MongoDB and Redis. In total, you will need
two MongoDB databases, and three Redis databases (they can reside on the same instance).
