import EventEmitter from 'eventemitter3';
import Filter from 'lodash-es/filter';
import IsNil from 'lodash-es/isNil';
import Map from 'lodash-es/map';
import Merge from 'lodash-es/merge';
import Runtime from 'wes/runtime';

import Log from 'neon-extension-source-googlemusic/Core/Logger';
import MetadataParser from 'neon-extension-source-googlemusic/Metadata/Parser';
import {awaitBody} from 'neon-extension-framework/Document/Await';
import {createScript} from 'neon-extension-framework/Utilities/Script';


export class ShimEvents extends EventEmitter {
    constructor() {
        super();

        // Ensure body exists
        if(IsNil(document.body)) {
            throw new Error('Body is not available');
        }

        // Bind to events
        this._bind('neon.event', (e) => this._onEvent(e));
    }

    _bind(event, callback) {
        try {
            document.body.addEventListener(event, callback);
        } catch(e) {
            Log.error('Unable to bind to "%s"', event, e);
            return false;
        }

        Log.debug('Bound to "%s"', event);
        return true;
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

        this._configuration = {};
        this._events = null;

        this._injected = false;
        this._injecting = null;
    }

    inject(options) {
        if(this._injected) {
            return Promise.resolve();
        }

        // Inject shim into page (if not already injecting)
        if(IsNil(this._injecting)) {
            this._injecting = this._inject(options);
        }

        // Return current promise
        return this._injecting;
    }

    configuration() {
        return this.inject().then(() =>
            this._request('configuration')
        );
    }

    library() {
        return this.inject().then(() =>
            // Request tracks from library
            this._request('library').then((tracks) =>
                // Parse tracks
                Filter(Map(tracks, (item) => {
                    try {
                        return MetadataParser.fromJsArray('track', item);
                    } catch(err) {
                        Log.warn('Unable to parse track: %s', err && err.message, item, err);
                        return null;
                    }
                }), (track) => track !== null)
            )
        );
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
                if(!IsNil(listener)) {
                    this._events.removeListener(type, listener);
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
            this._events.once(type, listener);
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

        // Wait until body is available
        return awaitBody().then(() => {
            let script = createScript(document, Runtime.getURL('/Modules/neon-extension-source-googlemusic/Shim.js'));

            // Create events interface
            this._events = new ShimEvents();

            // Insert script into page
            (document.head || document.documentElement).appendChild(script);

            // Wait for "configuration" event
            return this._await('configuration', {
                timeout: options.timeout
            }).then((configuration) => {
                // Update state
                this._configuration = configuration;
                this._injected = true;
                this._injecting = null;
            }, () => {
                // Update state
                this._configuration = null;
                this._injected = false;
                this._injecting = null;

                // Reject promise
                return Promise.reject(new Error('Inject timeout'));
            });
        });
    }

    // endregion
}

export default new ShimApi();
