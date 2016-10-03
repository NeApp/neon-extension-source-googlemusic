const REQUEST_TIMEOUT = 5;  // (in seconds)
const RESPONSE_KEYS = [
    'time'
];


export default class GoogleMusicPlayerAPI {
    constructor(document) {
        this.node = document.getElementById('player-api');

        this._responseCallback = null;

        // Bind to "playerApiReturn" events
        this.node.addEventListener('playerApiReturn', (event) => {
            this._onResponse(event);
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
            this.node.dispatchEvent(event);

            // Handle response
            if(this._hasResponse(code)) {
                // Reject promise if no response is returned within 5 seconds
                timeout = setTimeout(function() {
                    reject('No response returned within ' + REQUEST_TIMEOUT + ' second(s)');
                }, REQUEST_TIMEOUT * 1000);
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
            console.warn('Invalid response returned:', response);
            return;
        }

        // Find response code
        let code = null;

        for(let key in response) {
            if(!response.hasOwnProperty(key)) {
                continue;
            }

            if(RESPONSE_KEYS.indexOf(key) === -1 && typeof response[key] === 'number') {
                code = response[key];
            }
        }

        if(code === null) {
            console.warn('Unable to find response code in response object:', response);
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

        console.warn('Unknown response returned:', response);
    }
}
