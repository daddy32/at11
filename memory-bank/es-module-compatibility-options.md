# Options to Resolve Chai ESM/CommonJS Warning

## Option 1: Downgrade Chai to v4.x (Recommended for CommonJS)

**Steps:**
1. Uninstall current Chai:
   ```
   npm uninstall chai
   ```
2. Install Chai v4.x:
   ```
   npm install chai@4
   ```
3. (Optional) Update @types/chai to match:
   ```
   npm install --save-dev @types/chai@4
   ```
4. No code changes required; all imports/require will work as before.
5. Run your tests to confirm the warning is gone.

**Pros:**
- Easiest and safest fix
- No codebase changes
- Maintains CommonJS compatibility

**Cons:**
- Uses older version of Chai (may lack latest features)

---

## Option 2: Migrate Project to ESM

**Steps:**
1. Update `tsconfig.json`:
   - Change `"module": "commonjs"` to `"module": "ESNext"` or `"NodeNext"`
2. Update `package.json`:
   - Add `"type": "module"` at the top level
3. Update all import/export statements:
   - Use only `import`/`export` syntax (no `require` or `module.exports`)
   - Ensure all dependencies support ESM
4. Rename entry points and test files to `.mjs` if needed (Node.js ESM requirement)
5. Update test runner config (Mocha/ts-mocha) to support ESM:
   - Use `mocha --loader ts-node/esm` or similar
6. Remove any CommonJS-specific code
7. Run your tests and fix any ESM-related issues

**Pros:**
- Modern, future-proof
- Can use latest ESM-only libraries

**Cons:**
- Requires codebase-wide changes
- May break some dependencies
- More complex migration

---

**Summary:**
- **Downgrade Chai**: Quick, low-risk, keeps CommonJS.
- **Migrate to ESM**: Modern, but requires significant effort.