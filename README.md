## Nover

#### A Node.js powered HTTP server.

[![Build Status](https://travis-ci.org/hufyhang/nover.png?branch=master)](https://travis-ci.org/hufyhang/nover)

[![NPM](https://nodei.co/npm/nover.png)](https://nodei.co/npm/nover/)

Why Nover?
==========

As a Web developer, I often found that I really need a HTTP server which is more comprehensive than *Python SimpleHttpServer* but more light-weight than Apache and Nginx.

Supports
========

* Static Web sites
* RESTful APIs written in Node.js
* WebSocket
* URL Rewrite
* Virtual Hosts
* Customized middleware
* CPU cluster load balancing

Usage
=====

Without CPU cluster load balancing:

    nover <config_file>

With CPU cluster load balancing:

    nover -c <config_file>


Config Tips
===========

* Run `nover -h` to show an example nover config.
* If `port` is not given in the top section of config files, HTTP port will be assigned to `process.env.PORT`.
* Use `$ROOT` as the shorthand of the document root defined by `root`.
* Use `$PWD` to represent the location of the config file.
* Use `$DOMAIN` to indicate the main domain set by `domain`.
* For WebSocket, `$PORT` can be used to indicate the same port defined by `port` in the top section of config file.
* When setting rewrites, please be awared that the request urls will also contain a leading `/` (slash). For example, to rewrite `example.com/nover` the `pattern` should be something like `^/nover/?$` rather than `^nover/?$`.
* System variables are not supported in the `data` attributes of APIs and Sockets.
* If Socket.io is used under CPU Cluster mode (`nover -c`), you may consider to use Redis to address the well-known "*client not handshaken client should reconnect*" issue by following this [link](https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO).

Sample config
=============

```json
{
    "port": 8080,
    "log": "true",
    "origins": "*",
    "credentials": "false",
    "root": "/Users/nover/",
    "middlewares": [
        "$ROOT/middle/handler.js"
    ],
    "top": "example.io",
    "rewrite": [{
      "pattern": "^/service/?$",
      "replace": "/search/"
    },
    {
      "pattern": "^/show/([0-9]+)/?$",
      "replace": "/git/#/$1"
    }],
    "require": [
        "$ROOT/addon.js"
    ],
    "sites": [{
        "url": "/",
        "local": "$ROOT/server/public"
    },
    {
        "url": "/test",
        "local": "$ROOT/html"
    }],
    "apis": [{
        "uri": "/api/name/:name",
        "method": "get",
        "local": "$ROOT/Workstation/nover/example/api.js",
        "data": {
             "version": 1
        }
    },
    {
        "uri": "/api/name",
        "method": "post",
        "local": "$ROOT/Workstation/nover/example/api.js"
    }],
    "sockets": [{
        "port": "$PORT",
        "local": "$PWD/socket.js"
    }],
    "vhosts": [{
        "subdomain": "foo.$DOMAIN",
        "sites": [{
            "url": "/",
            "local": "$ROOT/Desktop/html"
        }],
        "sockets": [{
            "port": 8090,
             "local": "$ROOT/socket/app.js"
        }]
    },
    {
         "subdomain": "bar.$DOMAIN",
         "sites": [{
             "url": "/",
             "local": "$ROOT/Sites"
         }]
    }]
}
```

Sample RESTful API
==================

**To register Node.js powered APIs, please make sure the exposes of `__get`, `__post`, `__delete`, `__put`, and `__all`**

```javascript
#!/usr/bin/env node
exports.__get = function (req, res, data) {
    'use strict';
    var name = req.params.name;
    res.send('Hello, ' + name);
};
```

Sample Socket.io App
====================

**Please make sure your app exposes `__socket` for Nover.**

```javascript
#!/usr/bin/env node

exports.__socket = function (server, data) {
    'use strict';
    var io = require('socket.io').listen(server);

    io.sockets.on('connection', function (socket) {
        'use strict';
        socket.emit('news', {hello: 'world!!!'});
        socket.on('message', function (data) {
            console.log(data);
        });
    });

};
```

Sample Middleware
=================

**Please make sure your module exposes `__middle`**

```javascript
exports.__middle = function (req, res, next) {
    'use strict';
    console.log(req.url);
    next();
};
```

Sample Require Module
=====================

**Please make sure your required Nover module exposes `__require`**

The parameter data is an object that contains:

* http: The main HTTP object of Nover server.
* port: The main port number.
* root: The `root` directory.
* domain: The main domain.

```javascript
exports.__require = function (data) {
     'use strict';
     var http = data.http;
     http.get('/dev/api/:username', function () {
             ...
     });
};
```

License
=======

Nover is licensed under MIT.
