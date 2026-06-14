# coc-vscode-registry

[![website](https://img.shields.io/badge/🌐_Browse_Registry-coc--plugin.github.io-blue?style=for-the-badge)](https://coc-plugin.github.io/coc-vscode-registry/)

Package registry data for [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader).

## Files

| File | Purpose |
|------|---------|
| [`registry.json`](./registry.json) | Available VS Code extensions that can be loaded via coc-vscode-loader |
| [`index.html`](./index.html) | Registry website (GitHub Pages) |
| [`presets.json`](./presets.json) | Bridge preset definitions (ts-bridge) |

## registry.json entry fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Unique package identifier |
| `displayName` | ✅ | Human-readable name |
| `description` | ✅ | Short description |
| `type` | ✅ | `"pure-lsp"` \| `"ts-bridge"` \| `"direct-api"` |
| `source` | ✅ | `{ type: "github", repo: "org/repo", subdir?: "path" }` |
| `url` | ✅ | Project homepage |
| `languages` | ✅ | Language IDs this plugin supports |
| `categories` | ✅ | e.g. `["LSP"]` |
| `minPluginVersion` | ❌ | Minimum `coc-vscode-loader` version required (e.g. `"1.1.2"`) |
| `pipPackages` | ❌ | Python packages to install via pip, e.g. `["ansible-lint"]` |
| `serverBinary` | ❌ | Auto-download a binary language server from GitHub Releases |
| `convert` | ❌ | Array of conversion step objects describing how to transform the extension |

### convert step types

| Type | Description |
|------|-------------|
| `language-client` | Generate a LanguageClient entry point for an LSP server |
| `source` | Apply AST transforms to source files |
| `bridge` | Generate bridge code (e.g. ts-bridge for Volar-like plugins) |
| `mark-unsupported` | Comment out unsupported API calls |

### serverBinary config

| Field | Required | Description |
|-------|----------|-------------|
| `repo` | ✅ | GitHub repo for releases (e.g. `"denoland/deno"`) |
| `asset` | ✅ | Asset filename template with `{{version}}`, `{{platform}}`, `{{arch}}` etc. |
| `binaryPath` | ❌ | Relative path inside archive, or output filename for raw binaries |
| `args` | ❌ | CLI arguments for the binary LSP (e.g. `["lsp"]`) |

## presets.json

Defines reusable bridge presets (currently only `ts-bridge`):

```json
{
  "ts-bridge": {
    "type": "tsserver-forward",
    "options": {
      "extensions": ["coc-tsserver"],
      "services": ["tsserver"],
      "command": "typescript.tsserverRequest"
    }
  }
}
```

## Website

**[coc-plugin.github.io/coc-vscode-registry](https://coc-plugin.github.io/coc-vscode-registry/)** — search, filter, and copy install commands.

> 📖 Migration docs, API mapping references, and converter design: [`coc-vscode-loader/docs`](https://github.com/coc-plugin/coc-vscode-loader/tree/main/docs)
