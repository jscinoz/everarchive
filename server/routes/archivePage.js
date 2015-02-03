/* jshint globalstrict: true */
/* global require, module, __dirname */

"use strict";

let url = require("url"),
    Page = require("../model/Page"),
    assert = require("assert");

/* FIXME: This module does too much, split routes into their own modules, and
   likely move some functionality to Page/Torrent */
function *archivePage() {
    /* jshint validthis: true */

    // TODO: null checking
    /* TODO: Strip hash from URL (maybe? are we gonna try execute any page
       scripts?) */
    // XXX: Parse url?
    let pageUrl = this.request.body.url;
    let page = yield Page.findByUrl(pageUrl);
    let alreadyArchived = page !== null;

    if (!alreadyArchived) {
        // TODO: This takes a while, need to show progress
        page = yield Page.archive(this.app.lookupService, pageUrl);
    }

    // XXX: Remove asserts, proper exception handling
    assert(page !== null, "Page is null");
    assert(page !== undefined, "Page is undefined");

    /* TODO: pass through status (already archived / archived successfully),
       flash message? */
    this.redirect("/archive/" + encodeURIComponent(page.url));
}

module.exports = archivePage;
