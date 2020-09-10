var cheerio = require('cheerio');
require('./parserUtil');

module.exports.parse = function(html, date, callback) {
    var dayMenu = [];

    var junkPattern = /Alergény:.*/
    var dayPattern = new RegExp("(" + date.format("DD.MM.YYYY") + ")[\\S\\s]*?<!--price table Start-->([\\S\\s]*?)<!--price table end-->");
    var soupPattern = /<h3>POLIEVKA<\/h3>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/li>/g
    var mealPattern = /<h3>(.*)<\/h3>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/li>/g
    var menuPattern = /Menu [0-9]/
    
    var currentDay = html.match(dayPattern)[2];
    if (currentDay) {        
        do {
            var soup = soupPattern.exec(currentDay);
            
            if (soup) {
                var price = parseFloat(soup[1]);
                var text = normalize(soup[2]);
                dayMenu.push({ isSoup: true, text: text, price: price });
            }

        } while (soup)

        currentDay = currentDay.replace(soupPattern, "");
        do {
            var meal = mealPattern.exec(currentDay);
            
            if (meal) {
                var price = parseFloat(meal[2]);
                var title = normalize(meal[1]);
                var text = normalize(meal[3]);

                //if (!title.match(menuPattern)) {
                    text = title + ": " + text;
                //}

                //console.log("text: \n" + text);
                dayMenu.push({ isSoup: false, text: text, price: price });
            }

        } while (meal)
    } else {
        console.log("ERROR: cantina_homepage.js: failed to parse menu.")
    }

    callback(dayMenu);

    function normalize(str) {
        return capitalizeFirstLetter(
            str.removeItemNumbering()
            .normalizeWhitespace()
            .removeMetrics()
            .correctCommaSpacing().replace(/\*.*$/, '')
            .replace(junkPattern, '')
            .replace(' <br /> ', ', ')
            .replace(/^\//, '')
            .trim().toLowerCase()
        );
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      }    
};
