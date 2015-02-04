/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Storage = require("webtorrent/lib/storage"),
    Grid = require("gridfs-stream"),
    inherits = require("util").inherits,
    debug = require("debug")("GridFSStorage");

inherits(GridFSStorage, Storage);

// When providing this to webtorrent, need to .bind(null, <preOpts>)
function GridFSStorage(preOpts, parsedTorrent, opts) {
    // XXX: Are there any other opts we need?

    // TODO: Nicer error messages?
    if (!preOpts.db) throw new TypeError("Missing db option");
    if (!preOpts.mongo) throw new TypeError("Missing mongo option");

    Storage.call(this, parsedTorrent, preOpts);

    this.gfs = new Grid(preOpts.db, preOpts.mongo); 
}

GridFSStorage.prototype.readBlock = function(index, offset, length, cb) {
    // TODO
    debug("GridFSStorage#readBlock not implemented");
};

GridFSStorage.prototype._onPieceDone = function(piece) {
    // TODO
    debug("GridFSStorage#_onPieceDone not implemented");

    Storage.prototype._onPieceDone.call(this, piece);
};

GridFSStorage.prototype.remove = function(cb) {
    // TODO
};

GridFSStorage.prototype.close = function(cb) {
    // TODO
};

module.exports = GridFSStorage;
