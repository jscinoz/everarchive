/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Page = require("../model/Page"),
    Torrent = require("../model/Torrent"),
    sha1 = require("../util/sha1");

function *getTorrent() {
    /* jshint validthis: true */

    /* XXX: Perhaps key on infohash, and add infohash to torrent schema (rather
       than virtual). If we do this, add validation / pre-save hook to update */

    let pageUrl = this.params.pageUrl;

    /* FIXME: This is at best, inefficient, and at worst, slow, perhaps store
       URL on the Torrent document so we can look up directly */ 
    /* FIXME: Move this to Torrent.findByPageUrl, and ensure it throws (or
       returns null?) if not found */
    let torrent = yield Torrent.findOneAsync({
        page: yield Page.findOneAsync({ url: pageUrl }) 
    });

    this.type = "application/x-bittorrent";
    this.body = torrent.data;
    this.attachment(torrent.infoHash + ".torrent");
}

module.exports = getTorrent;
