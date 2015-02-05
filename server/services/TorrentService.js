/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Promise = require("bluebird"),
    Torrent = require("../model/Torrent"),
    parseTorrent = require("parse-torrent"),
    mongoose = require("mongoose"),
    GridFSStorage = require("../storage/GridFSStorage"),
    WebTorrent = require("webtorrent"),
    debug = require("debug")("TorrentService");

// TODO: Notify of newly added torrents
function TorrentService() {
    this.client = new WebTorrent();
    // TODO
}

TorrentService.prototype.add = function(torrent) {
    let client = this.client,
        parsedTorrent = parseTorrent(torrent.data),
        torrentDeferred = Promise.defer();

    debug("Adding torrent " + parsedTorrent.infoHash + "...");

    torrent = client.add(parsedTorrent, {
        storage: GridFSStorage.bind(null, {
            db: mongoose.connection.db,
            mongo: mongoose.mongo
        })
    });

    let onTorrent = function(port) {
        debug("Added torrent " + torrent.infoHash + " on port " + port + ".");

        torrent.removeListener("listening", onTorrent);

        // XXX: Would there be any utility in resolving with the torrent object?
        torrentDeferred.resolve();
    };

    torrent.on("listening", onTorrent);

    return torrentDeferred.promise;
};

TorrentService.prototype.start = Promise.coroutine(function *() {
    let startupDeferred = Promise.defer();

    console.log("Starting torrent service...");

    /* XXX: Need to consider scalability of this, do we really want to seed
       every torrent, or perhaps a random, rotating subset */
    yield Promise.all(Torrent.findAsync().map(this.add.bind(this)));

    console.log("Torrent service startup complete.");
});


module.exports = TorrentService;
