/* jshint globalstrict: true */
/* global require, module, Buffer */

"use strict";

let Promise = require("bluebird"),
    mongoose = require("mongoose"),
    parseTorrent = require("parse-torrent"),
    dhtUtils = require("../util/dht"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Torrent;

// XXX: Do we want to mirror the API exposed by webtorrent's torrent objects?
let torrentSchema = new Schema({
    // TODO: rename data -> metadata
    data: Buffer,
    // TODO: add files array, using gridfs
    page: { type: ObjectId, ref: "Page" },
});

torrentSchema.virtual("url").get(function() {
    return this.page.url;
});

torrentSchema.virtual("infoHash").get(function() {
    return parseTorrent(this.data).infoHash;
});

torrentSchema.static("lookupDht", Promise.coroutine(function *(lookupService, page) {
    let newTorrent = new Torrent({ page: page });

    /* FIXME: This could take a while, or potentially never resolve, if there
       are no seeds available. Need to handle this cleanly */
    newTorrent.data = yield dhtUtils.getTorrentDataForUrl(lookupService, page.url);

    // XXX: Handle this better
    if (!newTorrent.data) throw new Error("no torrent data! :<");

    return newTorrent.saveAsync().get(0);
}));

torrentSchema.static("findByPage", function(page) {
    return Torrent.findOneAsync({ page: page });
});

// XXX: This method would likely be better placed elsewhere
torrentSchema.method("getResources", Promise.coroutine(function *(){
    /* TODO: download torrent, for each file therein return this structure:
        {
            path: <relative path>,
            contentType: <sniffed content type>,
            fileId: <Object id of file saved to gridfs>
        }
    */
    
    return [];
}));

Torrent = mongoose.model("Torrent", torrentSchema); 

Promise.promisifyAll(Torrent);
Promise.promisifyAll(Torrent.prototype);

module.exports = Torrent;
