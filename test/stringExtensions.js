var assert = require('assert'),
	cache = require('../parsers/parserUtil');

var removeNumberingTests = [
    { input: "1.) Kurací steak s bylinkovou omáčkou, pečené zemiaky, obloha", result: "Kurací steak s bylinkovou omáčkou, pečené zemiaky, obloha" },
    { input: "Držková polievka, chlieb", result: "Držková polievka, chlieb" },
    { input: "3 .350g Zapekaná brokolica so syrom, varené zemiaky, šalát", result: "350g Zapekaná brokolica so syrom, varené zemiaky, šalát" },
    { input: " l. Sviečková na smotane", result: "Sviečková na smotane" },
    { input: "2.A 200 g Šošovicová omáčka s volským okom, chlieb € 3,50", result: "200 g Šošovicová omáčka s volským okom, chlieb € 3,50" }
    
];

var removeMetricsTests = [
    { input: "1.   Znojemská hovädzia pečienka 64/150g, tarhoňa 190g", result: "1.   Znojemská hovädzia pečienka , tarhoňa" },
    { input: "Sviečková na smotane 64/ 1 50g, knedľa 160g", result: "Sviečková na smotane , knedľa" },
    { input: "Držková polievka, chlieb", result: "Držková polievka, chlieb" },
    { input: "150g.GRILOVANÁ PANENKA, OMÁČKA Z LESNÝCH KURIATOK, PEČENÉ ZEMIAKY 4,20€", result: "GRILOVANÁ PANENKA, OMÁČKA Z LESNÝCH KURIATOK, PEČENÉ ZEMIAKY 4,20€" },
    { input: "1o0g bravčové pečené, kapusta, knedľa", result: "bravčové pečené, kapusta, knedľa" },
    { input: "1OOg bravčové pečené, kapusta, knedľa", result: "bravčové pečené, kapusta, knedľa" },
    { input: "10Og bravčové pečené, kapusta, knedľa", result: "bravčové pečené, kapusta, knedľa" },
    { input: "menu č.4  po vypredaní menu č. 1 a 2 do 13:00 h: 180 g Vyprážaný kurací rezeň s opekanými zemiakmi, tatárska omáčka", result: "menu č.4  po vypredaní menu č. 1 a 2 do 13:00 h: Vyprážaný kurací rezeň s opekanými zemiakmi, tatárska omáčka" }
];

var normalizeWhitespaceTests = [
    { input: "1.   Znojemská hovädzia pečienka 64/150g, tarhoňa 190g", result: "1. Znojemská hovädzia pečienka 64/150g, tarhoňa 190g" },
    { input: "Držková polievka, chlieb", result: "Držková polievka, chlieb" }
];

var consistentWhitespaceTests = [
    { input: "text" + String.fromCharCode(160) + "text" + String.fromCharCode(160) + "text", result: "text text text" },
    { input: "text" + String.fromCharCode(160) + String.fromCharCode(32)+ "text", result: "text text" },
    { input: "text" + String.fromCharCode(32)+ "text" + String.fromCharCode(160) + "text", result: "text text text" },
    { input: String.fromCharCode(32)+ "text" + String.fromCharCode(160) , result: "text" }
];

var correctCommaSpacingTests = [
    { input: "Znojemská hovädzia pečienka , tarhoňa ", result: "Znojemská hovädzia pečienka, tarhoňa " },
    { input: "Držková polievka, chlieb", result: "Držková polievka, chlieb" },
    { input: "Držková polievka,chlieb", result: "Držková polievka, chlieb" },
    { input: "menu č.4 po vypredaní menu č. 1 a 2 do 13:00 h", result: "menu č. 4 po vypredaní menu č. 1 a 2 do 13:00 h" },
    { input: "text without comma", result: "text without comma"}
];

var capitalizeFirstLetter = [
    { input: "držková polievka, chlieb", result: "Držková polievka, chlieb" }
];

describe('Text extension methods', function() {
    
    describe('Remove item numbering', function() {
        removeNumberingTests.forEach(function(item) {
            it(item.input, function() {
                assert.equal(item.input.removeItemNumbering(), item.result);
            });
        });
    });
    
    describe('Remove metrics', function() {
        removeMetricsTests.forEach(function(item) {
            it(item.input, function() {
                assert.equal(item.input.removeMetrics(), item.result);
            });
        });
    });
    
    describe('Normalize whitespace', function() {
        normalizeWhitespaceTests.forEach(function(item) {
            it(item.input, function() {
                assert.equal(item.input.normalizeWhitespace(), item.result);
            });
        });
    });
    
    describe('Consistent whitespace used', function() {
        consistentWhitespaceTests.forEach(function(item) {
            it(item.input, function() {
                assert.equal(item.input.normalizeWhitespace(), item.result);
            });
        });
    });

    describe('Correct comma spacing', function() {
        correctCommaSpacingTests.forEach(function(item) {
            it(item.input, function() {
                assert.equal(item.input.correctCommaSpacing(), item.result);
            });
        });
    });

    describe('Capitalize first letter', function() {
        capitalizeFirstLetter.forEach(function(item) {
            it(item.input, function() {
                assert.equal(item.input.capitalizeFirstLetter(), item.result);
            });
        });
    });
});