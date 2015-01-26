/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Promise = require("bluebird"),
    Torrent = require("../model/Torrent"),
    parseTorrent = require("parse-torrent"),
    mongoose = require("mongoose"),
    GridFSStorage = require("../storage/GridFSStorage"),
    WebTorrent = require("webtorrent");

function TorrentService() {
    this.client = new WebTorrent();
    // TODO
}

TorrentService.prototype.start = Promise.coroutine(function *() {
    let client = this.client;

    /* XXX: Need to consider scalability of this, do we really want to seed
       every torrent, or perhaps a random, rotating subset */
    return Torrent.findAsync().each(function(torrent) {
        // TODO: Acutally finish this
        let parsedTorrent = parseTorrent(torrent.data),
            torrentDeferred = Promise.defer();

        client.add(parsedTorrent, {
            storage: new GridFSStorage(parsedTorrent, {
                db: mongoose.connection.db,
                mongo: mongoose.mongo
            })
        }, function(torrent) {
            console.log(torrent);

            // XXX: Do we need to actually pass out the torrent?
            torrentDeferred.resolve(torrent);
        });

        return torrentDeferred.promise;
    });
});


module.exports = TorrentService;
