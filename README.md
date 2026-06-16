# coc-vscode-registry

[![website](https://img.shields.io/badge/🌐_Browse_Registry-coc--plugin.github.io-blue?style=for-the-badge)](https://coc-plugin.github.io/coc-vscode-registry/)

Browse and install VS Code extensions on **coc.nvim** — search, filter, and copy install commands.

![Registry preview](https://cdn.jsdelivr.net/gh/coc-plugin/coc-vscode-registry@main/assets/registry-preview.png)

---

Package registry data for [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader).

## Files

| File | Purpose |
|------|---------|
| [`registry.json`](./registry.json) | Available VS Code extensions that can be loaded via coc-vscode-loader |
| [`presets.json`](./presets.json) | Bridge preset definitions (ts-bridge) |

## registry.json entry fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Unique package identifier |
| `displayName` | ✅ | Human-readable name |
| `description` | ✅ | Short description |
| `type` | ✅ | `"pure-lsp"` \| `"ts-bridge"` \| `"direct-api"` \| `"snippets"` |
| `source` | ✅ | `{ type: "github", repo: "org/repo", subdir?: "path" }` |
| `url` | ✅ | Project homepage |
| `languages` | ✅ | Language IDs this plugin supports |
| `categories` | ✅ | Categories for filtering (e.g. `"LSP"`, `"Snippets"`) |
| `convert` | ✅ | Array of conversion steps. See [coc-vscode-loader/CONTRIBUTING.md](../CONTRIBUTING.md) |
| `minPluginVersion` | ❌ | Minimum coc-vscode-loader version (semver, e.g. `"1.2.2"`). **`"1.4.2"` for local servers**, **`"1.4.3"` for module-kind servers with `args`**, **`"1.4.5"` for `server.patches`** |
| `pipPackages` | ❌ | Python dependencies for pip install (`["ansible-lint"]`) |
| `serverBinary` | ❌ | Auto-download a binary language server from GitHub Releases |

### convert step types

| Type | Description |
|------|-------------|
| `language-client` | Generate a LanguageClient entry point for an LSP server. Supports both npm packages (`"package": "some-lsp"`) and **local servers** (`"package": "../server/out/server"`). Local servers auto-compile `server/` TypeScript at build time. |
| `source` | Apply AST transforms to source files |
| `bridge` | Generate bridge code (e.g. ts-bridge for Volar-like plugins) |
| `mark-unsupported` | Comment out unsupported API calls |
| `snippets` | Copy snippet files and generate empty entry for pure snippet extensions |

#### language-client step fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | ✅ | `"language-client"` |
| `server.kind` | ✅ | `"module"` or `"binary"` |
| `server.package` | ✅ | npm package name or **relative path** (`"../server/out/server"`) for local servers |
| `server.entry` | ❌ | `"main"` or `"bin"` (npm packages only) |
| `server.binName` | ❌ | Specific bin entry name for packages with multiple bins |
| `server.args` | ❌ | CLI arguments for the server (v1.4.3+). Supports `{dir}` and `{pluginDir}` placeholders for module kind |
| `server.patches` | ❌ | Post-compilation text patches for server output files (v1.4.5+). Array of `{ file, find, replace }`. Applied after tsc compilation, before esbuild bundle |
| `languages` | ✅ | Language IDs to associate with this server |
| `initializationOptions` | ❌ | JS object passed to LanguageClient during initialization |
| `multRoot` | ❌ | Start one client per workspace folder |
| `id` | ❌ | Override the LanguageClient id (defaults to plugin name) |

### serverBinary config

| Field | Required | Description |
|-------|----------|-------------|
| `repo` | ✅ | GitHub repo for releases (e.g. `"denoland/deno"`) |
| `asset` | ✅ | Asset filename template with `{{version}}`, `{{platform}}`, `{{arch}}` etc. |
| `binaryPath` | ❌ | Relative path inside archive, or output filename for raw binaries |
| `args` | ❌ | CLI arguments for the binary LSP (e.g. `["lsp"]`). For module-kind servers (v1.4.3+), use `server.args` in the `language-client` step instead |

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

> 📖 Migration docs, API mapping references, and converter design: [`coc-vscode-loader/docs`](https://github.com/coc-plugin/coc-vscode-loader/tree/main/docs)
