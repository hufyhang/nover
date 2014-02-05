## Nover

#### A Node.js powered HTTP server.

Why Nover?
==========

As a Web developer, I often found that I really need a HTTP server which is more comprehensive than *Python SimpleHttpServer* but more light-weight than Apache and Nginx.

Supports
========

* Static Web sites.
* RESTful APIs written in Node.js.
* Virutal Hosts

Usage
=====

    nover <config_file>

Sample config
=============

```json
{
    "port": 8080,
    "log": 1,
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
    "vhosts": [{
        "subdomain": "foo.example.io",
        "sites": [{
            "url": "/",
            "local": "$ROOT/Desktop/html"
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

