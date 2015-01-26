/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Promise = require("bluebird"),
    Page = require("../model/Page"),
    sha1 = require("../util/sha1"),
    DHT = require("bittorrent-dht");

function LookupService() {
    let readyDeferred = Promise.defer();
    let dht = new DHT();

    dht.on("ready", function() {
        readyDeferred.resolve();
    });

    this.dht = dht;
    this.ready = readyDeferred.promise; 
}

LookupService.prototype.start = Promise.coroutine(function *() {
    let self = this;

    yield Page.findAsync().each(Promise.coroutine(function *(page) {
        let urlhash = yield sha1(page.url);
        // Ensure DHT is ready
        yield self.ready;

        console.log(page);
    }));
});

module.exports = LookupService;
