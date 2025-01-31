# Benchmark Histogram

[live page](http://scottopell.com/benchmark-histogram/)

Recommended tooling:
- https://pnpm.io
    - corepack is a nice way to set this up: `corepack enable` on any recent
      node version (only needed once)
    - This has a `packageManagerUrl` configured in `package.json` to
      auto-configure corepack
- https://volta.sh
    - node version management, should automatically swap node versions depending
      on the project
    - `corepack enable --install-directory ~/.volta/bin` is useful to make
      corepack override volta's over-eager package-manager-management

regular old NPM works too.

```
npm run dev
```

