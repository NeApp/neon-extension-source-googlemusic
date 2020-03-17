import Find from 'lodash-es/find';
import Get from 'lodash-es/get';
import IsNil from 'lodash-es/isNil';
import {Cache} from 'memory-cache';

import ActivityService, {ActivityEngine} from '@radon-extension/framework/Services/Source/Activity';
import Registry from '@radon-extension/framework/Core/Registry';
import {Artist} from '@radon-extension/framework/Models/Metadata/Music';
import {cleanTitle} from '@radon-extension/framework/Utilities/Metadata';

import Log from '../Core/Logger';
import MetadataApi from '../Api/Metadata';
import Plugin from '../Core/Plugin';
import PlayerMonitor from '../Player/Monitor';
import ShimApi from '../Api/Shim';
import {awaitPage} from '../Core/Helpers';


const AlbumCacheExpiry = 3 * 60 * 60 * 1000;  // 3 hours

export class GoogleMusicActivityService extends ActivityService {
    constructor() {
        super(Plugin);

        this.player = new PlayerMonitor();
        this.engine = null;

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

        // Bind activity engine to player monitor
        this.engine.bind(this.player);

        // Inject shim
        return ShimApi.inject().then((configuration) => {
            Log.trace('Configuration received');

            // Initialize API clients
            MetadataApi.initialize(configuration);
        }).catch((err) => {
            Log.error('Unable to inject shim: %s', err.message, err);
        });
    }

    fetchMetadata(item) {
        let albumId = Get(item.album.keys, [Plugin.id, 'id']);

        if(IsNil(albumId) || !albumId) {
            return Promise.resolve(item);
        }

        let fetchedAt = Date.now();

        // Update item `fetchedAt` timestamp
        item.update(Plugin.id, { fetchedAt });

        // Fetch album metadata
        Log.debug('Fetching metadata for album "%s" (track: %o)', albumId, item);

        return this.fetchAlbum(albumId).then((album) => {
            // Update album
            item.album.update(Plugin.id, {
                fetchedAt
            });

            // Create album artist
            if(IsNil(item.album.artist)) {
                item.album.artist = new Artist();
            }

            item.album.artist.update(Plugin.id, {
                keys: {
                    id: album.artistId
                },

                // Metadata
                title: album.artistTitle,

                // Timestamps
                fetchedAt
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
            item.update(Plugin.id, {
                keys: {
                    id: track.id
                },

                // Metadata
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

        // Start monitoring player once page has loaded
        awaitPage().then(() =>
            this.player.start()
        );
    }

    _cleanTitle(title) {
        return cleanTitle(title).replace(/\s/g, '');
    }
}

// Register service
Registry.registerService(new GoogleMusicActivityService());
