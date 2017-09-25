import {isDefined} from 'neon-extension-framework/core/helpers';


export function cleanTitle(value) {
    if(!isDefined(value)) {
        return value;
    }

    return value.replace(/[^\w\s]/gi, '').toLowerCase();
}

export function encodeTitle(value) {
    if(!isDefined(value)) {
        return value;
    }

    return encodeURIComponent(value).replace(/%20/g, '+');
}
