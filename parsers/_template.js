var cheerio = require('cheerio');
require('./parserUtil');

module.exports.parse = function(html, date, callback) {
    var $ = cheerio.load(html);
    var dayMenu = [];
    
    
    // dayMenu.push({ isSoup: false, text: normalize(text), price: price });

    /*
    dayMenu = dayMenu.map(function(item) {
        var label = $('.left', item).text();
        var price = $('.right', item).text();
        return { isSoup: soupPattern.test(label.trim()), text: normalize(label), price: parseFloat(price) };
    });
    */
    callback(dayMenu);

    function normalize(str) {
        return str.removeItemNumbering()
            .removeMetrics()
            .correctCommaSpacing()
        ;
    }
   