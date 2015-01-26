/* jshint globalstrict: true */
/* global require, module */

"use strict";

let WebService = require("./services/WebService.js"),
    TorrentService = require("./services/TorrentService.js"),
    mongoose = require("mongoose"),
    db = mongoose.connection,
    // TODO: Get port from nconf or similar
    /* FIXME: Reading port from command-line arguments is just for dev, remove
       and set properly from nconf or similar
    */
    webService = new WebService({ port: process.argv[2] }),
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

/* FIXME: Getting db name from args is just for dev, remove this and get it from
   from nconf or similar */
let dbName = process.argv[3] || "everarchive";

console.log("Using database: " + dbName);

mongoose.connect("mongodb://localhost/" + dbName);
