/* jshint globalstrict: true */
/* global require, module, __dirname */

"use strict";

let url = require("url"),
    path = require("path"),
    koa = require("koa"),
    router = require("koa-router"),
    logger = require("koa-logger"),
    bodyParser = require("koa-body"),
    mongoose = require("mongoose"),
    fileServer = require("koa-file-server")({
        root: path.resolve(__dirname, "../client"),
        index: true
    }),
    Page = require("./model/Page"),
    assert = require("assert"),
    app = koa();

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
        page = yield Page.archive(pageUrl);
    }

    assert(page !== null, "Page is null");
    assert(page !== undefined, "Page is undefined");

    /* TODO: pass through status (already archived / archived successfully),
       flash message? */
    this.redirect("/archive/" + encodeURIComponent(page.url));
}

// TODO: Support either pageUrl or url hash
// TODO: Rather than spinning on server, we should return a page and push,
// via WS or SPDY, the content when available
function *getArchivedPage() {
    /* jshint validthis: true */

    // TODO: URL validation, etc
    let pageUrl = this.params.pageUrl;
    let resource = this.params.resource;
    let page = yield Page.findByUrl(pageUrl);


    if (!page) {
        // Attempt to retrieve page from torrent
        page = yield Page.tryRetrieve(url);    
    }

    /* TODO: If page isn't in local cache, look up torrent. If it exists, start
       downloading & present feedback page to user. */
    /* TODO: If page isn't archived _anywhere_ return message that page isn't
       archived, ask user if they wish to archive it */
    if (!page) {
        this.throw(404, "Page not yet archived");
    }
    
    if (!resource) {
        resource = "index.html";

        // Need to redirect so the browser resolves relative URLs correctly
        // FIXME: Would be nice to not require this redirect
        this.redirect(this.url + "/index.html");
    }

    // TODO: SPDY push?
    // XXX: Confirm that we never have a page object without a local cache  
    this.type = page.getResourceContentType(resource);
    this.body = page.getResourceStream(resource);
}

// Log all the things!
app.use(logger());

// Serve static files
app.use(fileServer);

// Set up router
app.use(router(app));

// Route registration
app.get("/archive/:pageUrl/:resource*", getArchivedPage);
app.post("/archive", bodyParser(), archivePage);

// TODO: get DB conn params from nconf
// TODO: Automate database creation?
// Estalish mongoose connection
mongoose.connect("mongodb://localhost/everarchive");
let db = mongoose.connection;

db.on("error", console.error.bind(console, "Mongoose connection error:"));

db.once("open", function() {
    app.listen(3000);
    // TODO: Start torrent server seeding all torrents

    console.log("EverArchive server startup complete");
});
