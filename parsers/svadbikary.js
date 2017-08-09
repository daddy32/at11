var cheerio = require('cheerio');

module.exports.parse = function(html, date, callback) {
  var $ = cheerio.load(html);
  var dayMenu = [];
  var soupPattern = /olievka/;
  var junkPattern = /Zmena:/;
  var junkPattern2 = /Menu na[^:]*:/;
  var junkPattern3 = /\/a.*/;
  var langSeparator = '___';
  var langSeparator2 = '---';

  var denneMenu = $('#secondary .cff-text');
  var menuText = denneMenu.html();

  if (menuText.indexOf(langSeparator) >= 0) {
    menuText = menuText.substr(0, menuText.indexOf(langSeparator));
  }

  if (menuText.indexOf(langSeparator2) >= 0) {
    menuText = menuText.substr(0, menuText.indexOf(langSeparator2));
  }

  menuText = menuText
    .replace(junkPattern, '')
    .replace(junkPattern2, '');

  var myStringArray = menuText.split('<br>');
  var arrayLength = myStringArray.length;

  for (var i = 0; i < arrayLength; i++) {
    var lineText = myStringArray[i].trim();
    if (lineText !== '') {
      dayMenu.push({
        isSoup: soupPattern.test(lineText),
        text: normalize(lineText),
        price: Number("NaN")
      })
    }
  }

  // Polievky na zaciatok
  dayMenu.sort(function(x, y) {
    return x.isSoup ? -1 : y.isSoup ? 1 : 0;
  });

  callback(dayMenu);

  function normalize(str) {
    return str
      .replace(junkPattern3, '')
      .removeMetrics()
      .correctCommaSpacing()
      .removeItemNumbering();
  }
};
