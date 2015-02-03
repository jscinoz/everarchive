/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Page = require("../model/Page");

/* TODO: Rather than spinning on server, we should return a page and push,
   via WS or SPDY, the content when available */
function *getArchivedPage() {
    /* jshint validthis: true */

    // TODO: Support either pageUrl or url hash
    // TODO: URL validation, etc
    let pageUrl = this.params.pageUrl;
    let resource = this.params.resource;
    let page = yield Page.findByUrl(pageUrl);

    if (!resource) {
        // XXX: Should we really be doing lookup inside this conditional?
        /* TODO: If page isn't in local cache, look up torrent. If it exists, start
           downloading & present feedback page to user. */
        if (!page) {
            // Attempt to retrieve page from torrent
            page = yield Page.retrieveArchivedPage(this.app.lookupService, pageUrl);
        }
        
        resource = "index.html";

        // Need to redirect so the browser resolves relative URLs correctly
        // FIXME: Would be nice to not require this redirect
        this.redirect(this.url + "/index.html");
    }

    /* TODO: If page isn't archived _anywhere_ return message that page isn't
       archived, ask user if they wish to archive it */
    if (!page) {
        this.throw(404, "Page not yet archived");
    }

    // TODO: SPDY push?
    // XXX: Confirm that we never have a page object without a local cache  
    this.type = page.getResourceContentType(resource);
    this.body = page.getResourceStream(resource);
}

module.exports = getArchivedPage;
