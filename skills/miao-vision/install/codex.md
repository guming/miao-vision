# Install Miao Vision Plugin for Codex

## 1. Install the plugin (recommended)

Install `miao-vision-plugin.zip` using the Codex plugin installation surface,
or load the repository root as a local plugin during development.

The standalone Skill remains available as a temporary compatibility channel:

```bash
npx skills add miaoshou-dev/miao-vision --global --agent codex --yes
```

## 2. Shared CLI

On first use, Miao Vision checks `MIAO_VISION_HOME`, then
`~/.miao-vision/bin/miao-viz`, then `PATH`. If none is compatible, approve the
request to download the matching release binary into the shared user directory.
Uninstalling or upgrading the plugin does not remove the CLI.

## 3. Restart Codex

Restart Codex or open a new thread.

## 4. Use

```text
Use miao-vision to analyze ~/data/sales.csv and generate an HTML visualization report.
```

Data remains local. PDF browser dependencies are installed separately only
when requested. Fully removing the shared CLI requires deleting
`~/.miao-vision`.
