import EventEmitter from 'eventemitter3';
import Merge from 'lodash-es/merge';

import Extension from 'eon.extension.browser/extension';
import Log from 'eon.extension.source.googlemusic/core/logger';
import {isDefined} from 'eon.extension.framework/core/helpers';
import {createScript} from 'eon.extension.framework/core/helpers/script';


export class ShimEvents extends EventEmitter {
    constructor() {
        super();

        // Bind to request event
        document.body.addEventListener('neon.event', (e) => this._onEvent(e));
    }

    _onEvent(e) {
        if(!e || !e.detail || !e.detail.type) {
            Log.error('Unknown event received:', e);
            return;
        }

        this.emit(e.detail.type, ...e.detail.args);
    }
}

export class ShimApi extends EventEmitter {
    constructor() {
        super();

        this.events = new ShimEvents();

        this.configuration = {};
    }

    inject(options) {
        options = Merge({
            timeout: 10 * 1000  // 10 seconds
        }, options || {});

        return new Promise((resolve, reject) => {
            let script = createScript(document, Extension.getUrl('/source/googlemusic/shim/shim.js'));

            // Start timeout rejection callback
            let timeoutId = setTimeout(
                () => reject(new Error('Inject timeout')),
                options.timeout
            );

            // Listen for "ready" event to resolve promise
            this.events.once('ready', (configuration) => {
                // Cancel timeout
                if(isDefined(timeoutId)) {
                    clearTimeout(timeoutId);
                }

                // Store configuration
                this.configuration = configuration;

                // Resolve promise
                resolve(configuration);
            });

            // Insert script into page
            (document.head || document.documentElement).appendChild(script);
        });
    }
}

export default new ShimApi();
