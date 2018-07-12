/* eslint-disable no-multi-spaces, key-spacing */
import EventEmitter from 'eventemitter3';
import IsNil from 'lodash-es/isNil';
import Merge from 'lodash-es/merge';

import {Artist, Album, Track} from '@radon-extension/framework/Models/Metadata/Music';

import Log from '../Core/Logger';
import Plugin from '../Core/Plugin';
import PlayerObserver from '../Observer/Player';
import PlayerApi from './Api';


export default class PlayerMonitor extends EventEmitter {
    constructor(options) {
        super();

        // Parse options
        this.options = Merge({
            progressInterval: 5000
        }, options);

        // Private attributes
        this._currentItem = null;
        this._progressEmitterEnabled = false;

        // Construct api client
        this.api = new PlayerApi();

        // Bind to player events
        PlayerObserver.on('track.changed',   this.onTrackChanged.bind(this));

        PlayerObserver.on('queue.created',   this.onQueueCreated.bind(this));
        PlayerObserver.on('queue.destroyed', this.onQueueDestroyed.bind(this));
    }

    start() {
        // Bind player api to page
        this.api.bind();

        // Start observing player
        PlayerObserver.start();
    }

    // region Event handlers

    onTrackChanged({ previous, current }) {
        Log.trace('PlayerMonitor.onTrackChanged: %o -> %o', previous, current);

        let track = null;

        // Try construct track
        try {
            track = this._createTrack(current);
        } catch(e) {
            Log.error('Unable to create track: %s', e.message || e);
        }

        // Ensure track exists
        if(IsNil(track)) {
            Log.warn('Unable to parse track: %o', current);

            this._currentItem = null;
            return;
        }

        // Ensure track has changed
        if(!IsNil(this._currentItem) && this._currentItem.matches(track)) {
            return;
        }

        // Update current identifier
        this._currentItem = track;

        // Emit "created" event
        this.emit('created', track);
    }

    onQueueCreated() {
        Log.trace('PlayerMonitor.onQueueCreated');

        // Start progress emitter
        this._startProgressEmitter();
    }

    onQueueDestroyed() {
        Log.trace('PlayerMonitor.onQueueDestroyed');

        // Stop progress emitter
        this._progressEmitterEnabled = false;

        // Emit "stopped" event
        this.emit('stopped');
    }

    // endregion

    // region Private methods

    _createTrack({ title, artist, album }) {
        if(IsNil(title) || IsNil(artist.title)) {
            return null;
        }

        // Create track
        return Track.create(Plugin.id, {
            // Metadata
            title,

            // Children
            album: this._createAlbum(album),
            artist: this._createArtist(artist)
        });
    }

    _createAlbum({ id, title }) {
        if(IsNil(title)) {
            id = null;
            title = null;
        }

        // Create album
        return Album.create(Plugin.id, {
            keys: {
                id: this._getId(id)
            },

            // Metadata
            title
        });
    }

    _createArtist({ id, title }) {
        if(IsNil(title)) {
            id = null;
            title = null;
        }

        // Create artist
        return Artist.create(Plugin.id, {
            keys: {
                id: this._getId(id)
            },

            // Metadata
            title
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
