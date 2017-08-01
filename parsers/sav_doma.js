var parent_parser = require('./sme');

module.exports.parse = function(html, date, callback) {
  var max_soup_index = 0;
  var index = 0;

  parent_parser.parse(html, date, function(menuItems) {
    var price = NaN;

    var dayMenu = menuItems.map(function(item) {
      //console.log(item.text);
      item.isSoup = index++ <= max_soup_index;

      item.text = normalize(item.text);
      return item;
    });

    callback(dayMenu);
  });

  function normalize(str) {
    return str.replace(/\*.*$/, '');
  }
};
