module.exports = {
    port: process.env.PORT || 17606,
    cacheExpiration: 2 * 60 * 60 * 1000, //2h
    parserTimeout: 20 * 1000, //20s
    restaurants: [
    { 
        id: 1, 
        name: 'Patrónsky pivovar',
        url: 'https://restauracie.sme.sk/restauracia/patronsky-pivovar_4270-stare-mesto_2949/denne-menu', 
        module: 'sme' 
    },
    { 
        id: 2, 
        name: 'City Cantina Westend Gate',
        url: 'https://restauracie.sme.sk/restauracia/city-cantina_5485-stare-mesto_2949/denne-menu', 
        module: 'cantina' 
    },
    { 
        id: 3, 
        name: 'City Cantina Westend Square',
        url: 'https://restauracie.sme.sk/restauracia/city-cantina-westend-square_8681-dubravka_2659/denne-menu', 
        module: 'cantina' 
    },
    { 
        id: 4, 
        name: 'Veg life',
        url: 'https://restauracie.sme.sk/restauracia/veg-life-westend_7266-dubravka_2659/denne-menu', 
        module: 'sme' 
    },
    { 
        id: 5, 
        name: 'Jedáleň SAV (Doma)',
        url: 'https://restauracie.sme.sk/restauracia/doma_8495-dubravka_2659/denne-menu', 
        module: 'sav_doma' 
    },
    { 
        id: 6, 
        name: 'Canteen Priatelia',
        url: 'https://www.zomato.com/sk/bratislava/canteen-priatelia-westend-karlova-ves-bratislava-iv/denn%C3%A9-menu', 
        module: 'zomato' 
    },
    { 
        id: 7, 
        name: 'Svadby a Kari',
        url: 'http://www.svadbykari.sk/vitajte-v-svadby-a-kari-na-patronke/', 
        module: 'zomato' 
    },
	/*	
	TODO: 
		http://www.svadbykari.sk/vitajte-v-svadby-a-kari-na-patronke/
			https://www.menucka.sk/denne-menu/bratislava/canteen-priatelia-westend	
			https://www.zomato.com/sk/bratislava/canteen-priatelia-westend-karlova-ves-bratislava-iv/denn%C3%A9-menu
    { 
        id: 8, 
        name: 'Level 7',
        url: 'http://restauracie.sme.sk/restauracia/level-7_4546-zilina_2737/denne-menu', 
        module: 'trattoria_za' 
    },
    { 
        id: 9, 
        name: 'Chef restaurant',
        url: 'http://restauracie.sme.sk/restauracia/chef-restaurant-bar_7274-zilina_2737/denne-menu', 
        module: 'chef_spirit_za' 
    },
    { 
        id: 5, 
        name: 'Kamélia',
        url: 'http://restauracie.sme.sk/restauracia/penzion-kamelia_2004-zilina_2737/denne-menu', 
        module: 'kamelia_za' 
    },  
    { 
        id: 10, 
        name: 'Central Park', 
        url: 'http://restauracie.sme.sk/restauracia/penzion-central-park_5515-zilina_2737/denne-menu', 
        module: 'central_park_za' 
    },*/
    ],
    themes: {
        'jano': { name: 'Jano', template: '../views/index.html' },
        'matus': { name: 'Matúš', template: '../views/index3.html' },
        'iveta': { name: 'Iveta', template: '../views/index4.html' },
        'diana': { name: 'Diana', template: '../views/index6.html' },
        'telka': { name: 'Telka', template: '../views/index5.html' }
    }
};
