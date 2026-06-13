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
| `pipPackages` | ❌ | Python packages to install via pip during build, e.g. `["ansible-lint"]`. Used by plugins with Python dependencies. |
| `serverBinary` | ❌ | Auto-download a binary language server from GitHub Releases. See [serverBinary](#serverbinary-config) below. |
| `convert` | ❌ | v2.0 config-driven conversion steps. Array of step objects describing how to transform the extension. See [converter-design-v2.md](docs/converter-design-v2.md). |

### convert step fields

Each `convert` step is an object with a `type` field. Common fields:

| Field | Applies to | Description |
|-------|-----------|-------------|
| `type` | all | `"language-client"` \| `"source"` \| `"bridge"` \| `"mark-unsupported"` |
| `verbose` | `language-client`, `source` | Enable debug logging in generated code |

#### language-client step

```json
{
  "type": "language-client",
  "server": {
    "kind": "module",
    "package": "@tailwindcss/language-server",
    "entry": "bin",
    "binName": "tailwindcss-language-server"
  },
  "languages": ["css", "html"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `server.kind` | ✅ | `"module"` (npm package) or `"binary"` (downloaded binary) |
| `server.package` | ✅ | npm package name |
| `server.entry` | ❌ | `"main"` (default) or `"bin"`. `"bin"` resolves the package's `bin` field. Falls back to `require.resolve('pkg/package.json')` when the package has no `main` field. |
| `server.binName` | ❌ | When `entry: "bin"` and package has multiple bin entries, pick a specific one by name (e.g. `"tailwindcss-language-server"`). Requires `minPluginVersion: "1.2.2"`. |
| `languages` | ✅ | Language IDs for document selector |

#### source step

```json
{
  "type": "source",
  "transforms": ["import-mapping"],
  "entry": "src/extension.ts",
  "keepDeps": ["lodash"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `transforms` | ✅ | Array of transforms: `import-mapping`, `class-to-factory`, `provider-register`, `enum-offset`, `strip-volar`, `language-client` |
| `entry` | ❌ | Entry point for esbuild (default: auto-detected) |
| `activationEvents` | ❌ | Override activation events (only without language-client) |
| `keepDeps` | ❌ | Dependencies to keep from the original package.json. Array (auto-resolve version) or object (manual version). |

#### bridge step

```json
{
  "type": "bridge",
  "preset": "ts-bridge"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `preset` | ✅ | Preset name (currently only `"ts-bridge"`) |

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
| `asset` | ✅ | Asset filename template. Variables: `{{version}}`, `{{platform}}` (darwin/linux/win32), `{{arch}}` (x64/arm64), `{{raw-arch}}` (aarch64/x86_64), `{{rust-target}}` (aarch64-apple-darwin). Supported formats: `.zip`, `.tar.gz`, `.gz` (single file), or raw binary (no extension). Raw binaries are moved directly to server dir. |
| `binaryPath` | ❌ | Relative path inside the archive, e.g. `"bin/lua-language-server"`. For raw binaries, this is the output filename. Supports template variables. |
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
