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
| `minPluginVersion` | ❌ | Minimum coc-vscode-loader version. **Must be `"1.4.2"` for local servers**, **`"1.4.3"` for module-kind servers with `args`**, **`"1.4.5"` for `server.patches`**. |
| `pipPackages` | ❌ | Python pip dependencies, e.g. `["ansible-lint"]` |
| `serverBinary` | ❌ | Binary LSP download config. See README. |
| `convert` | ❌ | Conversion steps. See loader's CONTRIBUTING.md for full reference. |

**Local server requirements** (`server.package` starts with `./` or `../`):
- Source repo must have a `server/` directory with its own `package.json` + `tsconfig.json`
- `minPluginVersion: "1.4.2"` (required for local server support in converter + pipeline)
- Server code compiled automatically by `esbuild.mjs` at build time
- Pipeline copies `server/` from source to build directory before `npm install`

**Server patches** (`server.patches`, v1.4.5+):
- 对 local server 编译后的 JS 文件做文本替换，在 `tsc` 编译后、`esbuild` 打包前执行
- 适用于修复 server 端 behavior（如禁用 pull diagnostics、注入事件钩子等）
- 示例：`{ "file": "eslintServer.js", "find": "connection\\.listen\\(\\);", "replace": "connection.listen();\\ndocuments.onDidOpen(...)..." }`
- 使用 `server.patches` 时设置 `minPluginVersion: "1.4.5"`
- 详见 loader 仓库的 [AGENTS.md](https://github.com/coc-plugin/coc-vscode-loader/blob/main/AGENTS.md#%E6%8F%92%E4%BB%B6%E7%BA%A7%E6%96%87%E6%9C%AC%E8%A1%A5%E4%B8%81-patchessource-step)

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
npm run test:smoke           # Converts all 114 entries, validates output
```

4. Submit a PR.

> ⚠️ If the converter cannot handle your plugin, do not add only a registry entry — you must also extend the converter in [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader). Both changes are required; one without the other will not work.
