#!/usr/bin/env node
var express = require('express'),
    color = require('colors'),
    pros = require('./promises');

var sys = {};
var server = express();
server.use(express.compress());
server.use(express.bodyParser());
server.use(express.methodOverride());
server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

var prepareFilename = function (filename) {
    'use strict';
    return filename.replace(/^\$ROOT/, sys.root);
};

var loadFromJson = function (json) {
    'use strict';
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
    if (sys.sites) {
        sys.sites.forEach(function (site) {
            var domain = site.domain || undefined;
            var local = site.local || undefined;
            var directory;

            if (domain && local) {
                directory = prepareFilename(local);
                server.use(domain, express.static(directory));
                console.log('Registered site "'.green + domain +
                           '" with "'.green + directory + '".'.green);
            }
        });
    }
    server.use(server.router);

    // now bring in RESTful APIs
    sys.apis = json.apis || undefined;
    if (sys.apis) {
        sys.apis.forEach(function (api) {
            var uri = api.uri || undefined;
            var method = api.method || undefined;
            var local = api.local || undefined;
            var filename;

            if(uri && method && local) {
                filename = prepareFilename(local);
                switch (method.toUpperCase()) {
                case 'GET':
                    server.get(uri, function (req, res) {
                        require(filename).__get(req, res);
                    });
                    break;
                case 'POST':
                    server.post(uri, function (req, res) {
                        require(filename).__post(req, res);
                    });
                    break;
                case 'PUT':
                    server.put(uri, function (req, res) {
                        require(filename).__put(req, res);
                    });
                    break;
                case 'DELETE':
                    server.delete(uri, function (req, res) {
                        require(filename).__delete(req, res);
                    });
                    break;
                case 'ALL':
                    server.all(uri, function (req, res) {
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

module.exports = function (argv) {
    'use strict';

    if (argv.length < 3) {
        console.log('Fatal: Missing config file.'.red);
        console.log('Usage: node nover.js <config file location>'.yellow);
        process.exit(0);
    }

    // check if config file is given
    sys.config = process.argv[2];
    console.log('Config: '.green + sys.config);

    // read in config file first
    console.log('Now reading config file...'.green);
    pros.readfile(sys.config)
    .then(function (data) {
        var json = JSON.parse(data);
        loadFromJson(json);

        server.listen(sys.httpPort);
        console.log('Now listening...'.green);
    }, function (err) {
        console.error(err);
    });
};

