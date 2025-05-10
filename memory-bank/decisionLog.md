# Decision Log

This file records architectural and implementation decisions made during the project lifecycle.

## Initial Decisions

* TypeScript Selection
  - Decision: Use TypeScript as the primary development language
  - Rationale: Type safety, better maintainability, and modern JavaScript features
  - Implementation: All source files use .ts extension, strict TypeScript configuration

* Parser Interface Design
  - Decision: Create modular parser system with IParser interface
  - Rationale: Allows easy addition of new restaurant parsers and maintains consistency
  - Implementation: Each restaurant implements IParser interface for menu fetching

* Directory Structure
  - Decision: Organize parsers by location (patronka/, sevcenkova/, einpark/)
  - Rationale: Logical grouping of restaurants by physical location
  - Implementation: Separate directories for each area's restaurants

* Testing Framework
  - Decision: Use Mocha for testing with TypeScript support
  - Rationale: Well-established testing framework with good TypeScript integration
  - Implementation: Test directory with sample data and TypeScript test files

## Recent Decisions

* Advanced Web Scraping Implementation
  - Decision: Integrate Puppeteer for complex menu fetching
  - Rationale: Some restaurant websites require JavaScript execution and session management
  - Implementation: Implemented in bigger.ts with session cookie handling and API interaction

* Enhanced Debug Logging
  - Decision: Add comprehensive debug logging throughout parser system
  - Rationale: Improve troubleshooting and maintenance capabilities
  - Implementation: Console logging with clear prefixes and detailed state information

[2025-05-09 13:50:24] - Initial Memory Bank creation and documentation of existing architectural decisions
[2025-05-10 14:22:00] - Added recent decisions regarding web scraping and logging improvements

## 2025-10-05 14:29 - Cheerio Library Upgrade Analysis

### Decision
Need to upgrade Cheerio from v0.22.0 to v1.0.0 to address a high-severity ReDoS vulnerability.

### Impact Analysis
1. Wide usage found across parser modules:
   - Core HTML parsing functionality using `cheerio.load(html)`
   - Extensive use of jQuery-style selectors
   - Type definitions from `@types/cheerio`
   - Mixed import styles (`import cheerio` vs `import * as cheerio`)

### Required Changes
1. Dependency Updates:
   ```diff
   - "cheerio": "^0.22.0"
   + "cheerio": "^1.0.0"
   - "@types/cheerio": "^0.22.31"
   + "@types/cheerio": "^1.0.0"
   ```

### Upgrade Plan
1. Sequential Testing Phases:
   - Update dependencies
   - Run existing test suite
   - Test each parser individually
   - Monitor system behavior in staging
   - Deploy to production with rollback plan

### Risk Assessment
1. Potential Issues:
   - HTML parsing behavior changes
   - Type definition updates may require code changes
   - Selector compatibility issues
   - Integration impact on menu parsing accuracy

### Implementation Strategy
1. Staged Approach:
   - Create test branch
   - Update dependencies
   - Verify parser functionality
   - Address any type/selector issues
   - Comprehensive testing before deployment

### Rationale
- Critical security vulnerability needs to be addressed
- Cheerio 1.0.0 maintains core API compatibility
- Testing strategy minimizes risk of breaking changes