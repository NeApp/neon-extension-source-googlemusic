/* eslint-disable no-multi-spaces, key-spacing */
import Debounce from 'lodash-es/debounce';
import IsEqual from 'lodash-es/isEqual';
import IsNil from 'lodash-es/isNil';

import Log from '../Core/Logger';
import Observer from './Base';


export class PlayerObserver extends Observer {
    constructor() {
        super();

        // Create debounced `onTrackChanged` function
        this.onTrackChanged = Debounce(this._onTrackChanged, 5000);

        this.info = null;
        this.content = null;

        this.title = null;
        this.artist = null;
        this.album = null;

        // Private attributes
        this._currentTrack = null;
        this._queueCreated = false;
    }

    create() {
        // Observe body
        this.body = this.observe(document, 'body');

        // Observe song information
        this.info = this.observe(this.body, '#playerSongInfo', { attributes: ['style'] })
            .onAttributeChanged('style', this.onInfoStyleChanged.bind(this))
            .on('mutation', this.onInfoStyleChanged.bind(this));

        this.content = this.observe(this.info, '.now-playing-info-content');

        // Observe title
        this.title = this.observe(this.content, '#currently-playing-title', { text: true })
            .on('mutation', this.onTrackChanged.bind(this));

        // Observe artist
        this.artist = this.observe(this.content, '.player-artist', { attributes: ['data-id'], text: true })
            .onAttributeChanged('data-id', this.onTrackChanged.bind(this))
            .on('mutation', this.onTrackChanged.bind(this));

        // Observe album
        this.album = this.observe(this.content, '.player-album', { attributes: ['data-id'], text: true })
            .onAttributeChanged('data-id', this.onTrackChanged.bind(this))
            .on('mutation', this.onTrackChanged.bind(this));
    }

    // region Event Handlers

    onInfoStyleChanged() {
        let node = document.querySelector('#playerSongInfo');

        // Update queue state
        if(!IsNil(node) && node.style.display !== 'none') {
            this._onQueueCreated();
        } else {
            this._onQueueDestroyed();
        }
    }

    _onQueueCreated() {
        if(this._queueCreated) {
            return;
        }

        // Update state
        this._queueCreated = true;

        // Emit event
        this.emit('queue.created');
    }

    _onQueueDestroyed() {
        if(!this._queueCreated) {
            return;
        }

        // Update state
        this._queueCreated = false;

        // Emit event
        this.emit('queue.destroyed');
    }

    _onTrackChanged() {
        let current = this._createTrack(
            this.title.first(),
            this.album.first(),
            this.artist.first()
        );

        // Ensure track has changed
        if(IsEqual(this._currentTrack, current)) {
            return;
        }

        // Store current track
        let previous = this._currentTrack;

        // Update current track
        this._currentTrack = current;

        // Emit "track.changed" event
        this.emit('track.changed', { previous, current });

        // Log track change
        Log.trace('Track changed to %o', current);
    }

    // endregion

    // region Private Methods

    _createTrack($title, $album, $artist) {
        return {
            title: this._getText($title),

            album: this._createAlbum($album),
            artist: this._createArtist($artist)
        };
    }

    _createAlbum($album) {
        return {
            id: this._getId($album),
            title: this._getText($album)
        };
    }

    _createArtist($artist) {
        return {
            id: this._getId($artist),
            title: this._getText($artist)
        };
    }

    _getId(node) {
        return (node && node.getAttribute('data-id')) || null;
    }

    _getText(node) {
        let value = (node && node.innerText) || '';

        if(value.length < 1) {
            return null;
        }

        return value;
    }

    // endregion
}

export default new PlayerObserver();
