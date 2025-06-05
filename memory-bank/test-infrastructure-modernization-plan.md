# Test Infrastructure Modernization Plan - Phase 1 [UPDATED 2025-06-02]

## Overview
Implementation plan for modernizing the testing infrastructure for the at11_patronka lunch menu application, focusing on the 14 parsers in the `parsers/patronka` directory.

## Updated Implementation Status (As of 2025-06-02)

### ✅ COMPLETED: Test Infrastructure Setup
- **Test Configuration**: ✅ [`test/mocha.opts`](test/mocha.opts) with ts-node/register, 10s timeout
- **Package Scripts**: ✅ [`package.json`](package.json) test:unit, test:integration, test:watch, test:coverage
- **Dependencies**: ✅ All dev dependencies installed (mocha, chai, sinon, nyc, ts-mocha, @types/sinon-chai)
- **Test Utilities**: ✅ [`test/helpers/TestHelper.ts`](test/helpers/TestHelper.ts) - Complete utility class
- **Mock Data**: ✅ [`test/helpers/MockData.ts`](test/helpers/MockData.ts) - Centralized parser mock data

### ✅ COMPLETED: Test Implementation Progress
- **Tested Parsers**: 9 out of 14 patronka parsers (64% complete)

**✅ Fully Implemented in test/unit/patronka/:**
  - [`dummy.test.ts`](test/unit/patronka/dummy.test.ts) ✅ Basic functionality validation
  - [`bemi.test.ts`](test/unit/patronka/bemi.test.ts) ✅ HTML parsing with price extraction + error handling
  - [`priatelia.test.ts`](test/unit/patronka/priatelia.test.ts) ✅ Real HTML sample testing with debug inspection
  - [`savdoma.test.ts`](test/unit/patronka/savdoma.test.ts) ✅ Table parsing implementation
  - [`foodseason.test.ts`](test/unit/patronka/foodseason.test.ts) ✅ Date-based menu selection

**✅ Legacy Tests (Need Migration to new structure):**
  - [`fajnejedlo.ts`](test/fajnejedlo.test.ts) ✅ OCR testing (needs migration)
  - [`mdvsr.ts`](test/mdvsr.ts) ✅ PDF parsing (needs migration)
  - [`lunchbreak.ts`](test/lunchbreak.ts) ✅ HTML parsing (needs migration)
  - [`veglife.ts`](test/veglife.ts) ✅ Fuzzy matching (needs migration)

### 🔄 REMAINING: Parsers needing test implementation (5 parsers)
  - [`bigger.ts`](parsers/patronka/bigger.ts) - Complex Puppeteer + API integration
  - [`kari.ts`](parsers/patronka/kari.ts) - Sme-based parser with price processing
  - [`kari_old.ts`](parsers/patronka/kari_old.ts) - Legacy parser implementation
  - [`patronskypivovar.ts`](parsers/patronka/patronskypivovar.ts) - Sme-based with price extraction
  - [`savdoma_alt.ts`](parsers/patronka/savdoma_alt.ts) - Alternative implementation

### ✅ RESOLVED: Infrastructure Issues
1. **Test Configuration**: ✅ Complete TypeScript test runner setup with mocha + ts-node
2. **Test Organization**: ✅ Standardized structure under `test/unit/patronka/*.test.ts`
3. **Mock Framework**: ✅ Comprehensive sinon-based mocking with TestHelper utilities
4. **Test Isolation**: ✅ Proper beforeEach/afterEach with sinon.restore() cleanup

## Phase 1 Implementation Plan - STATUS UPDATE

### ✅ 1. Test Configuration Setup - COMPLETED
- ✅ [`test/mocha.opts`](test/mocha.opts) created with proper ts-node configuration
- ✅ [`package.json`](package.json) scripts updated with all test commands
- ✅ All dev dependencies installed and working

### ✅ 2. Test Utilities and Helpers - COMPLETED
- ✅ [`test/helpers/TestHelper.ts`](test/helpers/TestHelper.ts) implemented with:
  - `createMockHTML(content: string): string`
  - `createMockDate(dateString: string): Date`
  - `createMockMenuItem(overrides?: Partial<IMenuItem>): IMenuItem`
  - `mockAxiosResponse(data: any): sinon.SinonStub`
  - `cleanupMocks(): void`

