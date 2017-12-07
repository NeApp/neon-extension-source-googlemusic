import Find from 'lodash-es/find';
import Get from 'lodash-es/get';
import IsNil from 'lodash-es/isNil';
import {Cache} from 'memory-cache';

import ActivityService, {ActivityEngine} from 'neon-extension-framework/services/source/activity';
import Log from 'neon-extension-source-googlemusic/core/logger';
import MetadataApi from 'neon-extension-source-googlemusic/api/metadata';
import MetadataBuilder from 'neon-extension-source-googlemusic/metadata/builder';
import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import Registry from 'neon-extension-framework/core/registry';
import ShimApi from 'neon-extension-source-googlemusic/api/shim';
import {awaitPage} from 'neon-extension-source-googlemusic/core/helpers';
import {cleanTitle} from 'neon-extension-framework/core/helpers';

import PlayerMonitor from './player/monitor';


const AlbumCacheExpiry = 3 * 60 * 60 * 1000;  // 3 hours

export class GoogleMusicActivityService extends ActivityService {
    constructor() {
        super(Plugin);

        this.engine = null;
        this.monitor = null;

        this.albums = new Cache();

        // Subscribe to "library" events
        this.library = this.messaging.service('library');

        this.library.on('library.update.finished', this.onLibraryUpdateFinished.bind(this));
    }

    initialize() {
        super.initialize();

        // Construct activity engine
        this.engine = new ActivityEngine(this.plugin, {
            fetchMetadata: this.fetchMetadata.bind(this),

            isEnabled: () => true
        });
    }

    bind() {
        // Initialize player monitor
        this.monitor = new PlayerMonitor();

        // Bind activity engine to monitor
        this.engine.bind(this.monitor);

        // Bind player monitor to page
        return ShimApi.inject()
            .then((configuration) => {
                Log.trace('Configuration received');

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
        let albumId = Get(item.album.ids, [Plugin.id, 'id']);

        // Ensure identifier exists
        if(IsNil(albumId)) {
            return Promise.resolve(item);
        }

        let fetchedAt = Date.now();

        // Update item `fetchedAt` timestamp
        item.update({ fetchedAt });

        // Fetch album metadata
        Log.debug('Fetching metadata for item: %o', item);

        return this.fetchAlbum(albumId).then((album) => {
            // Update album
            item.album.update({
                fetchedAt,

                artist: {
                    title: album.artistTitle,

                    ids: MetadataBuilder.createIds({
                        id: album.artistId
                    })
                }
            });

            // Clean item title (for matching)
            let title = this._cleanTitle(item.title);

            // Find matching track
            let track = Find(album.tracks, (track) => this._cleanTitle(track.title) === title);

            if(IsNil(track)) {
                Log.debug('Unable to find track "%s" (%s) in album: %o', item.title, title, album.tracks);

                // Reject promise
                return Promise.reject(new Error(
                    'Unable to find track "' + item.title + '" in album "' + item.album.title + '"'
                ));
            }

            // Update item
            item.update({
                ids: MetadataBuilder.createIds({
                    id: track.id
                }),

                number: track.number,
                duration: track.duration
            });

            return item;
        });
    }

    fetchAlbum(albumId) {
        if(IsNil(albumId) || albumId.length <= 0) {
            return Promise.reject();
        }

        // Retrieve album from cache
        let album = this.albums.get(albumId);

        if(!IsNil(album)) {
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

    onLibraryUpdateFinished({ clientId }) {
        if(clientId !== this.library.client.id) {
            return;
        }

        Log.trace('Library update finished');

        // Bind once page has loaded
        awaitPage().then(() =>
            this.bind()
        );
    }

    _cleanTitle(title) {
        return cleanTitle(title).replace(/\s/g, '');
    }
}

// Register service
Registry.registerService(new GoogleMusicActivityService());
