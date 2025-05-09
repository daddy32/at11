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

[2025-05-09 13:50:24] - Initial Memory Bank creation and documentation of existing architectural decisions