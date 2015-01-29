/* jshint globalstrict: true */
/* global require, module */

"use strict";

let bodyParser = require("koa-body"),
    getArchivedPage = require("./getArchivedPage"),
    archivePage = require("./archivePage"),
    getTorrent = require("./getTorrent");

function register(app) {
    app.get("/archive/:pageUrl/:resource*", getArchivedPage);
    app.get("/torrent/:pageUrl", getTorrent);

    app.post("/archive", bodyParser(), archivePage);
}

module.exports.register = register;
