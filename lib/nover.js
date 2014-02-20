var express = require('express');
var color = require('colors');
var pros = require('./promises');
var httpServer = require('http');

var VERSION = '0.1.30';

var sys = {__version: VERSION};
var server = express();
var main = express();
var mainServer;

var defaultHeaders = function (req, res, next) {
  'use strict';
  res.header('Server', 'Nover (version: ' + VERSION + ')');

  next();
};

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
  main.use(defaultHeaders);
  main.use(allowCrossDomain);
  main.use(checkUrl);

  console.log('Allow Origins: '.green + sys.allowOrigins.bold);
  console.log('Allow Credentials: '.green + sys.credentials.bold);
};

var addMiddlewares = function (middlewares) {
  'use strict';
  middlewares.forEach(function (middle) {
    main.use(require(prepareFilename(middle)).__middle);
    console.log('Middleware:'.green, middle);
  });
};

var addRequires = function (requires, app) {
  'use strict';

  var data = {
    port: sys.httpPort,
    http: app,
    domain: sys.top,
    root: sys.root
  };

  requires.forEach(function (item) {
    var filename = prepareFilename(item);
    require(filename).__require(data);
    console.log('Require:'.green, filename);
  });
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

var interpretRewrite = function (rewrite) {
  'use strict';
  rewrite.forEach(function (item) {
    if (item.pattern && item.replace) {
      // set up a rewriteMiddleware
      var rewriteMiddleware = function (req, res, next) {
        var regex = new RegExp(item.pattern, item.flags);
        var hits = req.url.match(regex);
        if (hits) {
          var url = item.replace;
          // has to ignore the first hit -- the item.replace itself
          for (var index = 1; index !== hits.length; ++index) {
            var reg = '\\$' + index;
            url = url.replace(new RegExp(reg), hits[index]);
          }
          res.redirect(url);
        } else {
          next();
        }
      };

      main.use(rewriteMiddleware);
      var logFlags = item.flags || 'N/A';
      console.log('Rewrite:'.magenta, item.pattern, '('.magenta, item.replace,
                  '|'.magenta, logFlags, ')'.magenta);
    }
  });
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
        console.log('Site:'.blue, domain.underline,
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
      var data = socket.data || undefined;
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
        require(filename).__socket(httpd, data);
        console.log('WebSocket:'.cyan, local,
                    '('.cyan, port, ')'.cyan);

        // make sure sys.httpPort is a Number
        if (typeof sys.httpPort === 'string') {
          sys.httpPort = parseInt(sys.httpPort, '10');
        }

        // for $PORT, use system mainServer to listen
        if (port !== sys.httpPort) {
          httpd.listen(port);
        } else {
          mainServer = httpd;
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
      var data = api.data || undefined;
      var filename;

      if(uri && method && local) {
        filename = prepareFilename(local);
        switch (method.toUpperCase()) {
        case 'GET':
          app.get(uri, function (req, res) {
            require(filename).__get(req, res, data);
          });
          break;
        case 'POST':
          app.post(uri, function (req, res) {
            require(filename).__post(req, res, data);
          });
          break;
        case 'PUT':
          app.put(uri, function (req, res) {
            require(filename).__put(req, res, data);
          });
          break;
        case 'DELETE':
          app.delete(uri, function (req, res) {
            require(filename).__delete(req, res, data);
          });
          break;
        case 'ALL':
          app.all(uri, function (req, res) {
            require(filename).__all(req, res, data);
          });
          break;
        }
        console.log('API:'.yellow, uri.underline, '('.yellow,
                    method.toUpperCase().yellow, '|'.yellow,
                    local, ')'.yellow);
      }
    });
  }
};

var loadFromJson = function (json) {
  'use strict';

  // set httpPort
  sys.httpPort = json.port || process.env.PORT;
  // force sys.httpPort to be converted into string here
  console.log('HTTP Port: '.green + ('' + sys.httpPort).bold);

  sys.root = json.root || '';
  console.log('Root: '.green + sys.root);

  // config middleware
  configMiddleware(json);

  // bring in url rewrite
  sys.rewrite = json.rewrite || undefined;
  if (sys.rewrite) {
    interpretRewrite(sys.rewrite);
  }

  // bring in customized middlewares
  sys.middlewares = json.middlewares || json.middle || undefined;
  if (sys.middlewares) {
    addMiddlewares(sys.middlewares);
  }

  // set main domain
  sys.top = json.domain || '127.0.0.1';
  main.use(express.vhost(sys.top, server));
  console.log('Main domain: '.green + sys.top.underline.red);

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

  // bring in requires
  sys.requires = json.require || undefined;
  if (sys.requires) {
    addRequires(sys.requires, server);
  }

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
        console.log('Adding virtual host: '.green +
                    vhost.subdomain.underline.red);
        var vApp = express();
        sys.vhostApp.push(vApp);
        var sites = vhost.sites || undefined;
        var apis = vhost.apis || undefined;
        var sockets = vhost.sockets || undefined;
        var favicon = vhost.favicon || undefined;
        var requires = vhost.requires || undefined;
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
        if (requires) {
          addRequires(requires, vApp);
        }
        main.use(express.vhost(prepareDomain(vhost.subdomain), vApp));
        console.log('Registered vitual host "'.green + vhost.subdomain + '".'.green);
        console.log('-------------------\n'.green);
      }
    });
  }
};

var startUp = function () {
  'use strict';

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


// will exit from Nover after showing usage information
var usageInfo = function () {
  'use strict';
  console.log('Nover version'.green, sys.__version.green);
  console.log('Fatal: Missing config file.'.red);
  console.log('Usage: nover <config file location>'.yellow);
  process.exit(0);
};

module.exports = function (argv) {
  'use strict';

  if (argv.length < 3) {
    usageInfo();
  }

  // if -hint or -h, then show example config
  var isHint = argv[2] === '--hint' || argv[2] === '-h';
  if (isHint) {
    var fs = require('fs');
    var filename = __dirname + '/../meta/config.json';
    var hint = fs.readFileSync(filename, 'utf-8');
    console.log(hint);

    process.exit(0);
  }

  // check if config file is given
  sys.config = process.argv[2];

  // see if required cpu load balancing
  var needCpus = sys.config.toUpperCase() === '-C' ||
    sys.config.toUpperCase() === '--CLUSTER';
  if (needCpus) {
    // if using cluster, config file should be the next argv
    sys.config = process.argv[3] || usageInfo();

    var cluster = require('cluster');
    var cpus = require('os').cpus().length;
    console.log('CPU Cluster: On ('.red, cpus, ')'.red);

    if (cluster.isMaster) {
      for (var index = 0; index !== cpus; ++index) {
        cluster.fork();
      }

      cluster.on('exit', function (worker, code, signal) {
        console.log('Cluster: '.red + worker.pid + '(DIED)'.red);
        console.log('Restarting...'.red);
        cluster.fork();
      });
    } else {
      startUp();
    }

  } else {
    console.log('CPU Cluster: Off'.green);
    startUp();
  }
};

