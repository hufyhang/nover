#!/usr/bin/env node
module.exports = function (req, res) {
    'use strict';
    var name = req.params.name;
    res.send('Hello, ' + name);
};
