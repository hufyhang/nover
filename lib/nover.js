#!/usr/bin/env node
var express = require('express'),
    color = require('colors'),
    pros = require('./promises'),
    httpServer = require('http');

var VERSION = '0.1.12';

var sys = {__version: VERSION};
var server = express();
var main = express();
var mainServer = undefined;

var allowCrossDomain = function (req, res, next) {
    'use strict';
    res.header('Access-Control-Allow-Origin', sys.allowOrigins);
    res.header('Access-Control-Allow-Credentials', sys.credentials);
    res.header('Access-Control-Allow-Methods',
               'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow_Headers', 'Content-Type');
    next();
};

// check if the requested URL contains file extensions
var checkUrl = function (req, res, next) {
    'use strict';
    // only if contains sub-levels
    if (req.method.toUpperCase() === 'GET' && req.url.indexOf('.') === -1 &&
        req.url.lastIndexOf('/') !== req.url.length - 1) {
        res.redirect(req.url + '/');
    } else {
        next();
    }
};

var configMiddleware = function (json) {
    'use strict';
    sys.allowOrigins = json.origins || '*';
    sys.credentials = json.credentials || 'false';

    main.use(express.compress());
    main.use(express.bodyParser());
    main.use(express.methodOverride());
    main.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    main.use(allowCrossDomain);
    main.use(checkUrl);

    console.log('Allow Origins: '.green + sys.allowOrigins);
    console.log('Allow Credentials: '.green + sys.credentials);
};

var prepareFilename = function (filename) {
    'use strict';
    filename = filename.replace(/\$ROOT/g, sys.root);
    filename = filename.replace(/\$NOVER/g, __dirname);
    filename = filename.replace(/\$PWD/g, process.cwd());
    return filename;
};

var prepareDomain = function (url) {
    'use strict';
    url = url.replace(/\$DOMAIN/g, sys.top);
    return url;
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
                console.log('Site:'.blue, domain,
                           '('.blue, directory, ')'.blue);
            }
        });
    }
    app.use(app.router);
};

var interpretSockets = function (sockets, app) {
    'use strict';
    if (sockets) {
        sockets.forEach(function (socket) {
            var port = socket.port || process.env.PORT;
            var local = socket.local || undefined;
            var filename;
            if (local) {
                var httpd;
                if (typeof port === 'string') {
                    port = port.replace(/\$PORT/, sys.httpPort);
                    port = parseInt(port, '10');
                }
                if (port === process.env.PORT || port === '$PORT') {
                    httpd = httpServer.createServer(app);
                } else {
                    httpd = httpServer.createServer(main);
                }
                filename = prepareFilename(local);
                require(filename).__socket(httpd);
                console.log('WebSocket:'.cyan, local,
                            '('.cyan, port, ')'.cyan);
                if (port !== sys.httpPort) {
                    httpd.listen(port);
                } else {
                    mainServer = httpd;
                    console.log('WebSocket listening awaits top listener.'.orange);
                }
            }
        });
    }
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
                console.log('API:'.yellow, uri, '('.yellow,
                            method.toUpperCase().yellow, '|'.yellow,
                           local, ')'.yellow);
            }
        });
    }
};

var loadFromJson = function (json) {
    'use strict';

    // config middleware
    configMiddleware(json);

    // set main domain
    sys.top = json.domain || '127.0.0.1';
    main.use(express.vhost(sys.top, server));
    console.log('Main domain: '.green + sys.top);

    // set httpPort
    sys.httpPort = json.port || process.env.PORT;
    console.log('HTTP Port: '.green + sys.httpPort);

    sys.root = json.root || '';
    console.log('Root: '.green + sys.root);

    sys.log = json.log || 0;
    if (sys.log === 1 || sys.log === 'true') {
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

     // now bring in Sockets
    sys.sockets = json.sockets || undefined;
    interpretSockets(sys.sockets, server);
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
                var sockets = vhost.sockets || undefined;
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
                if (sockets) {
                    interpretSockets(sockets, vApp);
                }
                main.use(express.vhost(prepareDomain(vhost.subdomain), vApp));
                console.log('Registered vitual host "'.green + vhost.subdomain + '".'.green);
                console.log('-------------------\n'.green);
            }
        });
    }
};

module.exports = function (argv) {
    'use strict';

    if (argv.length < 3) {
        console.log('Nover version'.green, sys.__version.green);
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

        if (mainServer === undefined) {
            mainServer = main;
        }
        mainServer.listen(sys.httpPort);
        console.log('================'.green);
        console.log('Now listening...'.green);
    }, function (err) {
        console.error(err.red);
    });
};

