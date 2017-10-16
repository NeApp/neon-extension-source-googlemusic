/* eslint-disable no-new */
import Cookie from 'js-cookie';
import EventEmitter from 'eventemitter3';

import {isDefined} from 'neon-extension-framework/core/helpers';

import Database from './database';


export class ShimRequests extends EventEmitter {
    constructor() {
        super();

        // Bind to request event
        document.body.addEventListener('neon.request', (e) => this._onRequest(e));
    }

    _onRequest(e) {
        if(!e || !e.detail) {
            console.error('Invalid request received:', e);
            return;
        }

        // Decode request
        let request;

        try {
            request = JSON.parse(e.detail);
        } catch(err) {
            console.error('Unable to decode request: %s', err && err.message, err);
            return;
        }

        // Emit request
        this.emit(request.type, ...request.args);
    }
}

export class Shim {
    constructor() {
        this.requests = new ShimRequests();
        this.requests.on('configuration', () => this.configuration());
        this.requests.on('library', () => this.library());

        // Emit "configuration" event
        this.configuration();
    }

    get userId() {
        return window['USER_ID'];
    }

    configuration() {
        let url = new URL(window.location.href);

        // Emit "configuration" event
        this._emit('configuration', {
            flags: window['FLAGS'],

            user: this._parseUser(url.searchParams.get('u')),
            userId: this.userId,
            userContext: window['USER_CONTEXT'],
            userToken: Cookie.get('xt')
        });
    }

    library() {
        let db = new Database(this.userId);

        // Fetch tracks from library
        Promise.resolve()
            .then(() => db.open())
            .then(() => db.all('tracks'))
            .then((chunks) => {
                let tracks = {};

                // Iterate over chunks
                Object.keys(chunks).forEach((chunkKey) => {
                    // Decode chunk
                    let items = JSON.parse(chunks[chunkKey]);

                    // Iterate over items, and store each item in `tracks`
                    Object.keys(items).forEach((key) => {
                        tracks[key] = items[key];
                    });
                });

                // Emit "library" event
                this._emit('library', Object.values(tracks));
            }, (err) => {
                console.warn('Unable to fetch library: %s', err && err.message, err);
            });
    }

    // region Private methods

    _emit(type, ...args) {
        // Construct event
        let event = new CustomEvent('neon.event', {
            detail: JSON.stringify({
                type: type,
                args: args || []
            })
        });

        // Emit event on the document
        document.body.dispatchEvent(event);
    }

    _parseUser(value) {
        if(!isDefined(value)) {
            return null;
        }

        try {
            return parseInt(value, 10);
        } catch(e) {
            return null;
        }
    }

    // endregion
}

// Construct shim
(new Shim());
