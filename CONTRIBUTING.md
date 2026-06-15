# Contributing

## Adding a new plugin

**This repository holds registry data only. The converter (parser) lives in [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader).**

Adding a new plugin requires both repos to work together. First read [`../CONTRIBUTING.md`](../CONTRIBUTING.md) to understand the full workflow, then add data here:

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
# Schema validation (run from coc-vscode-loader root)
cd ..
npm test                    # Includes registry-validation.test.ts (12 checks)

# Or manual check
python3 -c "import json; json.load(open('coc-vscode-registry/registry.json'))"
```

3. Add converter tests if needed. Run the smoke test to verify your entry works:

```bash
cd ../converter
npm run test:smoke           # Converts all 112 entries, validates output
```

4. Submit a PR.

> ⚠️ If the converter cannot handle your plugin, do not add only a registry entry — you must also extend the converter in [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader). Both changes are required; one without the other will not work.
