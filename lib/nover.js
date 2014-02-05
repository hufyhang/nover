#!/usr/bin/env node
var express = require('express'),
    color = require('colors'),
    pros = require('./promises');

var sys = {};
var server = express();
var main = express();
main.use(express.compress());
main.use(express.bodyParser());
main.use(express.methodOverride());
main.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
var prepareFilename = function (filename) {
    'use strict';
    return filename.replace(/^\$ROOT/, sys.root);
};

var interpretSites = function (sites, app) {
    'use strict';
    if (sites) {
        sites.forEach(function (site) {
            var domain = site.url || undefined;
            var local = site.local || undefined;
            var directory;

            if (domain && local) {
                directory = prepareFilename(local);
                app.use(domain, express.static(directory));
                console.log('Registered site "'.green + domain +
                           '" with "'.green + directory + '".'.green);
            }
        });
        // Handle 404
        app.use(function(req, res) {
            res.send('404: Page not Found', 404);
        });

        // Handle 500
        app.use(function(error, req, res, next) {
            res.send('500: Internal Server Error', 500);
        });
    }
    app.use(app.router);
};

var interpretApis = function (apis, app) {
    'use strict';
    if (apis) {
        apis.forEach(function (api) {
            var uri = api.uri || undefined;
            var method = api.method || undefined;
            var local = api.local || undefined;
            var filename;

            if(uri && method && local) {
                filename = prepareFilename(local);
                switch (method.toUpperCase()) {
                case 'GET':
                    app.get(uri, function (req, res) {
                        require(filename).__get(req, res);
                    });
                    break;
                case 'POST':
                    app.post(uri, function (req, res) {
                        require(filename).__post(req, res);
                    });
                    break;
                case 'PUT':
                    app.put(uri, function (req, res) {
                        require(filename).__put(req, res);
                    });
                    break;
                case 'DELETE':
                    app.delete(uri, function (req, res) {
                        require(filename).__delete(req, res);
                    });
                    break;
                case 'ALL':
                    app.all(uri, function (req, res) {
                        require(filename).__all(req, res);
                    });
                    break;
                }
                console.log('Registed API "'.green + uri + '" '.green +
                            method.toUpperCase().blue +' with "'.green +
                           local + '".'.green);
            }
        });
    }
};

var loadFromJson = function (json) {
    'use strict';

    // set top level domain
    sys.top = json.top || 'http://127.0.0.1';
    main.use(express.vhost(sys.top, server));
    console.log('Top domain: '.green + sys.top);

    // set httpPort
    sys.httpPort = json.port || 3000;
    console.log('HTTP Port: '.green + sys.httpPort);

    sys.root = json.root || '';
    console.log('Root: '.green + sys.root);

    sys.log = json.log || 0;
    if (sys.log === 1) {
        server.use(express.logger());
    }

    sys.favicon = json.favicon || undefined;
    if (sys.favicon) {
        server.use(express.favicon(prepareFilename(sys.favicon)));
        console.log('Favicon: '.green + sys.favicon);
    }

    // now bring in static sites
    sys.sites = json.sites || undefined;
    interpretSites(sys.sites, server);

    // now bring in RESTful APIs
    sys.apis = json.apis || undefined;
    interpretApis(sys.apis, server);
    console.log();

    // now bring in vhosts
    sys.vhosts = json.vhosts || undefined;
    if (sys.vhosts) {
        sys.vhostApp = [];
        sys.vhosts.forEach(function (vhost, index, vhosts) {
            if (vhost.subdomain) {
                console.log('-------------------'.green);
                console.log('Adding virtual host: '.green + vhost.subdomain);
                var vApp = express();
                sys.vhostApp.push(vApp);
                var sites = vhost.sites || undefined;
                var apis = vhost.apis || undefined;
                var favicon = vhost.favicon || undefined;
                // applying system logger config
                if (sys.log) {
                    vApp.use(express.logger());
                }
                if (favicon) {
                    vApp.use(express.favicon(prepareFilename(favicon)));
                    console.log('Vhost Favicon: '.green + favicon);
                }
                if (sites) {
                    interpretSites(sites, vApp);
                }
                if (apis) {
                    interpretApis(apis, vApp);
                }
                main.use(express.vhost(vhost.subdomain, vApp));
                console.log('Registered vitual host "'.green + vhost.subdomain + '".'.green);
                console.log('-------------------\n'.green);
            }
        });
    }
};

module.exports = function (argv) {
    'use strict';

    if (argv.length < 3) {
        console.log('Fatal: Missing config file.'.red);
        console.log('Usage: nover <config file location>'.yellow);
        process.exit(0);
    }

    // check if config file is given
    sys.config = process.argv[2];
    console.log('Config: '.green + sys.config);

    // read in config file first
    console.log('Now reading config file...'.green);
    console.log('==========================\n'.green);
    pros.readfile(sys.config)
    .then(function (data) {
        var json = JSON.parse(data);
        loadFromJson(json);

        main.listen(sys.httpPort);
        console.log('================'.green);
        console.log('Now listening...'.green);
    }, function (err) {
        console.error(err.red);
    });
};

