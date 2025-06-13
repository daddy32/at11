import sinon from "sinon";
import { IMenuItem } from "../../parsers/IMenuItem";

/**
 * Utility class for common test helpers and mocks.
 */
export class TestHelper {
  /**
   * Returns a mock HTML string for parser tests.
   */
  static createMockHTML(content: string): string {
    return `<html><body>${content}</body></html>`;
  }

  /**
   * Returns a Date object from a string (YYYY-MM-DD).
   */
  static createMockDate(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Returns a mock IMenuItem, with optional overrides.
   */
  static createMockMenuItem(overrides: Partial<IMenuItem> = {}): IMenuItem {
    return {
      text: "Test menu item",
      price: 5.0,
      isSoup: false,
      ...overrides
    };
  }

  /**
   * Stubs axios.get to return the provided data.
   */
  static mockAxiosResponse(data: any): sinon.SinonStub {
    const axios = require("axios");
    return sinon.stub(axios, "get").resolves({ data });
  }

  /**
   * Restores all sinon mocks/stubs.
   */
  static cleanupMocks(): void {
    sinon.restore();
  }
}
