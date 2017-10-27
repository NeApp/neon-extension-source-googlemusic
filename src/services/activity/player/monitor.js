import EventEmitter from 'eventemitter3';
import Merge from 'lodash-es/merge';

import ItemBuilder from 'neon-extension-framework/models/item';
import Log from 'neon-extension-source-googlemusic/core/logger';
import MetadataBuilder from 'neon-extension-source-googlemusic/metadata/builder';
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
        let track = null;

        // Try construct track
        try {
            track = this._constructTrack($artist, $album, $track);
        } catch(e) {
            Log.error('Unable to construct track: %s', e.message, e);
        }

        // Ensure track exists
        if(!isDefined(track)) {
            this._currentTrack = null;
            return;
        }

        // Ensure track has changed
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
        if(!isDefined($artist) || !isDefined($track)) {
            return null;
        }

        // Retrieve paths
        let artistId = $artist.getAttribute('data-id');

        // Construct artist
        let artist = {
            title: $artist.innerText,

            ids: MetadataBuilder.createIds({
                id: this._getId(artistId)
            })
        };

        // Construct track
        return ItemBuilder.createTrack({
            title: $track.innerText,

            // Children
            album: this._buildAlbum($album),
            artist
        });
    }

    _buildAlbum($album) {
        let id = null;
        let title = null;

        // Retrieve details
        if(isDefined($album)) {
            id = $album.getAttribute('data-id');

            // Retrieve title
            if(isDefined($album.innerText) && $album.innerText.length >= 1) {
                title = $album.innerText;
            }
        }

        // Build album
        return {
            title: title,

            ids: MetadataBuilder.createIds({
                id: this._getId(id)
            })
        };
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
