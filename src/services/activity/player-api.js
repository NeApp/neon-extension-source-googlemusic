var REQUEST_TIMEOUT = 5;  // (in seconds)
var RESPONSE_KEYS = [
    'time'
];


export default class GoogleMusicPlayerAPI {
    constructor(document) {
        var self = this;

        this.node = document.getElementById("player-api");

        this._responseCallback = null;

        // Bind to "playerApiReturn" events
        this.node.addEventListener('playerApiReturn', function(event) {
            self._onResponse(event);
        });
    }

    request(code, options) {
        options = typeof options !== 'undefined' ? options : {};

        // Create request event
        var event = new CustomEvent("playerApi", {
            detail: JSON.stringify([
                code,
                null,
                options.volume || null,
                options.time || null,
                null
            ])
        });

        // Return promise
        var self = this;

        return new Promise(function(resolve, reject) {
            var timeout = null;

            // Store resolve callback if we are expecting a response
            if(self._hasResponse(code)) {
                self._responseCallback = function(result) {
                    // Cancel timeout trigger
                    if(timeout != null) {
                        clearTimeout(timeout);
                    }

                    // Resolve promise
                    resolve(result);
                };
            }

            // Dispatch request event
            self.node.dispatchEvent(event);

            // Handle response
            if(self._hasResponse(code)) {
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
        var response = event.detail;

        if(response == null) {
            console.warn('Invalid response returned:', response);
            return;
        }

        // Find response code
        var code = null;

        for(var key in response) {
            if(!response.hasOwnProperty(key)) {
                continue;
            }

            if(RESPONSE_KEYS.indexOf(key) == -1 && typeof response[key] === 'number') {
                code = response[key];
            }
        }

        if(code == null) {
            console.warn('Unable to find response code in response object:', response);
            return;
        }

        // Current time response
        if(code === 9 && this._responseCallback !== null) {
            var callback = this._responseCallback;

            // Clear stored promise
            this._responseCallback = null;

            // Trigger callback
            callback(response.time);
            return;
        }

        console.warn('Unknown response returned:', response);
    }
}
