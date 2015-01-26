/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Storage = require("webtorrent/lib/storage");

function GridFSStorage(parsedTorrent, opts) {
    // TODO: extend opts with defaults
    // TODO: Throw if mandatory defaults (db) not provided
    /* TODO: Options to include:
        * db
        * mongo
    */

    Storage.call(this, parsedTorrent, opts);

}

GridFSStorage.prototype = Object.create(Storage);

GridFSStorage.prototype.writeBlock = function(index, offset, buffer, cb) {
    // TODO
};

GridFSStorage.prototype.readBlock = function(index, offset, length, cb) {
    // TODO
};

GridFSStorage.prototype.remove = function(cb) {
    // TODO
};

GridFSStorage.prototype.close = function(cb) {
    // TODO
};

module.exports = GridFSStorage;
