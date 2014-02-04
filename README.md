## Nover

#### The Node.js powered HTTP server.

Why Nover?
==========

As a Web developer, I often found that I really need a HTTP server which is more comprehensive than *Python SimpleHttpServer* but more light-weight than Apache and Nginx.

Supports
========

* Static Web sites.
* RESTful APIs written in Node.js.

Usage
=====

    nover <config_file>

Sample config
=============

```json
{
    "port": 8080,
    "log": 1,
    "root": "/Users/admin/",
    "sites": [{
        "domain": "/",
        "local": "$ROOT/static/public"
    },
    {
        "domain": "/test",
        "local": "$ROOT/Desktop/html"
    }],
    "apis": [{
        "uri": "/api/name/:name",
        "method": "get",
        "local": "$ROOT/example/api.js"
    }]
}
```

Sample RESTful API
==================

**To register Node.js powered APIs, please make sure the exposes of `module.export = function (req, res) { ... }`**

```javascript
#!/usr/bin/env node
var nover = require('../lib/nover');
nover(process.argv);
```

