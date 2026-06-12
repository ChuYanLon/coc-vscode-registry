# coc-vscode-registry

Package registry & migration documentation for [coc-vscode-loader](https://www.npmjs.com/package/coc-vscode-loader).

## Registry

[`registry.json`](./registry.json) — list of available VS Code extensions that can be loaded via [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader).

### Entry fields

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
| `minPluginVersion` | ❌ | Minimum `coc-vscode-loader` version required (e.g. `"1.1.2"`). Entries with `minPluginVersion > current version` are hidden from users. |
| `serverBinary` | ❌ | Auto-download a binary language server from GitHub Releases. See [serverBinary](#serverbinary-config) below. |

### serverBinary config

```json
"serverBinary": {
  "repo": "denoland/deno",
  "asset": "deno-{{rust-target}}.zip",
  "binaryPath": "deno",
  "args": ["lsp"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `repo` | ✅ | GitHub repo for releases (e.g. `"denoland/deno"`) |
| `asset` | ✅ | Asset filename template. Variables: `{{version}}`, `{{platform}}` (darwin/linux/win32), `{{arch}}` (x64/arm64), `{{rust-target}}` (aarch64-apple-darwin) |
| `binaryPath` | ❌ | Relative path inside the archive, e.g. `"bin/lua-language-server"`. Falls back to extracting from asset name. |
| `args` | ❌ | CLI arguments for the binary LSP (e.g. `["lsp"]` for `deno lsp`). When set, the pipeline uses `{ command, args }` instead of `{ module }` for LanguageClient. |

## Documentation

All migration reference docs are in [`docs/`](./docs/):

| File | Purpose |
|------|---------|
| `vscode-vs-coc-api-diff.md` | Full API diff (vscode vs coc) |
| `mapping-quickref.md` | Fast bidirectional API lookup |
| `import-mapping.md` | Import name mapping: `vscode` → `coc.nvim` |
| `provider-signature-card.md` | Provider registration signatures side-by-side |
| `pattern-migration-examples.md` | Migration code examples for common patterns |
| `manifest-activation-mapping.md` | `package.json` / activationEvents mapping |
| `vscode-api-feasibility.md` | Feasibility analysis of porting vscode APIs to coc |
| `converter-design-v2.md` | Converter architecture + bridge preset system |
| `volar-migration-guide.md` | Volar (Vue) migration case study |

## Usage

```bash
# coc-vscode-loader fetches the registry from this repository
:CocCommand loader.updateRegistry
```
