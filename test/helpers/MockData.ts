/**
 * Centralized mock data for parser tests.
 */
export const MockData = {
  validHTML: {
    bemi: "<div id=\"ktmain\"><div class=\"entry-content\"><div class=\"tab-content\"><div><p>Polievka 1,50 €</p><p>Menu 5,90 €</p></div></div></div></div>",
    // Matches SavDoma parser: div.mt div.mt-i-c >div:nth-of-type(1) (text), >div:nth-of-type(2) (price)
    savdoma: "<div class=\"mt\"><div class=\"mt-i-c\"><div>Šošovicová polievka</div><div>1,50</div></div><div class=\"mt-i-c\"><div>Kuracie prsia na prírodno</div><div>5,90</div></div></div>",
    // Matches Foodseason parser: h3.av-special-heading-tag, then .av-catalogue-title-container inside correct parent structure
    foodseason: "<div><h3 class=\"av-special-heading-tag\">piatok</h3><div></div><div></div><div><ul><li><div class=\"av-catalogue-title-container\"><span class=\"av-catalogue-title\">Šošovicová polievka</span><span class=\"av-catalogue-price\">1,50</span></div></li><li><div class=\"av-catalogue-title-container\"><span class=\"av-catalogue-title\">Kuracie prsia na prírodno</span><span class=\"av-catalogue-price\">5,90</span></div></li></ul></div></div>"
  },
  validMenuItems: [
    { text: "Šošovicová polievka", price: 1.5, isSoup: true },
    { text: "Kuracie prsia na prírodno", price: 5.9, isSoup: false }
  ],
  bemiSampleMenu: [
    { text: "Polievka", price: 1.5, isSoup: true },
    { text: "Menu", price: 5.9, isSoup: false }
  ]
  // Add more parser-specific mock outputs as needed
};
