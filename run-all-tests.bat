@echo off
REM Run standard npm test (includes lint and mocha via package.json)
npm test

REM Run TypeScript tests directly with ts-mocha for ES module compatibility
npx ts-mocha test/**/*.test.ts --exit

pause
