var cheerio = require('cheerio');
require('./parserUtil');

module.exports.parse = function(html, date, callback) {
  var $ = cheerio.load(html);
  var dayMenuItemsProto = [];
  var dayMenuItems = [];
  var junkPattern = /denné menu/;
  var junkPattern2 = /A:\s*[0-9]+/
  var junkPattern3 = /A:\s*$/
  var junkPattern4 = /POLIEVKA/
  var junkPattern5 = /MINUTKA/
  var max_soup_index = 1;

  var denneMenu = $('#restaurant .row').filter(function(){
      var nadpis = $(this).find('.day-title').text();
      return nadpis.indexOf('(dnes)') > -1;
  });

  denneMenu.find('div').each(function() {
      text = $(this).text();
      //console.log('text: ' + text);
      if ((!(!text || 0 === text.trim().length)) &&
        !junkPattern.test(text.toLowerCase()) &&
        !junkPattern4.test(text.trim()) &&
        !junkPattern5.test(text.trim())
      ){
        dayMenuItemsProto.push(this);
        //console.log(' - including');
      } else {
        //console.log(' - NOT including');
      }
  });

  for (var i = 0; i < dayMenuItemsProto.length / 3; i++) {
    item = dayMenuItemsProto[i*3];
    nextItem = dayMenuItemsProto[i*3 + 2];
    var label = $(item).text();
    var price = $(nextItem).text();

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
