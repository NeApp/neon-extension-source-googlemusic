import {awaitBody, awaitElements} from '@radon-extension/framework/Document/Await';

import Log from './Logger';


export function awaitPage() {
    return new Promise((resolve, reject) => {
        Log.debug('Waiting for page to load...');

        // Display loading warning every 60s
        let loadingInterval = setInterval(() => {
            Log.warn('Waiting for page to load...');
        }, 60 * 1000);

        // Wait for page to load
        awaitBody().then(() => awaitElements(
            document.body,
            '#drawer-panel',
            '#main',
            '#music-content',
            '.g-content'
        )).then((element) => {
            Log.info('Page loaded');

            // Cancel loading warning
            clearInterval(loadingInterval);

            // Resolve promise
            resolve(element);
        }, (err) => {
            // Cancel loading warning
            clearInterval(loadingInterval);

            // Reject promise
            reject(err);
        });
    });
}