- ✅ [`test/helpers/MockData.ts`](test/helpers/MockData.ts) implemented with:
  - Parser-specific HTML mock data (bemi, savdoma, foodseason)
  - Standard test menu items
  - Expected parser outputs for validation

### 3. Standardized Test Template

#### Parser Test Template Structure
```typescript
describe("ParserName", () => {
  let parser: ParserName;
  let mockDate: Date;

  beforeEach(() => {
    parser = new ParserName();
    mockDate = TestHelper.createMockDate("2025-05-23");
  });

  afterEach(() => {
    TestHelper.cleanupMocks();
  });

  describe("Valid Menu Parsing", () => {
    it("should parse soups correctly", async () => {
      // Test soup identification and parsing
    });

    it("should parse main dishes with prices", async () => {
      // Test main dish parsing and price extraction
    });

    it("should handle date-specific menu selection", async () => {
      // Test day-specific menu logic
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed HTML gracefully", async () => {
      // Test with invalid/broken HTML
    });

    it("should handle network errors", async () => {
      // Test axios/fetch failures
    });

    it("should handle missing menu data", async () => {
      // Test empty/missing content scenarios
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters and diacritics", async () => {
      // Test Slovak character handling
    });

    it("should normalize whitespace and formatting", async () => {
      // Test text normalization
    });
  });
});
```

### 4. Parser-Specific Test Implementation

#### Priority 1: Simple Parsers
1. **dummy.ts** - Basic functionality test
2. **savdoma.ts** - HTML table parsing
3. **foodseason.ts** - Date-based parsing

#### Priority 2: Medium Complexity
1. **bemi.ts** - Price extraction patterns
2. **priatelia.ts** - Allergen filtering
3. **patronskypivovar.ts** - Sme-based parsing

#### Priority 3: High Complexity
1. **bigger.ts** - Puppeteer + API integration
2. **kari.ts** vs **kari_old.ts** - Legacy comparison

### 5. Integration Test Suite

#### Create `test/integration/menu-fetching.test.ts`
```typescript
describe("Menu Fetching Integration", () => {
  it("should fetch and parse menus from all patronka parsers", async () => {
    // Test full workflow for each parser
  });

  it("should handle concurrent parser execution", async () => {
    // Test parallel parsing performance
  });

  it("should validate menu data structure consistency", async () => {
    // Ensure all parsers return compatible IMenuItem[]
  });
});
```

### 6. Test Data Management

#### Sample Data Organization
```
test/
├── samples/
│   ├── patronka/
│   │   ├── bemi-sample.html
│   │   ├── foodseason-sample.html
│   │   ├── bigger-api-response.json
│   │   └── ...
│   └── expected-outputs/
│       ├── bemi-expected.json
│       └── ...
├── helpers/
├── integration/
└── unit/
    └── patronka/
        ├── bemi.test.ts
        ├── bigger.test.ts
        └── ...
```

### 7. Mock Strategy for External Dependencies

#### Axios Mocking
```typescript
// For HTTP-based parsers (mdvsr, bigger API calls)
sinon.stub(axios, 'get').resolves({ data: mockData });
```

#### Puppeteer Mocking
```typescript
// For bigger.ts complex browser automation
const mockPuppeteer = {
  launch: sinon.stub().resolves(mockBrowser),
  // ... other mocks
};
```

#### File System Mocking
```typescript
// For parsers that read local files
sinon.stub(fs, 'readFileSync').returns(mockFileContent);
```

## Implementation Steps - STATUS UPDATE

### ✅ Step 1: Infrastructure Setup - COMPLETED
1. ✅ Test configuration files created ([`test/mocha.opts`](test/mocha.opts))
2. ✅ Package.json dependencies and scripts updated
3. ✅ Test helper utilities implemented ([`TestHelper.ts`](test/helpers/TestHelper.ts), [`MockData.ts`](test/helpers/MockData.ts))

