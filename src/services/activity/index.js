import Find from 'lodash-es/find';
import {Cache} from 'memory-cache';

import ActivityService, {ActivityEngine} from 'neon-extension-framework/services/source/activity';
import Log from 'neon-extension-source-googlemusic/core/logger';
import MetadataApi from 'neon-extension-source-googlemusic/api/metadata';
import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import Registry from 'neon-extension-framework/core/registry';
import ShimApi from 'neon-extension-source-googlemusic/api/shim';
import {Artist} from 'neon-extension-framework/models/item/music';
import {cleanTitle, encodeTitle, isDefined} from 'neon-extension-framework/core/helpers';

import PlayerMonitor from './player/monitor';


const AlbumCacheExpiry = 3 * 60 * 60 * 1000;  // 3 hours

export class GoogleMusicActivityService extends ActivityService {
    constructor() {
        super(Plugin);

        this.engine = null;
        this.monitor = null;

        this.albums = new Cache();
    }

    initialize() {
        super.initialize();

        // Construct activity engine
        this.engine = new ActivityEngine(this.plugin, {
            fetchMetadata: this.fetchMetadata.bind(this),

            isEnabled: () => true
        });

        // Bind to page
        this.bind();
    }

    bind() {
        // Initialize player monitor
        this.monitor = new PlayerMonitor();

        // Bind activity engine to monitor
        this.engine.bind(this.monitor);

        // Bind player monitor to page
        return ShimApi.inject()
            .then((configuration) => {
                Log.debug('Configuration received: %o', configuration);

                // Initialize API clients
                MetadataApi.initialize(configuration);

                // Bind player monitor to page
                return this.monitor.bind(document);
            })
            .catch((err) => {
                Log.error('Unable to inject shim: %s', err.message, err);
            });
    }

    fetchMetadata(item) {
        return this.fetchAlbum(item.album.ids['googlemusic'].id).then((album) => {
            // Create album artist
            item.album.artist = new Artist({
                title: album.artistTitle,

                ids: {
                    googlemusic: {
                        id: album.artistId,
                        path: album.artistId + '/' + encodeTitle(album.artistTitle)
                    }
                }
            });

            // Clean item title (for matching)
            let title = cleanTitle(item.title);

            // Find matching track
            let track = Find(album.tracks, (track) => cleanTitle(track.title) === title);

            if(!isDefined(track)) {
                return Promise.reject(new Error(
                    'Unable to find track "' + item.title + '" in album'
                ));
            }

            // Determine if the item is being changed
            let changed = (
                item.number !== track.number ||
                item.duration !== track.duration ||
                item.ids.googlemusic.id !== track.id
            );

            // Update item
            item.number = track.number;
            item.duration = track.duration;

            item.ids.googlemusic.id = track.id;

            item.changed = changed;

            // Resolve promise with `item` instance
            return item;
        });
    }

    fetchAlbum(albumId) {
        if(!isDefined(albumId) || albumId.length <= 0) {
            return Promise.reject();
        }

        // Retrieve album from cache
        let album = this.albums.get(albumId);

        if(isDefined(album)) {
            return Promise.resolve(album);
        }

        // Fetch album
        return MetadataApi.fetchAlbum(albumId).then((album) => {
            // Store album in cache (which is automatically removed in `AlbumCacheExpiry`)
            this.albums.put(albumId, album, AlbumCacheExpiry);

            // Return album
            return album;
        });
    }
}

// Register service
Registry.registerService(new GoogleMusicActivityService());
