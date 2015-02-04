/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Promise = require("bluebird"),
    Torrent = require("../model/Torrent"),
    parseTorrent = require("parse-torrent"),
    mongoose = require("mongoose"),
    GridFSStorage = require("../storage/GridFSStorage"),
    WebTorrent = require("webtorrent");

// TODO: Notify of newly added torrents
function TorrentService() {
    this.client = new WebTorrent();
    // TODO
}

TorrentService.prototype.start = Promise.coroutine(function *() {
    let client = this.client;
    let startupDeferred = Promise.defer();
    let seedPromises = [];

    console.log("Starting torrent service...");

    /* XXX: Need to consider scalability of this, do we really want to seed
       every torrent, or perhaps a random, rotating subset */
    Torrent.findAsync().each(function(torrent) {
        let parsedTorrent = parseTorrent(torrent.data),
            torrentDeferred = Promise.defer();

        console.log("Starting to seed torrent " + parsedTorrent.infoHash + "...");

        client.add(parsedTorrent, {
            storage: GridFSStorage.bind(null, {
                db: mongoose.connection.db,
                mongo: mongoose.mongo
            })
        }, function(torrent) {
            console.log("Seeding startup complete for " + torrent.infoHash + ".");

            // XXX: Do we need to actually pass out the torrent?
            torrentDeferred.resolve(torrent);
        });

        seedPromises.push(torrentDeferred.promise);
    }).then(function() {
        Promise.all(seedPromises).then(function() {
            console.log("Torrent service startup complete.");
            startupDeferred.resolve();
        });
    });

    return startupDeferred.promise;
});


module.exports = TorrentService;
