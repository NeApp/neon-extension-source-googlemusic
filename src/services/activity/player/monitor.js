import EventEmitter from 'eventemitter3';
import Merge from 'lodash-es/merge';

import Log from 'neon-extension-source-googlemusic/core/logger';
import {Artist, Album, Track} from 'neon-extension-framework/models/item/music';
import {encodeTitle} from 'neon-extension-source-googlemusic/core/helpers';
import {isDefined} from 'neon-extension-framework/core/helpers';

import PlayerApi from './api';
import PlayerObserver from './observer';


export default class PlayerMonitor extends EventEmitter {
    constructor(options) {
        super();

        // Parse options
        this.options = Merge({
            progressInterval: 5000
        }, options);

        // Construct api client
        this.api = new PlayerApi();

        // Construct observer
        this.observer = new PlayerObserver();
        this.observer.on('queue.created', this._onQueueCreated.bind(this));
        this.observer.on('queue.destroyed', this._onQueueDestroyed.bind(this));
        this.observer.on('track.changed', this._onTrackChanged.bind(this));

        // Private attributes
        this._currentTrack = null;
        this._progressEmitterEnabled = false;
    }

    bind(document) {
        return this.observer.bind(document)
            .then(() => this.api.bind(document));
    }

    // region Event handlers

    _onTrackChanged($artist, $album, $track) {
        // Try construct track
        let track;

        try {
            track = this._constructTrack($artist, $album, $track);
        } catch(e) {
            Log.error('Unable to construct track: %s', e.message, e);
            return;
        }

        if(!isDefined(track)) {
            this._currentTrack = null;
            return;
        }

        if(isDefined(this._currentTrack) && this._currentTrack.matches(track)) {
            return;
        }

        // Update current identifier
        this._currentTrack = track;

        // Emit "created" event
        this.emit('created', track);
    }

    _onQueueCreated() {
        Log.debug('Queue created');

        // Start progress emitter
        this._startProgressEmitter();
    }

    _onQueueDestroyed() {
        Log.debug('Queue destroyed');

        // Stop progress emitter
        this._progressEmitterEnabled = false;

        // Emit "stopped" event
        this.emit('stopped');
    }

    // endregion

    // region Private methods

    _constructTrack($artist, $album, $track) {
        if(!isDefined($artist) || !isDefined($album) || !isDefined($track)) {
            return null;
        }

        // Retrieve paths
        let artistId = $artist.getAttribute('data-id');
        let albumId = $album.getAttribute('data-id');

        // Generate track path
        let trackId = albumId + '/' + encodeTitle($track.innerText);

        // Construct artist
        let artist = Artist.create({
            title: $artist.innerText,

            ids: {
                googlemusic: {
                    id: this._getId(artistId),
                    path: artistId
                }
            }
        });

        // Construct album
        let album = Album.create({
            title: $album.innerText,

            ids: {
                googlemusic: {
                    id: this._getId(albumId),
                    path: albumId
                }
            }
        });

        // Construct track
        return Track.create({
            title: $track.innerText,

            artist: artist,
            album: album,

            ids: {
                googlemusic: {
                    path: trackId
                }
            }
        });
    }

    _getId(value) {
        if(!isDefined(value)) {
            return null;
        }

        // Find first "/" character
        let end = value.indexOf('/');

        if(end < 0) {
            return value;
        }

        return value.substring(0, end);
    }

    _startProgressEmitter() {
        if(this._progressEmitterEnabled) {
            return;
        }

        this._progressEmitterEnabled = true;

        // Construct read method
        let get = () => {
            if(!this._progressEmitterEnabled) {
                Log.debug('Stopped progress emitter');
                return;
            }

            // Read track position
            this.api.getCurrentTime().then((time) => {
                // Emit "progress" event
                this.emit('progress', time);

                // Queue next read
                setTimeout(get, this.options.progressInterval);
            });
        };

        // Start reading track progress
        Log.debug('Started progress emitter');
        get();
    }

    // endregion
}
