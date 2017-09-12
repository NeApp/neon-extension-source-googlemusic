import ActivityService, {ActivityEngine} from 'eon.extension.framework/services/source/activity';
import Registry from 'eon.extension.framework/core/registry';
import {Artist} from 'eon.extension.framework/models/item/music';
import {isDefined} from 'eon.extension.framework/core/helpers';

import Find from 'lodash-es/find';
import {Cache} from 'memory-cache';

import MetadataApi from 'eon.extension.source.googlemusic/api/metadata';
import ShimApi from 'eon.extension.source.googlemusic/api/shim';
import Log from 'eon.extension.source.googlemusic/core/logger';
import Plugin from 'eon.extension.source.googlemusic/core/plugin';
import PlayerMonitor from './player/monitor';
import {encodeTitle} from 'eon.extension.source.googlemusic/core/helpers';


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
        let albumId = item.album.ids['googlemusic'].id;

        // Ensure album identifier is available
        if(!isDefined(albumId)) {
            return false;
        }

        // Fetch album metadata
        return this.fetchAlbum(albumId).then((album) => {
            // Create album artist
            item.album.artist = Artist.create({
                title: album.artistTitle,

                ids: {
                    googlemusic: {
                        id: album.artistId,
                        path: album.artistId + '/' + encodeTitle(album.artistTitle)
                    }
                }
            });

            // Encode item title (for track matching)
            let itemTitleEncoded = encodeTitle(item.title);

            // Find matching track
            let track = Find(album.tracks, (track) => encodeTitle(track.title) === itemTitleEncoded);

            if(!isDefined(track)) {
                Log.warn('Unable to find item %o (%o) in album %o', item, itemTitleEncoded, album);
                return false;
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
            return true;
        }, (err) => {
            Log.warn('Unable to fetch album', err);
            return false;
        });
    }

    fetchAlbum(albumId) {
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
