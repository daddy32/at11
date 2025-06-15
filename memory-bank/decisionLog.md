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

## 2025-10-05 23:34 - Punycode Deprecation Resolution

### Decision
Implement comprehensive solution to address Node.js punycode module deprecation warning and modernize URL handling.

### Rationale
1. Node.js DEP0040 warning indicates punycode module is deprecated
2. Current Node.js version (16.13.x) is outdated
3. URL handling needs modernization for international character support
4. Existing URL sanitization can be enhanced with modern URL API

### Implementation Strategy
1. Node.js Update:
   - Upgrade to Node.js 18+ for modern URL handling
   - Update package.json engine requirements

2. Dependency Updates:
   - Update axios to v1.6.0+
   - Upgrade node-fetch to v3.0.0+
   - Ensure all dependencies use modern URL handling

3. URL Handling Improvements:
   - Enhance sanitizeUrl with URL API
   - Add URL validation functionality
   - Update menuFetcher.ts with validation checks

### Risk Assessment
1. Potential Impact:
   - URL parsing behavior changes
   - International character handling differences
   - Integration with external services (e.g., scraper API)

2. Mitigation:
   - Comprehensive URL testing suite
   - Staged deployment approach
   - Rollback plan if issues arise

### Success Criteria
- No punycode deprecation warnings
- Proper handling of international characters
- All parsers functioning correctly
- No regression in existing functionality
[2025-05-12 11:24:38] - Decision: Standardize all Cheerio imports to `import * as cheerio from "cheerio";` after upgrading to Cheerio 1.x.
Rationale: Cheerio 1.x uses ESM/CJS dual exports, and default import is not compatible with CommonJS output.
Implementation Details: All parser files updated. Future upgrades must check import style and module type for all dependencies.

[2025-05-12 11:24:38] - Decision: Downgrade node-fetch to 2.x for CommonJS compatibility.
Rationale: node-fetch 3.x+ is ESM-only and breaks with require/dynamic import in CJS projects.
Implementation Details: package.json set to node-fetch 2.6.9. If migrating to ESM in the future, node-fetch 3.x+ can be used.

## 2025-06-02 07:48 - Test Infrastructure Modernization Assessment

### Decision
Complete assessment of Test Infrastructure Modernization Phase 1 implementation and update planning documentation to reflect current reality.

### Implementation Status Analysis
1. **Infrastructure Setup**: 100% complete
   - Test configuration, package scripts, dev dependencies all implemented
   - TestHelper and MockData utilities fully functional

2. **Parser Test Coverage**: 64% complete (9/14 parsers)
   - 5 new tests implemented in standardized structure (dummy, bemi, priatelia, savdoma, foodseason)
   - 4 legacy tests exist but need migration (fajnejedlo, mdvsr, lunchbreak, veglife)
   - 5 parsers still need test implementation

### Rationale
- Accurate documentation essential for project continuity
- Clear roadmap needed for completing remaining 36% of test coverage
- Updated plan enables effective resource allocation for Phase 2

### Implementation Strategy
1. **Immediate**: Update all memory bank documentation with current status
2. **Phase 2 Planning**: Prioritize legacy test migration and remaining parser implementation
3. **Quality Assurance**: Validate current test suite functionality before proceeding

## 2025-06-05 23:20 - FajneJedlo OCR Artifact Removal Enhancement

### Decision
Enhanced the `removeAlergens()` function in [`parserUtil.ts`](parsers/parserUtil.ts:1) to robustly remove OCR artifacts from menu text, specifically targeting patterns like `1:`, `1-`, `1:5`, `1-37`, `1.34` that were not caught by the original regex.

### Problem Analysis
1. **Root Cause**: Original regex `/\s*\d{1,2}[:\-]\s*$/g` only removed simple patterns like `1:` or `1-` but failed on complex patterns like `1:5`, `1-37`, `1.34`
2. **OCR Reality**: Real Tesseract output produces varied artifact patterns including multi-digit combinations with colons, dashes, and dots
3. **Impact**: Menu items displayed with trailing artifacts like "valeriánšalát 1:5" and "citrón 1-37"

### Solution Implementation
1. **Enhanced Regex**: Updated to `/\s*\d{1,2}([:,\-\.]\d+)*\s*$/g` to handle complex patterns
2. **Debug Infrastructure**: Added conditional OCR output logging for troubleshooting
3. **Test Coverage**: Created failing test cases with real OCR data to validate fixes

### Rationale
- OCR artifacts significantly impact user experience by cluttering menu text
- Real-world OCR output varies significantly from simplified test data
- Enhanced pattern matching provides robust artifact removal without breaking existing functionality

### Implementation Details
- Modified `String.prototype.removeAlergens` to handle complex digit-punctuation patterns
- Maintained backward compatibility with existing artifact removal logic
- Added debug logging capability for OCR troubleshooting

## 2025-06-15 20:11 - ES Module/CommonJS Compatibility Warning Resolution

### Decision
Standardize test file import patterns to eliminate experimental warning when loading Chai 5.x ESM via CommonJS require().

### Problem Analysis
1. **Root Cause**: [`veglife.test.ts`](test/unit/patronka/veglife.test.ts:4) uses `const { expect } = require("chai");`
2. **Module Conflict**: Chai 5.x is pure ESM, causing experimental warning with CommonJS require()
3. **Inconsistency**: Other test files use `import { expect } from "chai";` syntax

### Solution Implementation
1. **Single File Fix**: Change line 4 in veglife.test.ts from `require("chai")` to `import { expect } from "chai"`
2. **Audit Confirmation**: Search revealed only one affected file in entire codebase
3. **Configuration Validation**: tsconfig.json already has proper ES module interop settings

### Rationale
- **Immediate Resolution**: Eliminates experimental warning without architectural changes
- **Consistency**: Standardizes import patterns across all test files
- **Low Risk**: Simple syntax change with existing ES module interop support
- **Future-Proof**: Aligns with modern ES module practices

### Implementation Details
- Requires Code mode for actual file modification
- Single line change: `const { expect } = require("chai");` → `import { expect } from "chai";`
- No breaking changes to existing functionality
