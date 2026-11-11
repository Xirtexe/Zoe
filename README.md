# Zoe-XD WhatsApp Bot

**Zoe-XD** is a multi-device WhatsApp automation bot built with Node.js.
It provides a modular plugin-based structure and supports deployment on
cloud platforms, Linux servers, hosting panels, and Android through
Termux.

-   **Repository:** https://github.com/Xirtexe/Zoe
-   **Website:** https://zoe-xd.vercel.app/
-   **Session generator:** https://zoe-xd.vercel.app/
-   **Deployment guides:** https://zoe-xd.vercel.app/deploy
-   **Plugin library:** https://zoe-xd.vercel.app/plugins

> Use a WhatsApp account that you are comfortable dedicating to the bot.
> WhatsApp may restrict accounts that violate its terms or use
> automation in ways it considers abusive. Keep your session credentials
> private.

------------------------------------------------------------------------

[![Join WhatsApp Group](https://img.shields.io/badge/Join%20WhatsApp%20Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/BxNvOg51FYk2Q2JYmfogCm?s=cl&p=a&iam=2)

Join the Zoe-XD WhatsApp group to connect with the community.

------------------------------------------------------------------------

## Features and Project Structure

The repository describes Zoe-XD as a multi-device WhatsApp automation
bot with modular plugins and flexible deployment.

  -----------------------------------------------------------------------
  Area                                Description
  ----------------------------------- -----------------------------------
  WhatsApp connection                 Connects through the Baileys
                                      WhatsApp Web library.

  Plugins                             Keeps bot functionality organized
                                      in the `plugins/` directory.

  Configuration                       Loads settings from environment
                                      variables and, when present,
                                      `config.env`.

  Database                            Uses SQLite by default and supports
                                      PostgreSQL through `DATABASE_URL`.

  Web status endpoint                 Exposes `/` and responds with
                                      `Bot is running`.

  Deployment                          Includes configuration for Render,
                                      Heroku/Docker, and general Node.js
                                      hosting.
  -----------------------------------------------------------------------

The available commands and plugin behavior depend on the code and
plugins in the checked-out repository version. Check the project itself
for the current implementation rather than relying on an outdated
command list.

## Getting Started

### 1. Fork or clone the repository

Fork the repository on GitHub if you want to maintain your own copy:

https://github.com/Xirtexe/Zoe/fork

Or clone it directly:

``` bash
git clone https://github.com/Xirtexe/Zoe.git
cd Zoe
```

### 2. Install dependencies

Use Node.js 20 or newer, then install the project dependencies:

``` bash
npm install
```

Some dependencies use native binaries. On platforms where prebuilt
binaries are unavailable, the host may need the appropriate compiler
toolchain and system libraries.

### 3. Configure Zoe

The application reads environment variables and can also load a
`config.env` file from the project root.

Example `config.env`:

``` env
SESSION=your_session_id
MODE=private
SUDO=your_number
LANGUAGE=english
```

Replace the example values with your own. Do not publish `config.env`,
session IDs, API keys, or database credentials.

### 4. Start the application

``` bash
npm start
```

The repository's start script launches the application through PM2.

------------------------------------------------------------------------

## WhatsApp Session

1.  Open the Zoe website: https://zoe-xd.vercel.app/
2.  Follow the session-generation instructions shown there.
3.  Add the generated value to the `SESSION` environment variable or
    your local `config.env`.
4.  Keep the session value private. Anyone who obtains valid session
    credentials may be able to access the linked WhatsApp account.
5.  Start or restart Zoe after changing the session configuration.

Do not paste your real session ID into public issues, screenshots,
source files, or shared deployment logs.

------------------------------------------------------------------------

## Hosting and Deployment

Choose the hosting method that matches your environment. The official
deployment dashboard is:

**https://zoe-xd.vercel.app/deploy**

### Termux --- Android

Zoe provides an automatic setup script for Termux. Instead of manually
installing the project dependencies, run the Bash + cURL command below
in Termux:

``` bash
bash <(curl -fsSL https://zoe-xd.vercel.app/setup.sh)
```

The setup script handles the installation process. Follow the prompts
and final instructions it displays to configure and start Zoe.

Official installer: https://zoe-xd.vercel.app/setup.sh

### Render

The repository includes a `render.yaml` Blueprint.

1.  Fork the Zoe repository.
2.  Open the [Render Blueprint
    dashboard](https://dashboard.render.com/blueprints).
3.  Create a Blueprint Instance and select your fork.
4.  Review the service configuration loaded from `render.yaml`.
5.  Provide the required environment values when prompted.
6.  Deploy the service and inspect its logs.

The current Blueprint specifies:

-   Runtime: Node.js
-   Build command:
    `npm install --include=dev && npm rebuild sqlite3 --build-from-source`
-   Start command: `npm start`
-   Branch: `main`
-   Automatic deployment: enabled

The Blueprint declares `RENDER_APP_NAME`, `RENDER_API`, `SESSION`, and
`DATABASE_URL` as required inputs. `SUDO`, `HANDLER`, and `MODE` are
also listed as optional environment variables.

The application itself defaults to a local SQLite database when
`DATABASE_URL` is not set. For a hosted deployment, use a persistent
database/storage arrangement appropriate to the host. If using the
Blueprint as committed, satisfy its required `DATABASE_URL` input.

[Deploy with Render](https://dashboard.render.com/blueprints)

### Koyeb

1.  Fork the Zoe repository and connect GitHub to
    [Koyeb](https://app.koyeb.com/).
2.  Create a Web Service from your repository.
3.  Use `npm install` as the install/build command where the service
    configuration asks for it.
4.  Use `npm start` as the start command.
5.  Add `SESSION` and any other required configuration values.
6.  If you use Zoe's Koyeb management integration, configure `KOYEB_API`
    and `KOYEB_APP_NAME`.
7.  Deploy and inspect the service logs.

[Koyeb dashboard](https://app.koyeb.com/)

### Railway

1.  Fork the Zoe repository.
2.  Create a project in [Railway](https://railway.com/).
3.  Deploy the project from your GitHub repository.
4.  Configure the start command as `npm start`.
5.  Add `SESSION` and any other configuration values required by your
    setup.
6.  For Zoe's Railway management integration, configure `RAILWAY_API`
    and `RAILWAY_PROJECT_NAME`.
7.  Deploy and inspect the logs.

[Railway dashboard](https://railway.com/)

### Heroku

The repository contains `app.json`, `heroku.yml`, and a `Dockerfile`.

1.  Create a Heroku application.
2.  Connect your forked Zoe repository or deploy using the repository's
    container configuration.
3.  Configure the required application settings, including `SESSION`.
4.  Configure the Heroku app name and API key only if you use the
    corresponding management integration.
5.  Deploy the application and review its logs.

The committed `heroku.yml` defines a Docker worker using `Dockerfile`
and starts it with `npm start`. The Dockerfile uses Node.js 20 Alpine,
installs supporting system tools including FFmpeg, installs PM2, and
exposes port `8080`.

[Heroku dashboard](https://dashboard.heroku.com/)

### VPS --- Linux server

Use a Linux VPS with Node.js 20 or newer.

1.  Install Git, Node.js, npm, and FFmpeg using your distribution's
    package manager or official installation instructions.

2.  Clone the repository:

    ``` bash
    git clone https://github.com/Xirtexe/Zoe.git
    cd Zoe
    ```

3.  Install dependencies:

    ``` bash
    npm install
    ```

4.  Create `config.env` and configure `SESSION` and the other settings
    you need.

5.  Start Zoe:

    ``` bash
    npm start
    ```

6.  Configure your server's process manager and restart policy so the
    bot can recover after a reboot. The repository's npm start script
    already invokes PM2; avoid creating conflicting duplicate PM2
    processes.

### Hosting panels --- Pterodactyl and similar

1.  Create a server with a compatible Node.js 20+ runtime.

2.  Upload or clone the Zoe repository into the server's working
    directory.

3.  Run `npm install`.

4.  Add the required environment variables in the panel.

5.  Set the startup command to:

    ``` bash
    npm start
    ```

6.  Start the server and inspect the console output.

Ensure the panel's process manager does not conflict with the PM2
process launched by the repository's start script.

------------------------------------------------------------------------

## Configuration Reference

The following variables are read by the current `config.js`. Some
integrations also read provider-specific variables.

  ------------------------------------------------------------------------
  Variable                 Purpose                 Default / notes
  ------------------------ ----------------------- -----------------------
  `SESSION`                WhatsApp session        A default value exists
                           credentials             in `config.js`;
                                                   configure your own
                                                   session.

  `MODE`                   Bot operating mode      `private`

  `SUDO`                   Owner / privileged user Repository-defined
                           numbers                 default exists.

  `HANDLER`                Command handler         `null`
                           configuration           

  `LANGUAGE`               Bot response language   `english`

  `DATABASE_URL`           Database connection     Defaults to local
                                                   `./database.db` SQLite;
                                                   a PostgreSQL URL
                                                   selects PostgreSQL.

  `ERROR_MSG`              Error-message setting   `false`

  `LOG_MSG`                Message logging setting `false`

  `READ_CMD`               Command-read setting    `false`

  `READ_MSG`               Message-read setting    `false`

  `ANTI_DELETE`            Anti-delete setting     `false`

  `WARN_COUNT`             Warning count setting   `3`

  `BOT_INFO`               Bot information /       Repository-defined
                           branding                default.

  `AUDIO_DATA`             Audio metadata /        Repository-defined
                           branding                default.

  `STICKER_PACKDATA`       Sticker pack metadata   Repository-defined
                                                   default.

  `HEROKU_APP_NAME`        Heroku management       Optional unless using
                           integration             that integration.

  `HEROKU_API_KEY`         Heroku management       Keep private.
                           integration credential  

  `RAILWAY_API`            Railway management      `RAILWAY_API_KEY` is
                           integration credential  also accepted.

  `RAILWAY_PROJECT_NAME`   Railway project name    `PROJECT_NAME` is also
                                                   accepted.

  `KOYEB_API`              Koyeb management        `KOYEB_API_KEY` is also
                           integration credential  accepted.

  `KOYEB_APP_NAME`         Koyeb app name          `KOYEB_NAME` is also
                                                   accepted.

  `RENDER_API`             Render management       `RENDER_API_KEY` is
                           integration credential  also accepted.

  `RENDER_APP_NAME`        Render app name         `RENDER_NAME` is also
                                                   accepted.
  ------------------------------------------------------------------------

Only set provider-specific credentials when you need the corresponding
integration. Never commit real secrets to Git.

## Dependencies

The current `package.json` includes the following principal runtime
packages:

-   **Node.js / npm** --- JavaScript runtime and package management.
-   **`@whiskeysockets/baileys`** --- WhatsApp Web connection.
-   **`express`** --- HTTP server and status endpoint.
-   **`pm2`** --- Process management used by the start script.
-   **`sequelize`** --- Database ORM.
-   **`sqlite3`** --- SQLite database driver.
-   **`dotenv`** and **`badan-ser`** --- Environment/configuration
    loading.
-   **`ffmpeg-static`** and **`fluent-ffmpeg`** --- Media processing
    support.
-   **`puppeteer`** --- Browser automation support.
-   **`sharp`**, **`jimp`**, and **`node-webpmux`** --- Image and
    sticker-related processing.
-   **`cheerio`**, **`axios`**, and other utility packages --- HTTP and
    content-processing tasks.

Use the repository's `package.json` and lockfile as the authoritative
dependency list for the version you deploy.

## Common Use Cases

-   Running a WhatsApp automation bot for a personal or community
    account.
-   Extending bot behavior through the repository's plugin structure.
-   Hosting the bot continuously on a VPS or compatible Node.js service.
-   Running the bot on an Android device through the Termux setup
    script.
-   Using a managed hosting provider while keeping configuration in
    environment variables.

## Health Check

The Express application exposes a root route:

``` bash
curl https://YOUR-HOST/
```

A successful response is:

``` text
Bot is running
```

The application listens on `process.env.PORT` when provided by the
hosting platform, otherwise it uses port `3000`.

## Why Deploy Zoe-XD?

Deploying Zoe-XD on a host that remains available lets the WhatsApp
client run without keeping a personal computer open. The repository
supports several deployment environments, from Android Termux to Linux
servers and managed Node.js platforms. Its environment-based
configuration and database support make it possible to adapt the
installation to different hosting setups.

Choose a host with persistent storage if you rely on local SQLite data
or locally stored session state. Review the provider's restart, sleep,
storage, and resource policies before selecting a free plan.

## Troubleshooting

### The service starts and then exits

-   Check the deployment logs for dependency installation or runtime
    errors.
-   Confirm that the configured Node.js version is compatible.
-   Verify that `SESSION` is configured correctly.
-   Check that the hosting panel is not starting a second process that
    conflicts with PM2.

### SQLite installation fails

SQLite uses a native Node.js module. Some environments need a compiler
toolchain to build it. The Render Blueprint explicitly rebuilds
`sqlite3` from source. On other platforms, inspect the install log and
install the platform's required build tools.

### The bot loses data after a redeploy

Some hosts use ephemeral filesystems. Local SQLite data and local
session files may be lost when the service is replaced. Use persistent
storage or a supported external database where appropriate.

### The health check fails

Open the service root URL and check the application logs. The current
application responds at `/`, not `/health`.

### Termux installation

Run the official installer command in Termux:

``` bash
bash <(curl -fsSL https://zoe-xd.vercel.app/setup.sh)
```

If the installer reports an error, keep the complete terminal output so
the issue can be diagnosed.

------------------------------------------------------------------------

## Development

Contributions and improvements should be made against a fork or branch.

``` bash
git clone https://github.com/Xirtexe/Zoe.git
cd Zoe
npm install
```

Before submitting changes, verify the relevant bot behavior and
deployment configuration. Do not include session credentials, API keys,
database passwords, or personal WhatsApp data in commits or issue
reports.

## Links

-   [GitHub repository](https://github.com/Xirtexe/Zoe)
-   [Fork Zoe-XD](https://github.com/Xirtexe/Zoe/fork)
-   [Website and session generator](https://zoe-xd.vercel.app/)
-   [Deployment dashboard](https://zoe-xd.vercel.app/deploy)
-   [Plugin library](https://zoe-xd.vercel.app/plugins)
-   [Termux setup script](https://zoe-xd.vercel.app/setup.sh)

------------------------------------------------------------------------

**Zoe-XD** --- Open tooling for always-on conversations.
