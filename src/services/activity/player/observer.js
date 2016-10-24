import EventEmitter from 'eventemitter3';
import merge from 'lodash-es/merge';

import Log from 'eon.extension.source.googlemusic/core/logger';


export default class PlayerObserver extends EventEmitter {
    bind(document, options) {
        // Set default options
        options = merge({
            interval: 500,
            timeout: 10 * 1000
        }, options || {});

        // Bind to page elements
        return new Promise((resolve, reject) => {
            let attempts = 0;

            let attemptBind = () => {
                // Find "#playerSongInfo" element
                let $playerSongInfo = document.querySelector('#playerSongInfo');

                if($playerSongInfo === null) {
                    // Check if `options.timeout` has been reached
                    if(attempts * options.interval > options.timeout) {
                        reject(new Error('Unable to find song information element'));
                        return;
                    }

                    // Increment attempts count
                    attempts++;

                    // Attempt another bind in `options.interval` milliseconds
                    Log.info('Unable to find the "#playerSongInfo" element, will try again in 500ms');
                    setTimeout(attemptBind, options.interval);
                    return;
                }

                // Construct mutation observer
                this._observer = new MutationObserver((mutations) => {
                    this._onMutations(mutations);
                });

                // Listen for player song info changes
                this._observer.observe($playerSongInfo, {
                    childList: true
                });

                resolve();
            };

            // Attempt bind
            attemptBind();
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
        // Retrieve elements
        let $track = node.querySelector('#currently-playing-title');

        if($track === null) {
            Log.warn('Unable to find "#currently-playing-title" element');
            return;
        }

        // Find album title element
        let $album = node.querySelector('.player-album');

        if($album === null) {
            Log.warn('Unable to find ".player-album" element');
            return;
        }

        // Find artist title element
        let $artist = node.querySelector('.player-artist');

        if($artist === null) {
            Log.warn('Unable to find ".player-artist" element');
            return;
        }

        // Emit "changed" event
        this.emit('changed', $artist, $album, $track);
    }
}
