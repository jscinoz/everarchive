/* jshint globalstrict: true */
/* global require, module */

"use strict";

let WebService = require("./services/WebService.js"),
    TorrentService = require("./services/TorrentService.js"),
    mongoose = require("mongoose"),
    db = mongoose.connection,
    // TODO: Get port from nconf or similar
    webService = new WebService({ port: 3000 }),
    torrentService = new TorrentService();

// TODO: Proper logging
db.on("error", console.error.bind(console, "Mongoose connection error:"));

db.once("open", function() {
    webService.start();
    torrentService.start();

    console.log("EverArchive server startup complete");
});

// TODO: Automate database creation?
// TODO: get DB conn params from nconf
mongoose.connect("mongodb://localhost/everarchive");
