var cheerio = require('cheerio');
require('./parserUtil');

module.exports.parse = function(html, date, callback) {
  var $ = cheerio.load(html);
  var dayMenu = [];
  var soupPattern = /olievka/;
  var junkPattern = /\&nbsp/;
  var pricePattern = /(\d+,\d+)\s*eur/;

  console.log(date);
  var n = date._d.getDay();
  console.log('day: ' + n);

  dayMenuElement = $('#ktmain .entry-content .tab-content>div:nth-of-type(' + n + ')');
  console.log(dayMenuElement.html());

  dayMenuElement.find('p').each(function() {
    var text = $(this).text();
    var price = NaN;

    try {
      var priceMatch = text.match(pricePattern)
      var pricenum = parseFloat(priceMatch[1].replace(/\s+/, '').replace(',', '.'));
      price = pricenum;
    } catch (err) {
      console.log("price not parsed");
    }

    if (!(junkPattern.test(text))) {
      dayMenu.push({
        isSoup: false,
        text: normalize(text),
        price: price
      });
    }
  });

  callback(dayMenu);

  function normalize(str) {
    return str
      .replace(pricePattern, '')
      .normalizeWhitespace()
      .removeItemNumbering()
      .removeMetrics()
      .correctCommaSpacing();
  }
}
