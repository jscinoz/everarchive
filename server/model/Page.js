/* jshint globalstrict: true */
/* global require, module, __dirname, Buffer */

"use strict";

let Promise = require("bluebird"),
    mongoose = require("mongoose"),
    url = require("url"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Grid = require("gridfs-stream"),
    Archiver = require("../archiver"),
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
    pageTorrent: { type: ObjectId, ref: "Torrent" },
    // XXX: This could be a virtual, if createTorrent is deterministic
    urlTorrent: { type: ObjectId, ref: "Torrent" }
});

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

pageSchema.static("archive", function(pageUrl) {
    let page = new Page({
        url: pageUrl
    });

    return Archiver.archive(page);
});

pageSchema.static("findByUrl", function(pageUrl) {
    return Page.findOneAsync({ url: pageUrl });
});

/*
    If we are archiving a page, then we create:
        PageTorrent: Contains all page assets (this is content.torrent)
        URLTorrent: Contains url.json and content.torrent

    But, if we are retrieving page, all we have is the URL..
    From this URL, we need to get URLTorrent, but if we don't know the content,
    then how can we know the infohash for URLTorrent?

*/

pageSchema.static("retrieveFromURLTorrent", Promise.coroutine(function *(urlTorrent) {
    // TODO: Fetch URL torrent, then load contained torrent
}));

pageSchema.static("tryRetrieve", Promise.coroutine(function *(pageUrl) {
    // XXX: Is there any point trying to retreive the url torrent, if we don't have the page, it's unlikely we'll have this
    let urlTorrent = yield Torrent.findOneAsync({
        type: Torrent.TYPE_URL,
        url: pageUrl
    });

    console.log(urlTorrent);
    
    return Page.retrieveFromURLTorrent(urlTorrent); 
}));

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
