## Nover

#### A Node.js powered HTTP server.

Why Nover?
==========

As a Web developer, I often found that I really need a HTTP server which is more comprehensive than *Python SimpleHttpServer* but more light-weight than Apache and Nginx.

Supports
========

* Static Web sites.
* RESTful APIs written in Node.js.
* Socket.io
* Virutal Hosts

Usage
=====

    nover <config_file>

Sample config
=============

```json
{
    "port": 8080,
    "log": "true",
    "origins": "*",
    "credentials": "false",
    "root": "/Users/nover/",
    "top": "example.io",
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
        "local": "$ROOT/Workstation/nover/example/api.js"
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
        "subdomain": "foo.example.io",
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
         "subdomain": "bar.example.io",
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
exports.__get = function (req, res) {
    'use strict';
    var name = req.params.name;
    res.send('Hello, ' + name);
};
```

Sample Socket.io App
====================

**Please make sure your app exposes `__.socket` for Nover.**

```javascript
#!/usr/bin/env node

exports.__socket = function (server) {
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

