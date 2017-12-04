import URI from 'urijs';

import Log from 'neon-extension-source-googlemusic/core/logger';
import MetadataParser from 'neon-extension-source-googlemusic/metadata/parser';
import {isDefined} from 'neon-extension-framework/core/helpers';

import ShimApi from './shim';


const BaseUrl = 'https://play.google.com/music/';

export class MetadataApi {
    constructor() {
        // Generate session identifier
        this.sessionId = this._generateSessionId();
    }

    get deviceId() {
        if(!isDefined(ShimApi._configuration) || !isDefined(ShimApi._configuration.flags)) {
            return null;
        }

        return ShimApi._configuration.flags[49];
    }

    get user() {
        if(!isDefined(ShimApi._configuration)) {
            return null;
        }

        return ShimApi._configuration.user;
    }

    get userId() {
        if(!isDefined(ShimApi._configuration)) {
            return null;
        }

        return ShimApi._configuration.userId;
    }

    get userToken() {
        if(!isDefined(ShimApi._configuration)) {
            return null;
        }

        return ShimApi._configuration.userToken;
    }

    get userType() {
        if(!isDefined(ShimApi._configuration)) {
            return null;
        }

        return ShimApi._configuration.userContext[13];
    }

    initialize(configuration, options) {

    }

    fetchArtist(artistId, options) {
        options = options || {};

        // Fetch artist
        return this.request('services/fetchartist', [[artistId]]);
    }

    fetchAlbum(albumId, options) {
        options = options || {};

        // Fetch album
        return this.request('services/fetchalbum', [[albumId], options.includeArtist || false]).then((data) => {
            if(!isDefined(data) || !Array.isArray(data) || data.length < 1) {
                return Promise.reject(new Error('Invalid Response'));
            }

            // Validate header
            let header = data[0];

            if(!isDefined(header) || !Array.isArray(header) || header.length !== 4) {
                Log.error('[fetchAlbum] Invalid Header: %o', header);

                return Promise.reject(new Error(
                    'Invalid Header'
                ));
            }

            // Validate status code
            let status = header[0];

            if(status === 2) {
                return Promise.reject(new Error('Not Found (albumId: "' + albumId + '")'));
            } else if(status === 4) {
                return Promise.reject(new Error('Invalid Token'));
            } else if(status !== 0) {
                return Promise.reject(new Error('Unknown Response (status: ' + status + ')'));
            }

            // Ensure payload is available
            if(data.length < 2) {
                return Promise.reject(new Error('No Payload Available'));
            }

            // Validate payload
            let payload = data[1];

            if(!isDefined(payload) || !Array.isArray(payload)) {
                return Promise.reject(new Error('Invalid Payload'));
            }

            // Parse response
            return MetadataParser.fromJsArray('album', data[1][0][0]);
        });
    }

    request(name, args, options) {
        if(!isDefined(this.deviceId)) {
            return Promise.reject(new Error('Device identifier is not defined'));
        }

        if(!isDefined(this.sessionId)) {
            return Promise.reject(new Error('Session identifier is not defined'));
        }

        if(!isDefined(this.userId)) {
            return Promise.reject(new Error('User identifier is not defined'));
        }

        if(!isDefined(this.userToken)) {
            return Promise.reject(new Error('User token is not defined'));
        }

        // Build query
        let query = {
            dv: this.deviceId,
            obfid: this.userId,
            xt: this.userToken,
            format: 'jsarray'
        };

        if(isDefined(this.user)) {
            query['u'] = this.user;
        }

        // Build URL
        let url = new URI(BaseUrl + name)
            .search(query)
            .toString();

        // Send request
        return fetch(url, {
            method: 'POST',
            body: JSON.stringify([[this.sessionId, 1], args]),

            credentials: 'include'
        }).then((response) => {
            if(!response.ok) {
                return Promise.reject(new Error('Request error (code: ' + response.status + ')'));
            }

            return response.json();
        });
    }

    _generateSessionId() {
        return (
            Math.floor(2147483648 * Math.random()).toString(36) +
            Math.abs(Math.floor(2147483648 * Math.random()) ^ Date.now()).toString(36)
        );
    }
}

export default new MetadataApi();
