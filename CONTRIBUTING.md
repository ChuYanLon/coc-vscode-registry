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

For plugins with a **local language server** (TypeScript source in `server/` subdirectory, not a published npm package):

```jsonc
{
  "name": "vscode-css-peek",
  "type": "pure-lsp",
  "convert": [
    {
      "type": "language-client",
      "server": {
        "kind": "module",
        "package": "../server/out/server"     // relative path to compiled server
      },
      "languages": ["css", "html"],
      "initializationOptions": "{ stylesheets: [], peekFromLanguages: [\"html\"], peekToLinkedOnly: false }"
    },
    {
      "type": "source",
      "transforms": ["import-mapping"],
      "keepDeps": { "vscode-languageserver": "^8.1.0" }
    }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `minPluginVersion` | ❌ | Minimum coc-vscode-loader version. **Must be `"1.4.2"` for local servers**, **`"1.4.3"` for module-kind servers with `args`**, **`"1.4.5"` for `server.patches`**, **`"1.5.0"` for `goPackages`/`cargoPackages`**. |
| `pipPackages` | ❌ | Python pip dependencies, e.g. `["ansible-lint"]` |
| `goPackages` | ❌ | Go packages, pipeline runs `go install` to compile to `server/`, e.g. `["golang.org/x/tools/gopls@latest"]` |
| `cargoPackages` | ❌ | Rust crates, pipeline runs `cargo install --root` then copies binary to `server/`, e.g. `[{ "crate": "nil", "binary": "nil" }]` |
| `serverBinary` | ❌ | Binary LSP download config. See README. |
| `convert` | ❌ | Conversion steps. See loader's CONTRIBUTING.md for full reference. |
| `source.patches` | ❌ | Plugin-level text replacements (v1.4.2+). Executed after generic replacements. `[{ find: "regex", replace: "text" }]` |
| `excludeDeps` | ❌ | Exclude unwanted dependencies (v1.5.7+). `["dep1", "@scope/"]` supports prefix matching |
| `keepDeps` | ❌ | Preserve necessary dependencies. Array (auto-resolve version) or object `{ name: "ver" }` (manual specification) |

**Local server requirements** (`server.package` starts with `./` or `../`):
- Source repo must have a `server/` directory with its own `package.json` + `tsconfig.json`
- `minPluginVersion: "1.4.2"` (required for local server support in converter + pipeline)
- Server code compiled automatically by `esbuild.mjs` at build time
- Pipeline copies `server/` from source to build directory before `npm install`

**Direct-API plugins with source patches** (`source.patches`, v1.4.2+):
- Suitable for plugins that directly use VS Code API (non-LSP), such as Code Runner, Live Server
- Applies text replacements to converted source code via the `patches` field to fix API differences
- Patches are executed after converter generic replacements (`.fileName` → `Uri.parse()`, `workspace.workspaceFolders` guard, etc.)
- Example (vscode-code-runner, simplified):
```json
{
  "name": "vscode-code-runner",
  "type": "direct-api",
  "convert": [{
    "type": "source",
    "transforms": ["import-mapping", "class-to-factory"],
    "patches": [
      { "find": "vscode\\.window\\.createTerminal\\(\"Code\"\\)", "replace": "await vscode.window.createTerminal({ name: 'Code' })" },
      { "find": "vscode\\.env\\.shell", "replace": "(process.env.SHELL || '/bin/bash')" },
      { "find": "this\\._outputChannel\\.show\\(", "replace": "this._outputChannel.dispose(); this._outputChannel = vscode.window.createOutputChannel(\"Code\"); " }
    ]
  }]
}
```

**Server patches** (`server.patches`, v1.4.5+):
- Applies text replacements to compiled JS files of a local server, after `tsc` compilation and before `esbuild` bundling
- Suitable for fixing server-side behavior (e.g. disabling pull diagnostics, injecting event hooks)
- Example: `{ "file": "eslintServer.js", "find": "connection\\.listen\\(\\);", "replace": "connection.listen();\\ndocuments.onDidOpen(...)..." }`
- Set `minPluginVersion: "1.4.5"` when using `server.patches`
- See the loader repository's [AGENTS.md](https://github.com/coc-plugin/coc-vscode-loader/blob/main/AGENTS.md#%E6%8F%92%E4%BB%B6%E7%BA%A7%E6%96%87%E6%9C%AC%E8%A1%A5%E4%B8%81-patches-source-step)

**Per-platform assets** (`targetAssets`, v1.5.0+):
- When binary releases use non-standard platform naming (e.g. clangd uses `mac`/`windows` instead of `darwin`/`win32`), use `targetAssets` to define the asset file and binaryPath for each platform
- Example: `[ { "platform": "darwin", "file": "clangd-mac-{{version}}.zip", "binaryPath": "clangd_{{version}}/bin/clangd" } ]`
- Set `minPluginVersion: "1.5.0"` when using `targetAssets`
- See the loader repository's [AGENTS.md](https://github.com/coc-plugin/coc-vscode-loader/blob/main/AGENTS.md#targetassets-%E5%AD%97%E6%AE%B5v150)

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
npm run test:smoke           # Converts all 134 entries, validates output
```

4. Submit a PR.

> ⚠️ If the converter cannot handle your plugin, do not add only a registry entry — you must also extend the converter in [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader). Both changes are required; one without the other will not work.
