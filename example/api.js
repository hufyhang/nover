#!/usr/bin/env node
exports.__get = function (req, res) {
    'use strict';
    var name = req.params.name;
    res.send('Hello, ' + name + "!!!");
};

exports.__post = function (req, res) {
    'use strict';
    var name = req.body.name;
    res.send('Welcome, ' + name);
};