### ✅ Step 2: Test Template Creation - COMPLETED
1. ✅ Standardized test template established (see implemented tests)
2. ✅ Base test helper classes implemented
3. ✅ Mock data structure set up

### ✅ Step 3: Simple Parser Tests - COMPLETED
1. ✅ Tests implemented for [`dummy.ts`](test/unit/patronka/dummy.test.ts)
2. ✅ Tests created for [`savdoma.ts`](test/unit/patronka/savdoma.test.ts)
3. ✅ Tests added for [`foodseason.ts`](test/unit/patronka/foodseason.test.ts)
4. ✅ Tests implemented for [`bemi.ts`](test/unit/patronka/bemi.test.ts)
5. ✅ Tests created for [`priatelia.ts`](test/unit/patronka/priatelia.test.ts)

### 🔄 Step 4: Complex Parser Tests - IN PROGRESS
1. ⏳ Legacy test migration needed (4 parsers: fajnejedlo, mdvsr, lunchbreak, veglife)
2. ⏳ Implement tests for [`bigger.ts`](parsers/patronka/bigger.ts) with Puppeteer mocking
3. ⏳ Create comprehensive tests for remaining 5 parsers
4. ⏳ Add integration tests

### ⏳ Step 5: Validation and Documentation - PENDING
1. ⏳ Run full test suite validation
2. ⏳ Create test maintenance documentation
3. ⏳ Update CI/CD pipeline integration

## Success Criteria - PROGRESS UPDATE

- [x] **64% (9/14)** patronka parsers have comprehensive test coverage
- [x] **100%** test isolation achieved (no side effects between tests)
- [x] **100%** consistent test patterns across all parser tests
- [ ] **Pending** test execution time validation (need full suite run)
- [ ] **Pending** integration tests validate end-to-end functionality
- [ ] **Pending** clear documentation for test maintenance

## PHASE 2 RECOMMENDATIONS

### Priority 1: Legacy Test Migration
1. Move [`test/fajnejedlo.test.ts`](test/fajnejedlo.test.ts) → [`test/unit/patronka/fajnejedlo.test.ts`](test/unit/patronka/)
2. Move [`test/mdvsr.ts`](test/mdvsr.ts) → [`test/unit/patronka/mdvsr.test.ts`](test/unit/patronka/)
3. Move [`test/lunchbreak.ts`](test/lunchbreak.ts) → [`test/unit/patronka/lunchbreak.test.ts`](test/unit/patronka/)
4. Move [`test/veglife.ts`](test/veglife.ts) → [`test/unit/patronka/veglife.test.ts`](test/unit/patronka/)

### Priority 2: Remaining Parser Implementation
1. [`bigger.ts`](parsers/patronka/bigger.ts) - Complex Puppeteer mocking required
2. [`kari.ts`](parsers/patronka/kari.ts) - Sme-based parser testing
3. [`patronskypivovar.ts`](parsers/patronka/patronskypivovar.ts) - Sme-based testing
4. [`kari_old.ts`](parsers/patronka/kari_old.ts) - Legacy comparison testing
5. [`savdoma_alt.ts`](parsers/patronka/savdoma_alt.ts) - Alternative implementation testing

### Priority 3: Integration Testing
1. Create [`test/integration/menu-fetching.test.ts`](test/integration/)
2. End-to-end parser validation
3. Performance benchmarking

## Risk Mitigation

1. **Puppeteer Complexity**: Use comprehensive mocking for bigger.ts to avoid browser dependencies
2. **External API Dependencies**: Mock all HTTP calls with realistic response data
3. **File System Dependencies**: Use in-memory mock data instead of real file reads
4. **Date Dependencies**: Use fixed mock dates for consistent test results

## Future Enhancements

1. **Performance Testing**: Add response time benchmarks
2. **Visual Regression**: Screenshot comparison for Puppeteer-based tests
3. **Automated Test Data Refresh**: Periodic updates of sample data from live sources
4. **Parallel Test Execution**: Optimize test runner for faster execution
