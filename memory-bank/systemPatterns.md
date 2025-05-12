# System Patterns

This file documents recurring patterns and standards used in the project.

## Coding Patterns

* TypeScript-based development
* Modular parser system with interface-based design (IParser interface)
* Advanced web scraping using Puppeteer
* Error handling and logging through ApplicationInsights
* Caching implementation using node-cache
* Extensive debug logging for parser operations
* Session and cookie management patterns

## Architectural Patterns

* MVC-like structure (parsers as models, views in views/, Express routes as controllers)
* Parser abstraction through interfaces (IParser, IMenuItem)
* Modular restaurant parsers in separate directories (patronka/, sevcenkova/, einpark/)
* Static asset management for frontend resources
* Multi-stage parsing pattern (session initialization -> data fetching -> parsing)
* API interaction patterns with proper error handling

## Testing Patterns

* Mocha test framework implementation
* ESLint for code quality enforcement
* TypeScript compilation checks as part of testing process
* Separate test directory with sample data
* Debug logging for parser validation

[2025-05-09 13:50:13] - Initial Memory Bank creation
[2025-05-10 14:21:00] - Updated with new parser patterns and architectural improvements
[2025-05-12 11:24:25] - Cheerio upgraded from 0.22.0 to 1.0.0. All parser imports must use `import * as cheerio from "cheerio";` for compatibility with Cheerio 1.x and CommonJS output. Default imports (`import cheerio from "cheerio";`) will break at runtime.
[2025-05-12 11:24:25] - node-fetch downgraded to 2.x to ensure CommonJS compatibility for all parsers. node-fetch 3.x+ is ESM-only and will not work with CommonJS output.
[2025-05-12 11:24:25] - When upgrading dependencies in the future, always verify module type (ESM vs CJS) and adjust import style and/or dependency version accordingly.
