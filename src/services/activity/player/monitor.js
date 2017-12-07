import EventEmitter from 'eventemitter3';
import IsNil from 'lodash-es/isNil';
import Merge from 'lodash-es/merge';

import Log from 'neon-extension-source-googlemusic/core/logger';
import {Artist, Album, Track} from 'neon-extension-framework/models/item/music';

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
        let track = null;

        // Try construct track
        try {
            track = this._createTrack($artist, $album, $track);
        } catch(e) {
            Log.error('Unable to construct track: %s', e.message, e);
        }

        // Ensure track exists
        if(IsNil(track)) {
            this._currentTrack = null;
            return;
        }

        // Ensure track has changed
        if(!IsNil(this._currentTrack) && this._currentTrack.matches(track)) {
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

    _createTrack($artist, $album, $track) {
        if(IsNil($artist) || IsNil($track)) {
            return null;
        }

        // Create track
        return Track.create(Plugin.id, {
            // Metadata
            title: $track.innerText
        }, {
            album: this._createAlbum($album),
            artist: this._createArtist($artist)
        });
    }

    _createAlbum($album) {
        let id = null;
        let title = null;

        // Retrieve details
        if(!IsNil($album)) {
            id = $album.getAttribute('data-id');

            // Retrieve title
            if(!IsNil($album.innerText) && $album.innerText.length >= 1) {
                title = $album.innerText;
            }
        }

        // Create album
        return Album.create(Plugin.id, {
            keys: {
                id: this._getId(id)
            },

            // Metadata
            title: title
        });
    }

    _createArtist($artist) {
        let title = null;

        // Retrieve title
        if(!IsNil($artist.innerText) && $artist.innerText.length >= 1) {
            title = $artist.innerText;
        }

        // Create artist
        return Artist.create(Plugin.id, {
            keys: {
                id: this._getId($artist.getAttribute('data-id'))
            },

            // Metadata
            title: title
        });
    }

    _getId(value) {
        if(IsNil(value)) {
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
            }, (err) => {
                Log.warn('Unable to request current time: %s', err);

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
