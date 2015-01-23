/* jshint globalstrict: true */
/* global require, module, __dirname, Buffer */

"use strict";

let Promise = require("bluebird"),
    mongoose = require("mongoose"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Grid = require("gridfs-stream"),
    Archiver = require("../archiver"),
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
    let resources = this.resources;

    for (let i = 0, ii = resources.length; i < ii; ++i) {
        let resource = resources[i];

        if (resource.path === path) {
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
pageSchema.static("exists", Promise.coroutine(function *(pageUrl) {
    return (yield Page.countAsync({ url: pageUrl })) > 0;
}));
*/

Page = mongoose.model("Page", pageSchema);

// Add promise magic
Promise.promisifyAll(Page);
Promise.promisifyAll(Page.prototype);

module.exports = Page;
