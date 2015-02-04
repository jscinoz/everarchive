/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Promise = require("bluebird"),
    sha1 = require("./sha1"),
    debug = require("debug")("dht");

// TODO: Rework to use LookupService
let getTorrentDataForUrl = Promise.coroutine(function *(lookupService, pageUrl) {
    // XXX: Perhaps get a few peers, check for consensus on page .torrent infohash?
    let peer = (yield lookupService.getPeers(yield sha1(pageUrl), 12))[0];

    // TODO; Look up dht for sha1 of given url, return .torrent data for
    // corresponding page data. resolve with null (or throw?) otherwise

    debug("Got peer: " + peer);

    // TODO
    return null;
});

module.exports = {
    getTorrentDataForUrl: getTorrentDataForUrl
};
