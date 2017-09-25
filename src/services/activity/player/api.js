import Merge from 'lodash-es/merge';

import Log from 'neon-extension-source-googlemusic/core/logger';


const ResponseKeys = [
    'time'
];

export default class PlayerApi {
    constructor(options) {
        // Parse options
        this.options = Merge({
            requestTimeout: 5000
        }, options);

        // Private attributes
        this._node = null;
        this._responseCallback = null;
    }

    bind(document) {
        return new Promise((resolve, reject) => {
            // Try find the player api element
            this._node = document.getElementById('player-api');

            if(this._node === null) {
                reject(new Error('Unable to find the player api element'));
                return;
            }

            // Reset state
            this._responseCallback = null;

            // Bind to "playerApiReturn" events
            this._node.addEventListener('playerApiReturn', (event) => {
                this._onResponse(event);
            });

            resolve();
        });
    }

    request(code, options) {
        options = typeof options !== 'undefined' ? options : {};

        // Create request event
        let event = new CustomEvent('playerApi', {
            detail: JSON.stringify([
                code,
                null,
                options.volume || null,
                options.time || null,
                null
            ])
        });

        // Return promise
        return new Promise((resolve, reject) => {
            let timeout = null;

            // Store resolve callback if we are expecting a response
            if(this._hasResponse(code)) {
                this._responseCallback = function(result) {
                    // Cancel timeout trigger
                    if(timeout != null) {
                        clearTimeout(timeout);
                    }

                    // Resolve promise
                    resolve(result);
                };
            }

            // Dispatch request event
            this._node.dispatchEvent(event);

            // Handle response
            if(this._hasResponse(code)) {
                // Reject promise if no response is returned within 5 seconds
                timeout = setTimeout(() => {
                    reject('No response returned within ' + this.options.requestTimeout + ' second(s)');
                }, this.options.requestTimeout);
            } else {
                // No response expected, resolve promise
                resolve();
            }
        });
    }

    getCurrentTime() {
        return this.request(9);
    }

    _hasResponse(code) {
        return code === 9;
    }

    _onResponse(event) {
        let response = event.detail;

        if(response == null) {
            Log.warn('Invalid response returned:', response);
            return;
        }

        // Find response code
        let code = null;

        for(let key in response) {
            if(!response.hasOwnProperty(key)) {
                continue;
            }

            if(ResponseKeys.indexOf(key) === -1 && typeof response[key] === 'number') {
                code = response[key];
            }
        }

        if(code === null) {
            Log.warn('Unable to find response code in response object:', response);
            return;
        }

        // Current time response
        if(code === 9 && this._responseCallback !== null) {
            let callback = this._responseCallback;

            // Clear stored promise
            this._responseCallback = null;

            // Trigger callback
            callback(response.time);
            return;
        }

        Log.warn('Unknown response returned:', response);
    }
}
