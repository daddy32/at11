var parent_parser = require('./sme');

module.exports.parse = function(html, date, callback) {
  var index = 0;
  var soupPattern = /Polievka: /;
  var junkPattern = /\/ alergény.*/;
  var pricePattern = /([0-9]+\.\s*[0-9]+)\s*€/

  parent_parser.parse(html, date, function(menuItems) {
    var price = NaN;

    var dayMenu = menuItems.map(function(item) {
      item.isSoup =soupPattern.test(item.text);
      try {
        var priceMatch = item.text.match(pricePattern)
        var pricenum = parseFloat(priceMatch[1].replace(/\s+/, ''));
        item.price = pricenum;
      } catch (err) {
        //console.log("price not parsed");
      }

      item.text = normalize(item.text);
      return item;
    });

    callback(dayMenu);
  });

  function normalize(str) {
    return capitalizeFirstLetter(
      (
        str.replace(/\*.*$/, '')
        .replace(pricePattern, '')
        .replace(soupPattern, '')
        .replace(junkPattern, '')
        .replace(': /', ': ')
        .replace(/^\//, '')
        .trim()
      ).toLowerCase()
    );
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
};
