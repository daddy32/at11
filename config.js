module.exports = {
  port: process.env.PORT || 17605,
  cacheExpiration: 2 * 60 * 60 * 1000, //2h
  parserTimeout: 20 * 1000, //20s
  restaurants: [{
      id: 1,
      name: 'Trattoria',
      url: 'http://restauracie.sme.sk/restauracia/trattoria-pepe_3300-zilina_2737/denne-menu',
      module: 'trattoria_za'
    },
    {
      id: 2,
      name: 'Spirit',
      url: 'http://restauracie.sme.sk/restauracia/restauracia-spirit_6918-zilina_2737/denne-menu',
      module: 'chef_spirit_za'
    },
    {
      id: 3,
      name: 'O2',
      url: 'http://restauracie.sme.sk/restauracia/restauracia-02_2492-zilina_2737/denne-menu',
      module: 'chef_spirit_za'
    },
    {
      id: 4,
      name: 'Gusto',
      url: 'http://restauracie.sme.sk/restauracia/gusto_4537-zilina_2737/denne-menu',
      module: 'chef_spirit_za'
    },
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
    /* NOK!
    {
        id: 5,
        name: 'Vulcano',
        url: 'http://www.vulcano.sk/?page_id=12',
        module: 'vulcano_za'
    },*/
    /*
        TODO: Tempo: http://www.dobreobedy.sk/
    */
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
    },
  ],
  themes: {
    'jano': {
      name: 'Jano',
      template: '../views/index.html'
    },
    'matus': {
      name: 'Matúš',
      template: '../views/index3.html'
    },
    'iveta': {
      name: 'Iveta',
      template: '../views/index4.html'
    },
    'diana': {
      name: 'Diana',
      template: '../views/index6.html'
    },
    'telka': {
      name: 'Telka',
      template: '../views/index5.html'
    }
  }
};
