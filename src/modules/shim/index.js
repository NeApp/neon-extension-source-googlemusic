/* eslint-disable no-new */
import {isDefined} from 'eon.extension.framework/core/helpers';

import Cookie from 'js-cookie';
import EventEmitter from 'eventemitter3';


export class ShimRequests extends EventEmitter {
    constructor() {
        super();

        // Bind to request event
        document.body.addEventListener('neon.request', (e) => this._onRequest(e));
    }

    _onRequest(e) {
        if(!e || !e.detail || !e.detail.type) {
            console.error('Unknown request received:', e);
            return;
        }

        this.emit(e.detail.type, ...e.detail.args);
    }
}

export class Shim {
    constructor() {
        this.requests = new ShimRequests();
        this.requests.on('refresh', () => this.refresh());

        // Initial refresh
        this.refresh();
    }

    emit(type, ...args) {
        // Construct event
        let event = new CustomEvent('neon.event', {
            detail: {
                type: type,
                args: args || []
            }
        });

        // Emit event on the document
        document.body.dispatchEvent(event);
    }

    refresh() {
        let url = new URL(window.location.href);

        // Emit "ready" event
        this.emit('ready', {
            flags: window['FLAGS'],

            user: this._parseUser(url.searchParams.get('u')),
            userId: window['USER_ID'],
            userContext: window['USER_CONTEXT'],
            userToken: Cookie.get('xt')
        });
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
}

// Construct shim
(new Shim());
