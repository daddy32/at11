var cheerio = require('cheerio');
var parserUtil = require('./parserUtil');

module.exports.parse = function(html, date, callback) {
    var $ = cheerio.load(html);
    var dayMenu = [];
    var soupPattern = /^0[\.,]\d+\s?l/;
    var junkPattern = /Mini dezert/;
	var global_price_pattern = /cena ponuky ([1-9,]+) €/;

	var poznamka = $('.poznamka_k_menu>p').text();
	var global_price = 0;
	try {
		global_price = parseFloat(poznamka.match(global_price_pattern)[1].replace(',', '.'));
	}
	catch(err) {
		console.log("global price not parsed");
	}	
	
	/*if (poznamka !== '') {
		console.log("Poznamka: " + poznamka);
		console.log("global_price: " + global_price);
	}*/
    
    var denneMenu = parserUtil.findMenuSme($, date);
    
    denneMenu.first().find('.jedlo_polozka').each(function() {
        if ($(this).find('.left>b').length === 0 && !(junkPattern.test($(this).text()))) {
            dayMenu.push(this);
        }
    });

    //convert to menu item object
    dayMenu = dayMenu.map(function(item) {
        var label = $('.left', item).text();
        var price = $('.right', item).text();
        var result = { 
            isSoup: soupPattern.test(label.trim()), 
            text: normalize(label), 
            price: parseFloat(price)
        };
		
		if ((!result.isSoup) && 
				(result.price === null || result.price == '' || isNaN(result.price)) &&
				(global_price != 0)
				) {
			result.price = global_price;
		} else {
			/*console.log("result.price: " + result.price);
			console.log("result.isSoup: " + result.isSoup);*/
		}
		
		return result;
    });
    
    callback(dayMenu);

    function normalize(str) {
        return str.normalizeWhitespace()
            //.replace(soupPattern, '')
            .removeMetrics()
            .correctCommaSpacing()
            .removeItemNumbering();
    }
};
