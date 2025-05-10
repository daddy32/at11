# Cheerio Upgrade Implementation Plan

## Overview
This document outlines the step-by-step process for upgrading Cheerio from v0.22.0 to v1.0.0 to address the high-severity ReDoS vulnerability.

## 1. Preparation Phase

### 1.1 Create Test Branch
```bash
git checkout -b feat/cheerio-upgrade
```

### 1.2 Backup Critical Files
- Save current package.json and package-lock.json
- Create snapshots of current parser outputs for comparison testing

## 2. Dependency Update Phase

### 2.1 Update Dependencies
```json
{
  "dependencies": {
    "cheerio": "^1.0.0"
  },
  "devDependencies": {
    "@types/cheerio": "^1.0.0"
  }
}
```

### 2.2 Installation Steps
1. Remove node_modules directory
2. Delete package-lock.json
3. Run npm install
4. Check for peer dependency warnings

## 3. Testing Phase

### 3.1 Initial Testing
1. Run the existing test suite:
```bash
npm run test
```
2. Document any failures for investigation

### 3.2 Parser-Specific Testing
Test each parser individually, focusing on their HTML parsing patterns:

#### Core Parsers
- [ ] menucka.ts
- [ ] sme.ts
- [ ] zomato.ts

#### Patronka Parsers
- [ ] bemi.ts
- [ ] foodseason.ts
- [ ] kari.ts
- [ ] lunchbreak.ts
- [ ] patronskypivovar.ts
- [ ] priatelia.ts
- [ ] savdoma.ts
- [ ] veglife.ts

#### Sevcenkova Parsers
- [ ] alfa.ts
- [ ] engerau.ts
- [ ] giuliano.ts
- [ ] hallofkings.ts
- [ ] itb.ts
- [ ] kamenica.ts
- [ ] klubovna.ts
- [ ] lokalka.ts
- [ ] pizzapazza.ts
- [ ] skolka.ts

#### Einpark Parsers
- [ ] classicrestaurantpub.ts
- [ ] clockblock.ts
- [ ] derbypub.ts
- [ ] mkmrestaurant.ts
- [ ] sidliskovapivarnicka.ts

### 3.3 Integration Testing
1. Run parsers against live restaurant websites
2. Compare outputs with pre-upgrade snapshots
3. Verify menu item extraction accuracy
4. Test error handling scenarios

## 4. Common Issues to Watch For

### 4.1 Potential Breaking Changes
- Selector compatibility issues
- HTML parsing differences
- Type definition mismatches
- Error handling behavior changes

### 4.2 Type-Related Changes
- Update import statements if needed
- Check Cheerio namespace usage
- Verify method return types
- Update generic type parameters

## 5. Rollback Procedure

### 5.1 Pre-deployment Backup
```bash
git tag pre-cheerio-upgrade
```

### 5.2 Rollback Steps
1. Restore original package.json and package-lock.json
2. Remove node_modules
3. Run npm install
4. Return to tagged version if needed:
```bash
git checkout pre-cheerio-upgrade
```

## 6. Deployment Strategy

### 6.1 Staging Deployment
1. Deploy to staging environment
2. Run full suite of tests
3. Monitor parser success rates
4. Check for error rate changes

### 6.2 Production Deployment
1. Schedule during low-traffic period
2. Deploy changes
3. Monitor error rates
4. Verify menu parsing accuracy
5. Have rollback plan ready

## 7. Post-Deployment Monitoring

### 7.1 Key Metrics to Monitor
- Parser success rates
- Error rates
- Response times
- Menu item extraction accuracy

### 7.2 Success Criteria
- All tests passing
- No increase in parser errors
- Menu extraction accuracy maintained
- No performance degradation

## 8. Documentation Updates

### 8.1 Required Updates
- Update dependency documentation
- Document any parser modifications
- Update troubleshooting guides
- Document known issues if any

### 8.2 Version Control
- Tag release with new version
- Update changelog
- Document upgrade process

## 9. Timeline
1. Preparation: 1 day
2. Implementation: 1-2 days
3. Testing: 2-3 days
4. Deployment: 1 day
5. Monitoring: 2-3 days

## 10. Support Plan
1. Monitor issue tracker
2. Have key team members available during deployment
3. Prepare communication channels for issues
4. Document any workarounds discovered