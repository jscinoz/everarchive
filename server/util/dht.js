/* jshint globalstrict: true */
/* global require, module */

"use strict";

let Promise = require("bluebird"),
    DHT = require("bittorrent-dht"),
    sha1 = require("./sha1");

// Assumes DHT is pre-initialised and fully ready
function getPeers(dht, infoHash, numPeers) {
    let peerDeferreds = [],
        peersFound = 0,
        onPeer = function(addr, peerInfoHash, from) {
            console.log("Peer address: " + addr);
            console.log("peerInfoHash " + peerInfoHash);
            console.log("from: " + from);

            // TODO: resolve promise with peer address
            // XXX: Do we want to wait until we have a few peers?
            if (peerInfoHash === infoHash) {
                peerDeferreds[peersFound].resolve(addr);

                peersFound++;
            }

            if (peersFound >= numPeers) {
                dht.off("peer", onPeer);
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
}

function getPeer(dht, infoHash) {
    return getPeers(dht, infoHash, 1);
}

let getTorrentDataForUrl = Promise.coroutine(function *(pageUrl) {
    // TODO; Look up dht for sha1 of given url, return .torrent data for
    // corresponding page data. resolve with null (or throw?) otherwise
    console.log("In dhtutils");

    // XXX: Probably want to re-use a single DHT instance
    let dhtReadyDeferred = Promise.defer();
    let dht = new DHT();

    dht.on("ready", function() {
        console.log("DHT is ready.");

        dhtReadyDeferred.resolve();
    });

    console.log("Waiting for DHT to be ready...");

    // Yield until DHT is ready
    yield dhtReadyDeferred.promise;

    let peers = yield getPeer(dht, yield sha1(pageUrl));

    console.log(peers);

    // TODO
    return new Buffer();
});

module.exports = {
    getTorrentDataForUrl: getTorrentDataForUrl
};
