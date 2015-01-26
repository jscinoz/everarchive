/* jshint globalstrict: true */
/* global require, module, __dirname, Buffer */

"use strict";

let Promise = require("bluebird"),
    AssetGraph = require("assetgraph"),
    streamifer = require("streamifier"),
    url = require("url"),
    mongoose = require("mongoose"),
    Grid = mongoose.mongo.Grid,
    path = require("path"),
    parseTorrent = require("parse-torrent"),
    createTorrent = Promise.promisify(require("create-torrent")),
    Torrent = require("./model/Torrent");

// Async magic!
// FIXME: Move this to async-grid module
Promise.promisifyAll(Grid);
Promise.promisifyAll(Grid.prototype);

// TODO: Some parts of this module really should be static or instance methods on Page/Torrent

// XXX: Should the saving of objects be the responsibility of the caller, or the model methods themselves?
let buildUrlTorrent = Promise.coroutine(function *(pageUrl) {
    let urlTorrent = new Torrent({
        type: Torrent.TYPE_URL,
        url: pageUrl,
        data: yield createTorrent(new Buffer(JSON.stringify({
            pageUrl: pageUrl
        })), { name: "url.json" })
    });

    return urlTorrent.saveAsync().get(0);
});

let crawlUrl = Promise.coroutine(function *(pageUrl) {
    // TODO: Cleanup decls, define closest to first use
    /* FIXME: Should probably not include scripts. If we don't include them, we
       need to strip them out of the graph too. see removeEmptyJavaScripts
       transform */
    // TODO: Also, script out dead scripts (i.e. those on other domains);
    // TODO: Probably also ignore RSS/Atom feeds
    let ignoredTypes = [ "HtmlAnchor" ],
        // FIXME: NEED URL VALIDATION
        rootUrl = pageUrl,
        rootUrlRE = new RegExp("^" + rootUrl),
        rootUrlParsed = url.parse(rootUrl),
        graph = new AssetGraph({ root: rootUrl }),
        // XXX: Put under global requires?
        query = AssetGraph.query;

    /* FIXME: Would be nice if we could get large assets (like images) as
       streams to avoid potential memory issues. See assetgraph #52 */

    let crawlDeferred = Promise.defer();

    // TODO: Use addAsset to output crawl progress
    graph.on("addAsset", function(asset) {
        /* TODO create promise for each asset, resolve in load callback, use
           these to display overall progress */
        // TODO: Proper logging
        console.log("Loading " + asset.urlOrDescription + "...");

        asset.on("load", function(asset) {
            console.log("Loaded " + asset.urlOrDescription + ".");
        });
    })
    .loadAssets(rootUrl)
    .populate({
        // XXX: Set maximum concurrency?
        followRelations: {
            // XXX: use query.not?
            type: query.not(ignoredTypes)/*,
            hrefType: [ "relative", "rootRelative" ]
            */
        }
    })
    // XXX: Rename files to hash of contents?
    .moveAssets({
        isInline: false
    }, function(asset) {
        let origUrl = asset.url,
            parsedUrl = url.parse(origUrl),
            newUrl;
            
        /* XXX: Would it be better to use multiple moveAssets transforms with
           appropriate queries, rather than this mess */
        if (origUrl === rootUrl) {
            // Special case for root page
            newUrl = "/index.html";
        } else {
            newUrl = parsedUrl.path;
        }

        // Resolve URL prior to actually updating asset
        newUrl = rootUrlParsed.resolve(parsedUrl.hostname + newUrl);

        if (!asset.fileName) {
            console.log("No file name for " + newUrl);
            // XXX: Bit dodgy, I think we'll need to be smarter than this.
            asset.fileName = "index.html";
        }

        console.log("Moving " + origUrl + " -> " + newUrl);

        return newUrl; 
    })
    // TODO: Remove script tags?
    //.moveAssets({ url: rootUrl }, "/index.html")
    // XXX: Better query?
    .updateRelations({}, { hrefType: "relative" })
    /* TODO: We still need unarchived root-relative URLs to point to the right
       place, so we may need to rewrite HTMLAnchors still */
    // TODO: Any unhandled assets (HtmlAnchors), make URLS absolute
    // TODO: Instead of doing index special case later, do it in transform here
    .run(function() {
        crawlDeferred.resolve();
    });

    // TODO: Asset deduplication?

    // TODO: Probably need timeouts and other limits to prevent runaway

    // Wait for graph to be in final state
    yield crawlDeferred.promise;

    return graph.findAssets({ isInline: false }).map(function(asset) {
        // TODO: Null checking
        let resourcePath = asset.url.replace(rootUrlRE, "");


        // TODO: Probably worth defining a type for this extended buffer
        let contentBuf = asset.rawSrc;
        if (asset.contentType === "application/x-javascript") { 
            // Deal with assetgraph returning obsolete content type
            // FIXME: assetgraph should fix this upstream.
            contentBuf.contentType = "application/javascript";
        } else {
            contentBuf.contentType = asset.contentType;
        }

        // Strip leading slash for file/buffer name
        contentBuf.name = resourcePath.replace(/^\//, "");

        return contentBuf;
    });
});

/* XXX: Maybe expose infohash for validation purposes - so multiple instances
   of the gateway can prove real copy */
let buildPageTorrent = Promise.coroutine(function *(urlTorrent, page,
                                                    fileBuffers) {
    let pageTorrent = new Torrent({
        type: Torrent.TYPE_PAGE,
        page: page,
        data: yield createTorrent(fileBuffers, {
            // TODO: Set comment to URL
            name: parseTorrent(urlTorrent).infoHash 
        })
    });

    return pageTorrent.saveAsync().get(0);
});

let archive = Promise.coroutine(function *(page) {
    let pageUrl = page.url,
        // XXX: Create URL torrent in page constructor?
        urlTorrent = yield Torrent.findByUrl(url),
        pageTorrent = yield Torrent.findByPage(page);

    if (!urlTorrent) {
        urlTorrent = yield buildUrlTorrent(pageUrl);
    }

    // TODO: Attempt to retrieve pageTorrent from urlTorrent

    if (!pageTorrent) {
        let fileBuffers = yield crawlUrl(pageUrl);

        pageTorrent = yield buildPageTorrent(urlTorrent, page, fileBuffers); 

        let gfs = new Grid(mongoose.connection.db); 
        page.resources = yield Promise.map(fileBuffers, function(buffer) {
            return Promise.props({
                path: buffer.name,
                contentType: buffer.contentType,
                /* TODO: Implement a writeAssetsToGridFS transform for
                   assetgraph, and store assets there. Then, create torrent
                   based on data in gfs */
                fileId: gfs.putAsync(buffer, {
                    content_type: buffer.contentType
                }).get("_id")
            });
        });
    }

    // FIXME: What happens if something derps here, torrent is saved, but not
    // page. Defer saving until the end? How does it transactional

    // TODO: Download torrent, populate content & resources on page
    page.urlTorrent = urlTorrent;
    page.pageTorrent = pageTorrent;

    page.archivedOn = Date.now();

    // Note: save always returns an array, even for a single document
    return page.saveAsync().get(0); 
});

module.exports.archive = archive;
