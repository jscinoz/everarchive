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

// TODO: Handle archiving multiple revisions of page - WILL BREAK DATA COMPAT
// TODO: AUdit gridfs-stream memory usage (Is issue #58 fixed?)
// TODO: robots.txt
// TODO: Document that model methods return promises
// TODO: move let declarations to closer to first use
// TODO: rename this file to web.js, do only webserver stuff here
// TODO: Investigate if we should use trackers or not
// TODO: Change most model methods & statics to return promises, rather than directly being generators
// TODO: Remove most asserts (or only run in dev mode), and write tests
// TODO: Follow on from above, null & type checking, error handling
// TODO: Spdy push of assets
// TODO: load config from nconf
// TODO: Redis for caching known URLs & torrents
// TODO: Support precompiled client resources AND on-the-fly compile
// TODO: Suppotr CORS
// TODO: See if we can have webtorrent read/write directly to gridfs (seems possible from webtorrent source - give array of streams)
// TODO: Validate input url is text/html - we don't want people directly archiving huge binary files... Or do we?
// TODO: if in production mode (NODE_ENV), disable mongoose autoIndex
// TODO: Consider queing crwaler tasks?

function *archivePage() {
    /* jshint validthis: true */

    // TODO: null checking
    // TODO: Strip hash from URL (maybe? are we gonna try execute any page scripts?)
    // XXX: Parse url?
    let pageUrl = this.request.body.url;
    let page = yield Page.findByUrl(pageUrl);
    let alreadyArchived = page !== null;

    if (!alreadyArchived) {
        page = yield Page.archive(pageUrl);
    }

    assert(page !== null, "Page is null");
    assert(page !== undefined, "Page is undefined");

    // TODO: pass through status, flash message?
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

    // TODO: return message that page isn't archived, ask user if they wish
    // to archive it
    if (!page) this.throw(404, "Page not yet archived");
    
//    if (resource)
    // TODO: stream out page html content, SPDY push all other resources
    // XXX: Confirm that we never have a page object without a local cache  

    this.body = page;
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
