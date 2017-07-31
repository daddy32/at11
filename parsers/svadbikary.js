var cheerio = require('cheerio');
var parserUtil = require('./parserUtil');

module.exports.parse = function(html, date, callback) {
    var $ = cheerio.load(html);
    var dayMenu = [];
    var soupPattern = /olievka/;
    var junkPattern 	= /Zmena:/;
	var junkPattern2 	= /Menu na[^:]*:/;
	var junkPattern3 	= /\/a.*/;
    
    var denneMenu = $('#secondary .cff-text');
	var menuText = denneMenu.html();	
	
	if (menuText.indexOf('___') >= 0) {
		menuText = menuText.substr(0, menuText.indexOf('___')); 
	}
	
	menuText = menuText           
		.replace(junkPattern, '')
        .replace(junkPattern2, '')
	; 
	
	myStringArray = menuText.split('<br>');
	var arrayLength = myStringArray.length;
	
	for (var i = 0; i < arrayLength; i++) {
		lineText = myStringArray[i].trim();
		if (lineText != '') {
			dayMenu.push({ 
				isSoup: soupPattern.test(lineText), 
				text: normalize(lineText), 
				price: Number("NaN")
			})
		}
	}
    
	// Polievky na zaciatok
	dayMenu.sort(function(x,y){ return x.isSoup ? -1 : y.isSoup ? 1 : 0; });
	
    callback(dayMenu);

    function normalize(str) {
        return str
            .replace(junkPattern3, '')
            .removeMetrics()
            .correctCommaSpacing()
            .removeItemNumbering();
    }
};
