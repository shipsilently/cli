# @shipsilently/cli

Command-line interface for [ShipSilently](https://shipsilently.com) — auth
validation, project/environment discovery, and API key bootstrap.

> **This repository is an automated, read-only mirror.** Source lives in the
> ShipSilently monorepo and is synced here on every change. Please do not open
> pull requests against this repo — they will be overwritten on the next sync.
> For issues or contributions, contact `hello@shipsilently.com`.

## Install

```bash
npm install -g @shipsilently/cli
# or run without installing:
npx @shipsilently/cli whoami
```

This installs the `ship` command.

## Usage

```bash
ship whoami            # validate your token and show the current account
ship projects          # list projects
ship envs              # list environments
ship flags             # list flags
```

Set your token via `SHIPSILENTLY_TOKEN` (and optionally `SHIPSILENTLY_API_URL`).
Run `ship --help` for the full command list.

## License

[MIT](./LICENSE) © ShipSilently
