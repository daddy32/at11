var cheerio = require('cheerio');
require('./parserUtil');
console.log('menucka mumu1');

module.exports.parse = function(html, date, callback) {
  console.log('menucka mumu2');

  var $ = cheerio.load(html);
  var dayMenuItemsProto = [];
  var dayMenuItems = [];
  var junkPattern = /denné menu/;
  var junkPattern2 = /A:\s*[0-9]+/
  var junkPattern3 = /A:\s*$/
  var max_soup_index = 1;

  var denneMenu = $('#restaurant .row').filter(function(){
      var nadpis = $(this).find('.day-title').text();
      return nadpis.indexOf('(dnes)') > -1;
  });

  denneMenu.find('div').each(function() {
      text = $(this).text();
      console.log(text);
      if ((!(!text || 0 === text.trim().length)) &&
        !junkPattern.test(text.toLowerCase()) &&
        !junkPattern2.test(text) &&
        !junkPattern3.test(text)
      ){
        dayMenuItemsProto.push(this);
      }
  });

  for (var i = 0; i < dayMenuItemsProto.length / 2; i++) {
    item = dayMenuItemsProto[i*2];
    nextItem = dayMenuItemsProto[i*2 + 1];
    var label = $(item).text();
    console.log('label: ' + label);

    var price = $(nextItem).text();
    console.log('price: ' + price);

    dayMenuItems.push({
        isSoup: (i <= max_soup_index),
        text: normalize(label),
        price: parseFloat(price.replace(',', '.'))
    });
  }

  callback(dayMenuItems);

  function normalize(str) {
    return str
      .removeItemNumbering()
      .removeMetrics()
      .replace(/A\s(\d\s?[\.,]?\s?)+$/, '')
      .correctCommaSpacing()
      .normalizeWhitespace();
  };
}
