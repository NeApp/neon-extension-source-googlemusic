import ActivityService, {ActivityEngine} from 'eon.extension.framework/services/source/activity';
import {Identifier, KeyType} from 'eon.extension.framework/models/activity/identifier';
import MessagingBus from 'eon.extension.framework/messaging/bus';
import Registry from 'eon.extension.framework/core/registry';
import {Track, Album, Artist} from 'eon.extension.framework/models/metadata/music';

import Plugin from '../../core/plugin';
import PlayerAPI from './player-api';


export class GoogleMusicActivityService extends ActivityService {
    constructor() {
        super(Plugin);

        this.bus = null;
        this.engine = null;

        this._api = null;
        this._observer = null;

        this._currentTrack = null;
    }

    initialize() {
        super.initialize();

        // Construct messaging bus
        this.bus = new MessagingBus(Plugin.id + ':activity');
        this.bus.connect('eon.extension.core:scrobble');

        // Construct activity engine
        this.engine = new ActivityEngine(this.plugin, this.bus, {
            getMetadata: this._getMetadata.bind(this),
            isEnabled: () => true
        });

        // Bind to document
        this.bind();
    }

    bind() {
        // Find "#playerSongInfo" element
        let $playerSongInfo = document.querySelector('#playerSongInfo');

        if($playerSongInfo === null) {
            console.warn('Unable to find the "#playerSongInfo" element, will try again in 500ms');
            setTimeout(() => this.bind(), 500);
            return;
        }

        // Construct player api client
        this._api = new PlayerAPI(document);

        // Construct mutation observer
        this._observer = new MutationObserver((mutations) => {
            this._onMutations(mutations);
        });

        // Listen for player song info changes
        this._observer.observe($playerSongInfo, {
            childList: true
        });
    }

    _getTrackDuration() {
        let $node = document.querySelector('#material-player-progress');

        if($node === null) {
            console.error('Unable to find "#material-player-progress" element');
            return null;
        }

        return parseInt($node.getAttribute('aria-valuemax'), 10);
    }

    _getMetadata(identifier) {
        return this._currentTrack;
    }

    _read() {
        this._api.getCurrentTime().then((time) => {
            // Update session progress
            this.engine.progress(time, this._currentTrack.duration);

            // Queue next read
            setTimeout(() => this._read(), this.engine.options.progressInterval);
        });
    }

    _onMutations(mutations) {
        for(let i = 0; i < mutations.length; ++i) {
            this._onMutation(mutations[i]);
        }
    }

    _onMutation(mutation) {
        for(let i = 0; i < mutation.addedNodes.length; ++i) {
            let node = mutation.addedNodes[i];

            if(node.className === 'now-playing-info-wrapper') {
                this._onPlayingInfoChanged(node);
            }
        }
    }

    _onPlayingInfoChanged(node) {
        // Find track title element
        let $track = node.querySelector('#currently-playing-title');

        if($track === null) {
            console.error('Unable to find "#currently-playing-title" element');
            return;
        }

        // Find album title element
        let $album = node.querySelector('.player-album');

        if($album === null) {
            console.error('Unable to find ".player-album" element');
            return;
        }

        // Find artist title element
        let $artist = node.querySelector('.player-artist');

        if($artist === null) {
            console.error('Unable to find ".player-artist" element');
            return;
        }

        // Build track object
        let track = this._constructTrack($track, $album, $artist);

        // Ensure song has changed
        if(this._currentTrack !== null && this._currentTrack.matches(track)) {
            return;
        }

        // Update state
        this._currentTrack = track;

        // Retrieve track duration
        this._currentTrack.duration = this._getTrackDuration();

        if(this._currentTrack.duration === null) {
            return;
        }

        // Create session
        this.engine.create(new Identifier(KeyType.Generated, track.id));

        // Start session
        this.engine.start();

        // Start reading track progress
        this._read();
    }

    _constructTrack($track, $album, $artist) {
        let artistId = $artist.getAttribute('data-id');
        let albumId = $album.getAttribute('data-id');

        // Build track id
        let trackId = albumId + '/' + encodeURIComponent($track.innerText).replace(/%20/g, '+');

        // Construct track
        return new Track(
            this.plugin,
            trackId,
            $track.innerText,

            new Artist(
                this.plugin,
                artistId,
                $artist.innerText
            ),
            new Album(
                this.plugin,
                albumId,
                $album.innerText,

                new Artist(
                    this.plugin,
                    artistId,
                    $artist.innerText
                )
            )
        );
    }
}

// Register service
Registry.registerService(new GoogleMusicActivityService());
