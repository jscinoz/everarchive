/* jshint globalstrict: true */
/* global require, module, __dirname, Buffer */

"use strict";

let Promise = require("bluebird"),
    AssetGraph = require("assetgraph"),
    streamifer = require("streamifier"),
    mongoose = require("mongoose"),
    //Grid = require("gridfs-stream"),
    mongo = mongoose.mongo,
    Grid = mongo.Grid,
    path = require("path"),
    parseTorrent = require("parse-torrent"),
    createTorrent = Promise.promisify(require("create-torrent")),
    Torrent = require("./model/Torrent");

// Async magic!
//Promise.promisifyAll(Grid);
//Promise.promisifyAll(Grid.prototype);

// XXX: Should the saving of objects be the responsibility of the caller, or the model methods themselves?
let buildUrlTorrent = Promise.coroutine(function *(url) {
    let urlTorrent = new Torrent({
        type: Torrent.TYPE_URL,
        url: url,
        data: yield createTorrent(new Buffer(url), { name: "pageUrl" })
    });

    return urlTorrent.saveAsync().get(0);
});

let crawlUrl = Promise.coroutine(function *(url) {
    // TODO: Cleanup decls, define closest to first use
    // FIXME: Should probably not include scripts. If we don't include them, we need to strip them out of the graph too. see removeEmptyJavaScripts transform
    // TODO: Also, script out dead scripts (i.e. those on other domains);
    let ignoredTypes = [ "HtmlAnchor" ],
        // FIXME: NEED URL VALIDATION
        rootUrl = url,
        graph = new AssetGraph(),
        // XXX: Put under global requires?
        query = AssetGraph.query;

    // FIXME: Perhaps just use assetgraph to collect URLs, and still use node-crawler to actually fetch, stream content directly to gridfs? (current approach will likely have memory issues, maybe)

    let crawlDeferred = Promise.defer();

    // TODO: Use addAsset to output crawl progress
    graph.on("addAsset", function(asset) {
        // TODO create promise for each asset, resolve in load callback, use these to display overall progress
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
            type: query.not(ignoredTypes),
            hrefType: [ "relative", "rootRelative" ]
        }
    })
    // XXX: Rename files to hash of contents?
    .moveAssetsInOrder({
        isInline: false,
        url: query.not(rootUrl)
    }, function(asset) {
        let origUrl = asset.url,
            // FIXME: Don't define regexp here, do it in module global
            // FIXME: Shouldn't hardcode url prefix
            newUrl = asset.url.replace(
                new RegExp("^" + rootUrl + "/"),
                "./"
            );

        console.log("Moving " + origUrl + " -> " + newUrl);
        // TODO: as a hack, try setting asset._url directly?

        // FIXME: This doesn't seem to actually rewrite URLs in page index - WTF?
        // TODO: Come back to this when we've received a response to issue #234
        return newUrl;
    })
    // TODO: Remove script tags?
    .moveAssets({ url: rootUrl }, "index.html")
    // XXX: This is for debug only, remove once working
    .writeAssetsToDisc({ isLoaded: true }, "/tmp/ag-test-output")
    // TODO: Any unhandled assets (HtmlAnchors), make URLS absolute
    // TODO: Instead of doing index special case later, do it in transform here
    .run(function() {
        crawlDeferred.resolve();
    });

    // TODO: Probably need timeouts and other limits to prevent runaway

    // Wait for graph to be in final state
    yield crawlDeferred.promise;

    return graph.findAssets({ isInline: false }).map(function(asset) {
        // TODO: Null checking
        // FIXME: Don't define regexp here, do it in module global
        let resourcePath = asset.url.replace(new RegExp("^" + rootUrl), ""); 

        console.log("resourcePath: " + resourcePath);

        // TODO: Probably worth defining a type for this extended buffer
        let contentBuf = asset.rawSrc;
        if (asset.contentType === "application/x-javascript") { 
            // Deal with assetgraph returning obsolete content type
            // FIXME: assetgraph should fix this upstream.
            contentBuf.contentType = "application/javascript";
        } else {
            contentBuf.contentType = asset.contentType;
        }

        // FIXME: Need to be consistent with leading / or ./ or none
        contentBuf.name = resourcePath;

        return contentBuf;
    });
});

// XXX: Maybe expose infohash for validation purposes - so multiple instances of the gateway can prove real copy
let buildPageTorrent = Promise.coroutine(function *(urlTorrent, page, fileBuffers) {
    let pageTorrent = new Torrent({
        type: Torrent.TYPE_PAGE,
        page: page,
        data: yield createTorrent(fileBuffers, {
            name: parseTorrent(urlTorrent).infoHash 
        })
    });

    return pageTorrent.saveAsync().get(0);
});

let archive = Promise.coroutine(function *(page) {
    let url = page.url,
        // XXX: Create URL torrent in page constructor?
        urlTorrent = yield Torrent.findByUrl(url),
        pageTorrent = yield Torrent.findByPage(page);

    if (!urlTorrent) {
        urlTorrent = yield buildUrlTorrent(url);
    }

    // TODO: Attempt to retrieve pageTorrent from urlTorrent

    if (!pageTorrent) {
        let fileBuffers = yield crawlUrl(url);

        pageTorrent = yield buildPageTorrent(urlTorrent, page, fileBuffers); 

        let gfs = new Grid(mongoose.connection.db); 
        page.resources = yield Promise.map(fileBuffers, function(buffer) {
            return Promise.props({
                path: buffer.name,
                contentType: buffer.contentType,
                // TODO: Implement a writeAssetsToGridFS transform for assetgraph, and store assets there. Then, create torrent based on data in gfs
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
