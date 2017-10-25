import URI from 'urijs';

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
        return this.request('services/fetchalbum', [[albumId], options.includeArtist || false])
            .then((data) => {
                if(!isDefined(data[1]) || !Array.isArray(data[1])) {
                    return Promise.reject(new Error('Not Found'));
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
