/* jshint globalstrict: true */
/* global require, module */

"use strict";

let sha1 = require("simple-sha1"),
    Promise = require("bluebird");

function sha1Async(value) {
    let hashDeferred = Promise.defer();

    sha1(value, function(hash) {
        hashDeferred.resolve(hash);
    });

    return hashDeferred.promise;
}

module.exports = sha1Async;
