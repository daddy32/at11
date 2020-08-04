var cheerio = require('cheerio');
var parserUtil = require('./parserUtil');

// NOT IMPLEMENTED

/*
module.exports.parse = function(html, date, callback) {
    var $ = cheerio.load(html);
    var dayMenu = [];
    var soupPattern = /0,[1-9]*$/;
    var junkPattern = /2 polievky|Dezert|Týždenné menu/

    var denneMenu = $('.entry-content');

    denneMenu.first().find('p').each(function() {
        if ($(this).find('.left>b').length === 0 && !(junkPattern.test($(this).text()))) {
            dayMenu.push(this);
        }
    });

    //convert to menu item object
    dayMenu = dayMenu.map(function(item) {
        var label = $('p', item).text();
        var price = '0'; // $('.right', item).text();
        return {
            isSoup: soupPattern.test(label.trim()),
            text: normalize(label),
            price: parseFloat(price)
        };
    });

    callback(dayMenu);

    function normalize(str) {
        return str.normalizeWhitespace()
            .replace(soupPattern, '')
            .removeMetrics()
            .correctCommaSpacing()
            .removeItemNumbering();
    }
};
*/