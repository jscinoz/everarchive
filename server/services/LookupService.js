/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Promise = require("bluebird"),
    Page = require("../model/Page"),
    sha1 = require("../util/sha1"),
    DHT = require("bittorrent-dht");

// TODO: Notify of newly added torrents
function LookupService(webPort) {
    let readyDeferred = Promise.defer();
    let dht = new DHT();

    // TODO: Propper logging, winston?
    dht.on("listening", console.log.bind(console, "DHT listening on port %d"));
    dht.on("error", console.error.bind(console, "DHT error: "));

    dht.on("ready", function() {
        readyDeferred.resolve();
    });

    this.webPort = webPort;
    this.dht = dht;
    this.ready = readyDeferred.promise; 
}

/* XXX: As well as listening on a random port, perhaps we should expose a
   websocket, or even a webrtc endpoint, for browsers querying directly. How
   does webtorrent do in-browser DHT */
/* XXX: Do we want any kind of authentication or encryption on the socket
   we use to request and send out .torrent files */
/* XXX: IDEA: Respond with web port, have a GET endpoint that returns .torrent
   file, since we're going to provide a link to download it anyway */

// Assumes DHT is pre-initialised and fully ready
LookupService.prototype.getPeers = function(infoHash, numPeers) {
    let dht = this.dht,
        peerDeferreds = [],
        peersFound = 0,
        onPeer = function(addr, peerInfoHash, from) {
            if (peerInfoHash === infoHash) {
                console.log("Found peer for " + infoHash + ": " + addr);
                peerDeferreds[peersFound].resolve(addr);

                peersFound++;
            }

            if (peersFound >= numPeers) {
                dht.removeListener("peer", onPeer);
            }
        };

    for (let i = 0; i < numPeers; ++i) {
        peerDeferreds.push(Promise.defer());
    }

    dht.on("peer", onPeer);

    console.log("Looking up peers for " + infoHash);

    dht.lookup(infoHash);

    return Promise.all(peerDeferreds.map(function(peerDeferred) {
        return peerDeferred.promise;
    }));
};

LookupService.prototype.getPeer = function(infoHash) {
    return this.getPeers(infoHash, 1);
};

LookupService.prototype.start = Promise.coroutine(function *() {
    let self = this,
        dht = self.dht;

    console.log("Starting lookup service...");


    yield Page.findAsync().each(Promise.coroutine(function *(page) {
        let urlHash = yield sha1(page.url),
            announceDeferred = Promise.defer();
        // Ensure DHT is ready
        yield self.ready;

        console.log("Announcing hash " + urlHash + " on port " + self.webPort + "...");

        // TODO: Find module to find random unbound port + upnp
        // XXX: This port number is just for testing
        // A bit of a hack, but we announce the web port, and expect other
        // instances of everarchive to then do a HTTP GET for the 
        // /torrent/:pageUrl endpoint
        dht.announce(urlHash, self.webPort, function(error) {
            if (error) {
                announceDeferred.reject(error);
            } else {
                console.log("Announced hash " + urlHash + ".");

                console.log("Lookup service startup complete.");
                announceDeferred.resolve();
            }
        });

        return announceDeferred.promise;
    }));
});

module.exports = LookupService;
