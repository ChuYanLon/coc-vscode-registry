# coc-vscode-registry

Package registry & migration documentation for [coc-vscode-loader](https://www.npmjs.com/package/coc-vscode-loader).

## Registry

[`registry.json`](./registry.json) — list of available VS Code extensions that can be loaded via [coc-vscode-loader](https://github.com/coc-plugin/coc-vscode-loader).

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
