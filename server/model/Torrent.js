/* jshint globalstrict: true */
/* global require, module, Buffer */

"use strict";

let Promise = require("bluebird"),
    mongoose = require("mongoose"),
    parseTorrent = require("parse-torrent"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Torrent;

const TYPE_PAGE = "page",
      TYPE_URL = "url";

// XXX: Do we want to mirror the API exposed by webtorrent's torrent objects?
let torrentSchema = new Schema({
    type: { type: String, enum: [ TYPE_PAGE, TYPE_URL ]},
    // TODO: rename data -> metadata
    data: Buffer,
    // TODO: add files array, using gridfs
    page: { type: ObjectId, ref: "Page" },
    // XXX: Perhaps make URL be its own type?
    url: String
});

torrentSchema.virtual("infoHash").get(function() {
    return parseTorrent(this.data).infoHash;
});

// See if constants actually work

torrentSchema.static("createFromPage", function(page) {
    // TODO
});

torrentSchema.static("findByUrl", function(url) {
    return Torrent.findOneAsync({
        type: TYPE_URL,
        url: url
    });
});

torrentSchema.static("findByPage", function(page) {
    return Torrent.findOneAsync({
        type: TYPE_PAGE,
        page: page
    });
});

Torrent = mongoose.model("Torrent", torrentSchema); 

// TODO: Use defineProperty to ensure immutable
Torrent.TYPE_URL = TYPE_URL;
Torrent.TYPE_PAGE = TYPE_PAGE;

Promise.promisifyAll(Torrent);
Promise.promisifyAll(Torrent.prototype);

module.exports = Torrent;
