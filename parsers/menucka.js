var cheerio = require('cheerio');
require('./parserUtil');

module.exports.parse = function(html, date, callback) {
  var $ = cheerio.load(html);
  var dayMenuItemsProto = [];
  var dayMenuItems = [];
  var junkPattern = /denné menu/;
  var polievkPattern = /POLIEVKY: /;
  var junkPattern4 = /POLIEVKA/;
  var junkPattern5 = /MINUTKA/;
  var junkPattern6 = /^[A-Z]\s/;
  var pricePattern = /[0-9]+[,.]*[0-9]+\s+€/;
  var alergPattern = /\/*\s*A[\s:](\d\s?[\.,]?\s?)+$/;
  var alergPattern2 = /\/\s+alergény\s+(\d\s?[\.,]?\s?)*/;
  var alergPattern3 = /\/*\s*\((\d\s?[\.,]?\s?)+\)\s*/;
  var max_soup_index = 1;
  var index = 0;

  var denneMenu = $('#restaurant .row').filter(function() {
    var nadpis = $(this).find('.day-title').text();
    return nadpis.indexOf('(dnes)') > -1;
  });

  denneMenu.find('div').each(function() {
    var text = $(this).text();
    if ((!(!text || 0 === text.trim().length)) &&
      !junkPattern.test(text.toLowerCase()) &&
      !junkPattern4.test(text.trim()) &&
      !junkPattern5.test(text.trim())
    ) {
      dayMenuItemsProto.push(this);
    } else {
    }
  });

  var label = '';
  for (var i = 0; i < dayMenuItemsProto.length; i++) {
    var item = dayMenuItemsProto[i];
    var currentlabel = $(item).text();

    if (pricePattern.test(currentlabel)) {
      dayMenuItems.push({
        isSoup: (index++ <= max_soup_index),
        text: normalize(label),
        price: parseFloat(currentlabel.replace(',', '.'))
      });
      label = '';
    } else {
      label += normalize(currentlabel);
    }
  }

  callback(dayMenuItems);

  function normalize(str) {
    var result = str
      .removeItemNumbering()
      .removeMetrics()
      .replace(alergPattern, '')
      .replace(alergPattern2, '')
      .replace(alergPattern3, '')
      .replace(polievkPattern, '')
      .replace(junkPattern6, '')
      .correctCommaSpacing()
      .normalizeWhitespace()
      .toLowerCase()
      .capitalizeFirstLetter()
    ;
    //console.log('normalize("' + str + '") = "' + result + '"');
    return result;
  }
}
