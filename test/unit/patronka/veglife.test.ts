// Test for VegLife parser fuzzy promo filtering

import "../../../parsers/parserUtil";
import { expect } from "chai";
import { VegLife } from "../../../parsers/patronka/veglife";
import { IMenuItem } from "../../../parsers/IMenuItem";
import { TestHelper } from "../../helpers/TestHelper";
import sinon from "sinon";
import fuzz from "fuzzball";

describe("VegLife Parser", () => {
  let parser: VegLife;
  let mockDate: Date;

  const promoText = "Nestihli ste u nás obed? Príďte k nám medzi 14:00 a 15:00 a za jedlo na váhu alebo polievku zaplatíte cenu zníženú o 40 %. Happy hour sa nevzťahuje na dezerty, nápoje a donášku. Buďte v správny čas na správnom mieste a užite si skvelé jedlo za výhodnú cenu! Vo Freshmarkete začína happy hour o 15:00.";
  const normalText = "Šošovicová polievka s párkom";
  const promoTemplates = [
    "Nestihli ste u nás obed? Príďte k nám medzi 14:00 a 15:00 a za jedlo na váhu alebo polievku zaplatíte cenu zníženú o 40 %. Happy hour sa nevzťahuje na dezerty, nápoje a donášku. Buďte v správny čas na správnom mieste a užite si skvelé jedlo za výhodnú cenu! Vo Freshmarkete začína happy hour o 15:00.",
    "Vo Freshmarkete začína happy hour o 15:00.",
    "Happy hour sa nevzťahuje na dezerty, nápoje a donášku."
  ];
  const promoThreshold = 80;
  const html = "";

  beforeEach(() => {
    parser = new VegLife(() => JSON.parse(JSON.stringify(fakeMenu)));
    mockDate = new Date();
  });

  afterEach(() => {
    TestHelper.cleanupMocks();
  });

  const fakeMenu: IMenuItem[] = [
    { text: promoText, isSoup: false, price: 0 },
    { text: normalText, isSoup: false, price: 0 }
  ];

  it("should filter out promo text and preserve normal menu items", async () => {
    // Patch parseBase to return our fake menu
    const parseBaseStub = sinon.stub((VegLife.prototype as any), "parseBase").returns(JSON.parse(JSON.stringify(fakeMenu)));
    await parser.parse(html, mockDate, (menu: IMenuItem[]) => {
      expect(menu.some(item => item.text === promoText)).to.be.false;
      expect(menu.some(item => item.text.includes("Šošovicová"))).to.be.true;
      parseBaseStub.restore();
    });
  });

  it("should use fuzzball to check similarity thresholds", () => {
    const promoSimilarities = promoTemplates.map(t => fuzz.ratio(promoText, t));
    const normalSimilarities = promoTemplates.map(t => fuzz.ratio(normalText, t));
    expect(Math.max(...promoSimilarities)).to.be.greaterThan(promoThreshold);
    expect(Math.max(...normalSimilarities)).to.be.lessThan(promoThreshold);
  });
});