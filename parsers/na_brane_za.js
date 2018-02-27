var cheerio = require('cheerio');
var parserUtil = require('./parserUtil');

module.exports.parse = function(html, date, callback) {
  var $ = cheerio.load(html);
  var dayMenu = [];
  var index = 0;
  var max_soup_index = 1;
  
  var menuPattern  = /Menu/;
  var soupsTitlePattern = /POLIEVKY/;

  var STATE_OTHER = 0;
  var STATE_SOUPS = 1;
  var STATE_MENU = 2;
  
  var current_state = STATE_OTHER;

  var junkPattern = /dennej ponuky/;
  var junkPattern2 = /[\d,]+\s*–*\s*$/;
  var junkPattern3 = /^[\d ,]*/;

  var denneMenu = parserUtil.findMenuSme($, date);

  denneMenu.first().find('.jedlo_polozka').each(function() {
    var boldText = $(this).find('.left>b');
    index++;
    if (boldText.length !== 0) {
        var titleText = boldText.text();

        if (soupsTitlePattern.test(titleText)) {
            current_state = STATE_SOUPS;
        } else if (menuPattern.test(titleText)) {
            current_state = STATE_MENU;
        } else if (current_state !== STATE_MENU) {
            current_state = STATE_OTHER;
        }

    } else if (!(junkPattern.test($(this).text()))) {
      if (current_state === STATE_SOUPS || current_state === STATE_MENU) {
        dayMenu.push(this);
      }
    }
  });

  //convert to menu item object
  index = 0;
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
    return str
      .normalizeWhitespace()
      .removeMetrics()
      .replace(junkPattern2, '')
      .replace(junkPattern3, '')
      .correctCommaSpacing()
      .removeItemNumbering();
  }
};
