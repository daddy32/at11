var cheerio = require('cheerio');
require('./parserUtil');

module.exports.parse = function(html, date, callback) {
  var $ = cheerio.load(html);
  var dayMenuItemsProto = [];
  var pricesProto = [];
  var dayMenuItems = [];
  var polievkPattern = /POLIEVKY: /;
  var junkPattern = /denné menu/;
  var junkPattern4 = /POLIEVKA/;
  var junkPattern5 = /MINUTKA/;
  //var junkPattern5b = /HLAVNÉ JEDLO/;
  var junkPattern5c = /JEDLO EXTRA/;
  var junkPattern6 = /^[A-Z]\s/;
  var alergPattern = /\/*\s*A[\s:](\d\s?[\.,]?\s?)+$/;
  var alergPattern2 = /\/\s+alergény\s+(\d\s?[\.,]?\s?)*/;
  var alergPattern3 = /\/*\s*\((\d\s?[\.,]?\s?)+\)\s*/;
  var max_soup_index;
  var index = 0;

  var restaurantName = $('a.name').text();
  if (restaurantName.toLowerCase().includes('crazy culinary') || restaurantName.toLowerCase().includes('veg life')) {
    max_soup_index = 0;
  } else if (restaurantName.toLowerCase().includes('priatelia')) {
    max_soup_index = 3;
  } else {
    max_soup_index = 1;
  }

  // NOTE: Pozor, tu berieme vzdy dnesne menu ('(dnes)') a ignorujeme date parameter fcie.
  var denneMenu = $('#restaurant .row').filter(function() {
    var nadpis = $(this).find('.day-title').text();
    return nadpis.indexOf('(dnes)') > -1;
  });

  console.log('Menu items: ');
  denneMenu.find('>div').not('.price').not('.col-xs-12').each(function() {
    dayMenuItemsProto.push(this);
  });
  console.log(dayMenuItemsProto);

  console.log('Prices: ');
  denneMenu.find('>div.price').each(function() {
    pricesProto.push(this);
  });
  console.log(pricesProto);

  for (var i = 0; i < dayMenuItemsProto.length; i++) {
    var currentlabel = $(dayMenuItemsProto[i]).text();
    var currentPrice = $(pricesProto[i]).text();
    console.log('Label: ' + currentlabel);
    console.log('Price: ' + currentPrice);


    if (!(!currentlabel || 0 === currentlabel.trim().length) &&
      !junkPattern.test(currentlabel.toLowerCase()) &&
      !junkPattern4.test(currentlabel.trim()) &&
      !junkPattern5.test(currentlabel.trim()) &&
      //!junkPattern5b.test(currentlabel.trim()) &&
      !junkPattern5c.test(currentlabel.trim())
    ) {
      dayMenuItems.push({
        isSoup: (index++ <= max_soup_index),
        text: normalize(currentlabel),
        price: parseFloat(currentPrice.replace(',', '.'))
      });
    }
  }

  callback(dayMenuItems);

  function normalize(str) {
    var result = str
      .removeMetrics()
      .removeItemNumbering()
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
