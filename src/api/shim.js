import EventEmitter from 'eventemitter3';
import Filter from 'lodash-es/filter';
import Map from 'lodash-es/map';
import Merge from 'lodash-es/merge';

import Extension from 'neon-extension-browser/extension';
import Log from 'neon-extension-source-googlemusic/core/logger';
import MetadataParser from 'neon-extension-source-googlemusic/metadata/parser';
import {isDefined} from 'neon-extension-framework/core/helpers';
import {createScript} from 'neon-extension-framework/core/helpers/script';


export class ShimEvents extends EventEmitter {
    constructor() {
        super();

        // Bind to request event
        document.body.addEventListener('neon.event', (e) => this._onEvent(e));
    }

    _onEvent(e) {
        if(!e || !e.detail) {
            Log.error('Invalid event received:', e);
            return;
        }

        // Decode event
        let event;

        try {
            event = JSON.parse(e.detail);
        } catch(err) {
            Log.error('Unable to decode event: %s', err && err.message, err);
            return;
        }

        // Emit request
        this.emit(event.type, ...event.args);
    }
}

export class ShimApi extends EventEmitter {
    constructor() {
        super();

        this.events = new ShimEvents();

        this._configuration = {};

        this._injected = false;
        this._injecting = null;
    }

    inject(options) {
        if(this._injected) {
            return Promise.resolve();
        }

        // Inject shim into page (if not already injecting)
        if(!isDefined(this._injecting)) {
            this._injecting = this._inject(options);
        }

        // Return current promise
        return this._injecting;
    }

    configuration() {
        // Ensure shim has been injected
        return this.inject()
            // Request configuration
            .then(() => this._request('configuration'));
    }

    library() {
        // Ensure shim has been injected
        return this.inject()
            // Request tracks from library
            .then(() => this._request('library'))
            // Parse tracks
            .then((tracks) => Filter(
                Map(tracks, (item) => {
                    try {
                        return MetadataParser.fromJsArray('track', item);
                    } catch(err) {
                        Log.warn('Unable to parse track: %s', err && err.message, item, err);
                        return null;
                    }
                }),
                (track) => track !== null
            ));
    }

    // region Private methods

    _await(type, options) {
        options = Merge({
            timeout: 10 * 1000  // 10 seconds
        }, options || {});

        // Create promise
        return new Promise((resolve, reject) => {
            let listener;

            // Create timeout callback
            let timeoutId = setTimeout(() => {
                if(isDefined(listener)) {
                    this.events.removeListener(type, listener);
                }

                // Reject promise
                reject(new Error('Request timeout'));
            }, options.timeout);

            // Create listener callback
            listener = (event) => {
                clearTimeout(timeoutId);

                // Resolve promise
                resolve(event);
            };

            // Wait for event
            this.events.once(type, listener);
        });
    }

    _emit(type, ...args) {
        let request = new CustomEvent('neon.event', {
            detail: JSON.stringify({
                type: type,
                args: args || []
            })
        });

        // Emit event on the document
        document.body.dispatchEvent(request);
    }

    _request(type, ...args) {
        let request = new CustomEvent('neon.request', {
            detail: JSON.stringify({
                type: type,
                args: args || []
            })
        });

        // Emit request on the document
        document.body.dispatchEvent(request);

        // Wait for response
        return this._await(type);
    }

    _inject(options) {
        options = Merge({
            timeout: 10 * 1000  // 10 seconds
        }, options || {});

        return new Promise((resolve, reject) => {
            let script = createScript(document, Extension.getUrl('/source/googlemusic/shim/shim.js'));

            // Wait for "configuration" event
            this._await('configuration', {
                timeout: options.timeout
            }).then((configuration) => {
                // Update state
                this._configuration = configuration;

                this._injected = true;
                this._injecting = null;

                // Resolve promise
                resolve(configuration);
            }, () => {
                // Update state
                this._injected = false;
                this._injecting = null;

                // Reject promise
                reject(new Error('Inject timeout'));
            });

            // Insert script into page
            (document.head || document.documentElement).appendChild(script);
        });
    }

    // endregion
}

export default new ShimApi();
