var cheerio = require('cheerio');
var parserUtil = require('./parserUtil');

module.exports.parse = function(html, date, callback) {
    var $ = cheerio.load(html);
    var dayMenu = [];
    var soupPattern = /^Polievk|^Hlavné|^ŠPECIALITA/;
    var junkPattern = /Hlavné jedlá/;
    
    var denneMenu = parserUtil.findMenuSme($, date);
    var restaurantName = $('.res_page .nazov-restauracie h1').text();
    
    if (restaurantName.toLowerCase().includes('chef')) {
        max_soup_index = 1;
    }
    
    denneMenu.first().find('.jedlo_polozka').each(function() {
        if (/*$(this).find('.left>b').length === 0 &&*/ !(junkPattern.test($(this).text()))) {
            dayMenu.push(this);
        }
    });

    //convert to menu item object
    dayMenu = dayMenu.map(function(item) {
        var label = $('.left', item).text();
        var price = $('.right', item).text();
        return { 
            isSoup: soupPattern.test(label.trim()), 
            text: normalize(label), 
            price: parseFloat(price) 
        };
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
