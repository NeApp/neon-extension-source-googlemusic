import EventEmitter from 'eventemitter3';
import IsNil from 'lodash-es/isNil';
import Merge from 'lodash-es/merge';

import Log from 'neon-extension-source-googlemusic/Core/Logger';


export default class PlayerObserver extends EventEmitter {
    constructor() {
        super();

        this.$playerSongInfo = null;
    }

    bind(document, options) {
        // Set default options
        options = Merge({
            interval: 500,
            timeout: 10 * 1000
        }, options || {});

        // Bind to page elements
        return new Promise((resolve, reject) => {
            let attempts = 0;

            let attemptBind = () => {
                // Find "#playerSongInfo" element
                this.$playerSongInfo = document.querySelector('#playerSongInfo');

                if(this.$playerSongInfo === null) {
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
                this._observer.observe(this.$playerSongInfo, {
                    attributeFilter: ['style'],
                    attributeOldValue: true,
                    childList: true
                });

                // Emit initial "queue.created" event
                if(!this._isHidden(this.$playerSongInfo.attributes.style.value)) {
                    this.emit('queue.created');
                }

                // Emit initial "track.changed" event
                this._onPlayingInfoChanged(this.$playerSongInfo.querySelector('.now-playing-info-wrapper'));

                // Resolve promise
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
        // Process added nodes
        for(let i = 0; i < mutation.addedNodes.length; ++i) {
            let node = mutation.addedNodes[i];

            if(node.className === 'now-playing-info-wrapper') {
                this._onPlayingInfoChanged(node);
            }
        }

        // Process attribute changed
        if(mutation.target.id === 'playerSongInfo' && mutation.attributeName === 'style') {
            this._onPlayingStyleChanged(mutation.oldValue, this.$playerSongInfo.attributes.style.value);
        }
    }

    _onPlayingStyleChanged(previous, current) {
        if(this._isHidden(previous) && !this._isHidden(current)) {
            this.emit('queue.created');
        }

        if(!this._isHidden(previous) && this._isHidden(current)) {
            this.emit('queue.destroyed');
        }
    }

    _onPlayingInfoChanged(node) {
        if(IsNil(node)) {
            return;
        }

        // Emit "changed" event
        this.emit('track.changed',
            node.querySelector('.player-artist'),
            node.querySelector('.player-album'),
            node.querySelector('#currently-playing-title')
        );
    }

    _isHidden(style) {
        return !IsNil(style) && style.indexOf('display: none') >= 0;
    }
}
