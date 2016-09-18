import ActivityService from 'eon.extension.framework/base/services/source/activity';
import Bus from 'eon.extension.framework/core/bus';
import Registry from 'eon.extension.framework/core/registry';
import Session, {SessionState} from 'eon.extension.framework/models/activity/session';
import {Track, Album, Artist} from 'eon.extension.framework/models/metadata/music';

import Plugin from '../../core/plugin';

import PlayerAPI from './player-api';


export class GoogleMusicActivityService extends ActivityService {
    constructor() {
        super(Plugin);

        this.api = null;
        this.observer = null;

        this.session = null;
        this.track = null;

        this._nextSessionKey = 0;

        // Configure event bus
        Bus.configure('service/activity');
    }

    initialize() {
        var self = this;

        // Find "#playerSongInfo" element
        var $playerSongInfo = document.querySelector('#playerSongInfo');

        if($playerSongInfo === null) {
            console.warn('Unable to find the "#playerSongInfo" element, will try again in 500ms');
            setTimeout(function() {
                self.initialize();
            }, 500);
            return;
        }

        // Construct player api client
        this.api = new PlayerAPI(document);

        // Construct mutation observer
        this.observer = new MutationObserver(function(mutations) {
            self._onMutations(mutations);
        });

        // Listen for player song info changes
        this.observer.observe($playerSongInfo, {
            childList: true
        });
    }

    getTrackDuration() {
        var $node = document.querySelector('#material-player-progress');

        if($node === null) {
            console.error('Unable to find "#material-player-progress" element');
            return null;
        }

        return parseInt($node.getAttribute('aria-valuemax'));
    }

    read(sessionKey) {
        var self = this;

        this.api.getCurrentTime().then(function(time) {
            // Update activity state
            if(self.session.time !== null) {
                if (time > self.session.time) {
                    self.session.state = SessionState.playing;
                } else if (time <= self.session.time) {
                    self.session.state = SessionState.paused;
                }
            }

            // Add new sample
            self.session.samples.push(time);

            // Emit event
            if(self.session.time !== null) {
                self.emit('progress', self.session.dump());
            }

            // Check if session is still active
            if(sessionKey !== self.session.key) {
                return;
            }

            // Queue next read
            setTimeout(function() {
                self.read(sessionKey);
            }, 5000);
        });
    }

    _onMutations(mutations) {
        for(var i = 0; i < mutations.length; ++i) {
            this._onMutation(mutations[i]);
        }
    }

    _onMutation(mutation) {
        for(var i = 0; i < mutation.addedNodes.length; ++i) {
            var node = mutation.addedNodes[i];

            if(node.className === "now-playing-info-wrapper") {
                this._onPlayingInfoChanged(node);
            }
        }
    }

    _onPlayingInfoChanged(node) {
        // Find track title element
        var $track = node.querySelector('#currently-playing-title');

        if($track === null) {
            console.error('Unable to find "#currently-playing-title" element');
            return;
        }

        // Find album title element
        var $album = node.querySelector('.player-album');

        if($album === null) {
            console.error('Unable to find ".player-album" element');
            return;
        }

        // Find artist title element
        var $artist = node.querySelector('.player-artist');

        if($artist === null) {
            console.error('Unable to find ".player-artist" element');
            return;
        }

        // Build track object
        var track = this._constructTrack(
            $track,
            $album,
            $artist
        );

        // Ensure song has changed
        if(this.track !== null && this.track.matches(track)) {
            return;
        }

        this.track = track;

        // Trigger song changed callback
        this._onTrackChanged();
    }

    _onTrackChanged() {
        // Retrieve track duration
        this.track.duration = this.getTrackDuration();

        if(this.track.duration === null) {
            return;
        }

        // Construct new session
        this.session = new Session(
            this.plugin,
            this._nextSessionKey++,
            this.track,
            SessionState.LOADING
        );

        // Start watching track progress
        this.read(this.session.key);
    }

    _constructTrack($track, $album, $artist) {
        return new Track(
            this.plugin,
            $track.innerText,
            $track.innerText,

            new Artist(
                this.plugin,
                $artist.getAttribute('data-id'),
                $artist.innerText
            ),
            new Album(
                this.plugin,
                $album.getAttribute('data-id'),
                $album.innerText,

                new Artist(
                    this.plugin,
                    $artist.getAttribute('data-id'),
                    $artist.innerText
                )
            )
        );
    }
}

// Register service
Registry.registerService(new GoogleMusicActivityService());
