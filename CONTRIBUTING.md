# Contributing

## Adding a new plugin

**This repository holds registry data only. The converter (parser) lives in [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader).**

Adding a new plugin requires both repos to work together. First read [coc-vscode-loader/CONTRIBUTING.md](https://github.com/coc-plugin/coc-vscode-loader/blob/main/CONTRIBUTING.md) to understand the full workflow, then add data here:

1. Edit [`registry.json`](./registry.json) with a new entry:

```jsonc
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "description": "What it does",
  "type": "pure-lsp",
  "source": {
    "type": "github",
    "repo": "owner/repo",
    "subdir": "extensions/vscode"
  },
  "url": "https://github.com/owner/repo",
  "languages": ["mylang"],
  "categories": ["LSP"],
  "convert": [
    { "type": "language-client", "server": { "kind": "module", "package": "some-lsp" }, "languages": ["mylang"] },
    { "type": "source", "transforms": ["import-mapping"] }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `minPluginVersion` | ❌ | Minimum coc-vscode-loader version |
| `pipPackages` | ❌ | Python pip dependencies, e.g. `["ansible-lint"]` |
| `serverBinary` | ❌ | Binary LSP download config. See README. |
| `convert` | ❌ | Conversion steps. See loader's CONTRIBUTING.md for full reference. |

2. Validate JSON:

```bash
python3 -c "import json; json.load(open('registry.json'))"
```

3. Submit a PR.

> ⚠️ If the converter cannot handle your plugin, do not add only a registry entry — you must also extend the converter in [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader). Both changes are required; one without the other will not work.
