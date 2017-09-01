export function encodeTitle(value) {
    return encodeURIComponent(value).replace(/%20/g, '+');
}
