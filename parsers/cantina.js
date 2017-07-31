var parent_parser = require('./sme');

module.exports.parse = function(html, date, callback) {
    var max_soup_index = 1;
	var index = 0;
	var junkPattern = /POLIEVKY: /;
	var junkPattern2 = /\/ alergény.*/;
	var pricePattern = /([0-9]+\.\s*[0-9]+)\s*€/
	
	parent_parser.parse(html, date, function(menuItems) {
        var price = NaN;
        
		var dayMenu = menuItems.map(function(item){
			item.isSoup = index++ <= max_soup_index;
			try {
				var priceMatch = item.text.match(pricePattern)
				var pricenum = parseFloat(priceMatch[1].replace(/\s+/, ''));
				item.price = pricenum;
			}	
			catch(err) {
				console.log("price not parsed");
			}	
			
            item.text = normalize(item.text);
            return item;
        });
       
		callback(dayMenu);
    });

    function normalize(str){
		return capitalizeFirstLetter(
			(	
				str.replace(/\*.*$/, '')
				.replace(pricePattern, '')
				.replace(junkPattern, '')
				.replace(junkPattern2, '')
				.replace(': /', ': ')
				.replace(/^\//, '')
				.trim()
			).toLowerCase()
		)
		;
    }
	
	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}	
};
