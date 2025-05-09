# System Patterns

This file documents recurring patterns and standards used in the project.

## Coding Patterns
* TypeScript-based development
* Modular parser system with interface-based design (IParser interface)
* Error handling and logging through ApplicationInsights
* Caching implementation using node-cache

## Architectural Patterns
* MVC-like structure (parsers as models, views in views/, Express routes as controllers)
* Parser abstraction through interfaces (IParser, IMenuItem)
* Modular restaurant parsers in separate directories (patronka/, sevcenkova/, einpark/)
* Static asset management for frontend resources

## Testing Patterns
* Mocha test framework implementation
* ESLint for code quality enforcement
* TypeScript compilation checks as part of testing process
* Separate test directory with sample data

[2025-05-09 13:50:13] - Initial Memory Bank creation