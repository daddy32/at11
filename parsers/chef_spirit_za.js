var cheerio = require('cheerio');
var parserUtil = require('./parserUtil');

module.exports.parse = function(html, date, callback) {
  var $ = cheerio.load(html);
  var dayMenu = [];
  var index = 0;
  var max_soup_index = 0;
  var junkPattern = /Mini dezert/;

  var denneMenu = parserUtil.findMenuSme($, date);

  var restaurantName = $('.res_page .nazov-restauracie h1').text();
  if (restaurantName.toLowerCase().includes('chef') || restaurantName.toLowerCase().includes('02')) {
    max_soup_index = 1;
  }

  denneMenu.first().find('.jedlo_polozka').each(function() {
    if ($(this).find('.left>b').length === 0 && !(junkPattern.test($(this).text()))) {
      dayMenu.push(this);
    }
  });

  //convert to menu item object
  dayMenu = dayMenu.map(function(item) {
    var label = $('.left', item).text();
    var price = $('.right', item).text();
    return {
      isSoup: index++ <= max_soup_index,
      text: normalize(label),
      price: parseFloat(price)
    };
  });

  callback(dayMenu);

  function normalize(str) {
    return str.normalizeWhitespace()
      .removeMetrics()
      .correctCommaSpacing()
      .removeItemNumbering();
  }
};
