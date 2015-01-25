* Hook outgoing links, notify user they're leaving archive
* Package as node-webkit app :3
* Mobile (cordova?) app? :O
* Fix errors in assetgraph transforms being swallowed.
* Render pages in web component for style encapsulation, or render huge and have a hidable, pos-absolute overlay
* Provide ability to download zip, magnet, torrent file, also cache these
* Provide image mode as well as html mode
* Allow client to seed too! :D
* Handle archiving multiple revisions of page - WILL BREAK DATA COMPAT
* AUdit gridfs-stream memory usage (Is issue #58 fixed?)
* robots.txt
* Document that model methods return promises
* move let declarations to closer to first use
* rename this file to web.js, do only webserver stuff here
* Investigate if we should use trackers or not
* Change most model methods & statics to return promises, rather than directly being generators
* Remove most asserts (or only run in dev mode), and write tests
* Follow on from above, null & type checking, error handling
* Spdy push of assets
* load config from nconf
* Redis for caching known URLs & torrents
* Support precompiled client resources AND on-the-fly compile
* Suppotr CORS
* See if we can have webtorrent read/write directly to gridfs (seems possible from webtorrent source - give array of streams)
* Validate input url is text/html - we don't want people directly archiving huge binary files... Or do we?
* if in production mode (NODE_ENV), disable mongoose autoIndex
* Consider queing crwaler tasks?
