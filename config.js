module.exports = {
    port: process.env.PORT || 17606,
    cacheExpiration: 2 * 60 * 60 * 1000, //2h
    parserTimeout: 20 * 1000, //20s
    restaurants: [
    {
        id: 1,
        name: 'City Cantina Westend Square',
        url: 'http://www.citycantina.sk/prevadzka/2',
        module: 'cantina_homepage'
    },
    {
        id: 2,
        name: 'City Cantina Westend Gate',
        url: 'http://www.citycantina.sk/prevadzka/3',
        module: 'cantina_homepage'
  },
    {
        id: 3,
        name: 'Svadby a Kari',
        url: 'http://www.svadbykari.sk/vitajte-v-svadby-a-kari-na-patronke/',
        module: 'svadbikary'
    },
    {
        id: 4,
        name: 'Patrónsky pivovar',
        url: 'https://restauracie.sme.sk/restauracia/patronsky-pivovar_4270-stare-mesto_2949/denne-menu',
        module: 'sav_doma'
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
        url: 'https://menucka.sk/denne-menu/bratislava/canteen-priatelia-westend',
        module: 'menucka'
    },
    {
        id: 7,
        name: 'Veg life',
        url: 'https://menucka.sk/denne-menu/bratislava/veg-life-westend',
        module: 'menucka'
    },
    {
        id: 8,
        name: 'Restaurant BEMI',
        url: 'https://www.bemiservis.sk/bemi/',
        module: 'bemiservis'
    },
    ],
    themes: {
        'jano': { name: 'Jano', template: '../views/index.html' },
        'matus': { name: 'Matúš', template: '../views/index3.html' },
        'iveta': { name: 'Iveta', template: '../views/index4.html' },
        'diana': { name: 'Diana', template: '../views/index6.html' },
        'telka': { name: 'Telka', template: '../views/index5.html' }
    }
};

/*
TODO: Nove restauracie vo Westend Plazza:
    - Quan Ngon - Vietnamese Cuisine
        - Bez menu online?
        - https://www.westend.sk/kto-u-nas-sidli/quanngon/
        - https://menucka.sk/ulica/Quan%20Ngon,%20Lama%C4%8Dsk%C3%A1%20cesta,%20Karlova%20Ves,%20Slovensko
    - Greek Style
        - Bez menu online?
        - https://www.westend.sk/kto-u-nas-sidli/greekstyle/
    - Thali - 100% Veggie
        - Bez menu online? Resp maju v pdf formate; spolocne pre vsetky prevadzky?
        - http://www.thali.sk/najdi-nas/
    - Bigger - the best snack in the world
        - http://bigger.sk/lamacska
        - Menu (na cely tyzden rovnake) tu: http://bigger.sk/lamacska#menu
            (div.menu-list)
    - Sushi Time
        - Nemaju denne menu (vzdy to iste v ponuke)?
        - https://www.sushitime.sk/sk/menu/
    - Sajado
        - Nemaju denne menu (vzdy to iste v ponuke)?
        - http://www.sajado.sk/-menu-expres-westend
        - https://restauracie.sme.sk/restauracia/restauracia-sajado_3833-bratislava_2983/denne-menu
    - fresh garden salads
        - Nemaju denne menu (vzdy to iste v ponuke)?
        - http://www.freshgarden.sk/sk/menu/
    - Anatolia Kebab
        - Nemaju denne menu (vzdy to iste v ponuke)?
        - http://www.anatolia.sk/
TODO: Zvazit pridanie zoznamu liniek na neparsovane restauracie
*/