# Contributing

## Adding a new plugin to the registry

Edit [`registry.json`](./registry.json) and add a new entry:

```jsonc
{
  "name": "plugin-name",
  "displayName": "Plugin Display Name",
  "description": "What it does",
  "type": "pure-lsp",         // "ts-bridge", "pure-lsp", or "direct-api"
  "source": {
    "type": "github",         // or "npm"
    "repo": "owner/repo",
    "subdir": "path/to/vscode-extension"  // optional
  },
  "url": "https://github.com/owner/repo",
  "languages": ["lang1", "lang2"],
  "categories": ["Category"]
}
```

| `minPluginVersion` | ❌ | Minimum coc-vscode-loader version, e.g. `"1.1.2"` |
| `pipPackages` | ❌ | Python pip dependencies, e.g. `["ansible-lint"]` |
| `serverBinary` | ❌ | Binary LSP download config. See README for fields. |

Then open a Pull Request.

**Note:** Run `python3 -c "import json; json.load(open('registry.json'))"` to validate your entry before committing.

## Documentation improvements

Docs are in [`docs/`](./docs/). Edit the relevant `.md` file and submit a PR.
