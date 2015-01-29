/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Promise = require("bluebird"),
    mongoose = require("mongoose"),
    url = require("url"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Grid = require("gridfs-stream"),
    Archiver = require("../util/archiver"),
    Torrent = require("./Torrent"),
    Page;

// TODO: Add validation & constraints to schema
// TODO: Unify overlap between this and Torrent
let pageSchema = new Schema({
    url: String,
    archivedOn: Date,
    // XXX: Should resources be their own collection?
    resources: [{
        path: String, 
        contentType: String,
        fileId: ObjectId
    }],
    torrent: { type: ObjectId, ref: "Torrent" }
});

/* XXX: Add url hash virtual, or add as proper field, but have validation to
   ensure hash is up to date */

pageSchema.static("archive", function(pageUrl) {
    let page = new Page({
        url: pageUrl
    });

    return Archiver.archive(page);
});

pageSchema.static("findByUrl", function(pageUrl) {
    return Page.findOneAsync({ url: pageUrl });
});

pageSchema.static("retrieveArchivedPage", Promise.coroutine(function *(lookupService, pageUrl) {
    let newPage = new Page({
            url: pageUrl
        }),
        // XXX: Need to ensure this throws if torrent can't be found
        newTorrent = newPage.torrent = yield Torrent.lookupDht(lookupService, newPage);

    // Populate resources in GridFS from torrent
    newPage.resources = yield newTorrent.getResources();

    // FIXME: This is wrong. We must retrieve the original archivedOn value
    // page.archivedOn = Date.now();

    return newPage.saveAsync().get(0);
}));

pageSchema.method("getResourceByPath", function(path) {
    let resolvedPath = [url.parse(this.url).hostname, path].join("/");
    let resources = this.resources;

    for (let i = 0, ii = resources.length; i < ii; ++i) {
        let resource = resources[i];

        if (resource.path === resolvedPath) {
            return resource;
        }
    }

    // XXX: Better to throw or return null?
    throw new Error("Resource for path \"" + path + "\" not found.");
});

pageSchema.method("getResourceStream", function(path) {
    let resource = this.getResourceByPath(path),
        gfs = new Grid(mongoose.connection.db, mongoose.mongo);

    return gfs.createReadStream({
        _id: resource.fileId 
    });
});

pageSchema.method("getResourceContentType", function(path) {
    let resource = this.getResourceByPath(path);

    return resource.contentType;
});

/*
    If we are archiving a page, then we create:
        PageTorrent: Contains all page assets (this is content.torrent)
        URLTorrent: Contains url.json and content.torrent

    But, if we are retrieving page, all we have is the URL..
    From this URL, we need to get URLTorrent, but if we don't know the content,
    then how can we know the infohash for URLTorrent?

*/

/*
pageSchema.static("exists", Promise.coroutine(function *(pageUrl) {
    return (yield Page.countAsync({ url: pageUrl })) > 0;
}));
*/

Page = mongoose.model("Page", pageSchema);

// Add promise magic
Promise.promisifyAll(Page);
Promise.promisifyAll(Page.prototype);

module.exports = Page;
