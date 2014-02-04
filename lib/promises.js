#!/usr/bin/env node
var Q = require('q'),
    fs = require('fs');

exports.readfile = function (filename) {
    'use strict';
    var def = Q.defer();
    fs.readFile(filename, "utf-8", function (err, data) {
        if (err) {
            def.reject(new Error(err));
        } else {
            def.resolve(data);
        }
    });
    return def.promise;
};
