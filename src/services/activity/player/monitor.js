import {isDefined} from 'eon.extension.framework/core/helpers';
import {KeyType, ArtistIdentifier, AlbumIdentifier, TrackIdentifier} from 'eon.extension.framework/models/music';

import EventEmitter from 'eventemitter3';
import merge from 'lodash-es/merge';

import Log from 'eon.extension.source.googlemusic/core/logger';
import PlayerApi from './api';
import PlayerObserver from './observer';


export default class PlayerMonitor extends EventEmitter {
    constructor(options) {
        super();

        // Parse options
        this.options = merge({
            progressInterval: 5000
        }, options);

        // Construct api client
        this.api = new PlayerApi();

        // Construct observer
        this.observer = new PlayerObserver();
        this.observer.on('changed', this._onTrackChanged.bind(this));

        // Private attributes
        this._currentIdentifier = null;
        this._readingProgress = false;
    }

    bind(document) {
        return this.observer.bind(document)
            .then(() => this.api.bind(document));
    }

    // region Event handlers

    _onTrackChanged($artist, $album, $track) {
        // Construct identifier
        let identifier = this._constructIdentifier($artist, $album, $track);

        if(!isDefined(identifier)) {
            Log.warn('Unable to construct track identifier');
            return false;
        }

        if(isDefined(this._currentIdentifier) && this._currentIdentifier.matches(identifier)) {
            return false;
        }

        // Update current identifier
        this._currentIdentifier = identifier;

        // Emit "created" event
        this.emit('created', identifier);

        // Start reading track progress
        this._startReadingProgress();
        return true;
    }

    // endregion

    // region Private methods

    _constructIdentifier($artist, $album, $track) {
        // Retrieve parameters
        let artistId = $artist.getAttribute('data-id');
        let albumId = $album.getAttribute('data-id');

        // Generate track key
        let trackId = albumId + '/' + encodeURIComponent($track.innerText).replace(/%20/g, '+');

        // Construct track identifier
        return new TrackIdentifier(
            KeyType.Generated, trackId,

            // Artist
            new ArtistIdentifier(
                KeyType.Exact, artistId,
                $artist.innerText
            ),

            // Album
            new AlbumIdentifier(
                KeyType.Exact, albumId,
                $album.innerText
            ),

            // Track title
            $track.innerText
        );
    }

    _getTrackDuration() {
        let $node = document.querySelector('#material-player-progress');

        if($node === null) {
            Log.warn('Unable to find "#material-player-progress" element');
            return null;
        }

        return parseInt($node.getAttribute('aria-valuemax'), 10);
    }

    _startReadingProgress() {
        if(this._readingProgress) {
            // Already reading track progress
            return;
        }

        // Set reading state
        this._readingProgress = true;

        // Construct read callback
        let get = () => {
            // TODO stop reading progress?

            // Read track position
            this.api.getCurrentTime().then((time) => {
                // Update session progress
                this.emit('progress', time, this._getTrackDuration());

                // Queue next read
                setTimeout(get, this.options.progressInterval);
            });
        };

        // Start reading track position
        get();
    }

    // endregion
}
