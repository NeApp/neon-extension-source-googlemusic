import Filter from 'lodash-es/filter';
import Map from 'lodash-es/map';

import LibraryService from 'neon-extension-framework/services/source/library';
import Log from 'neon-extension-source-googlemusic/core/logger';
import MetadataBuilder from 'neon-extension-source-googlemusic/metadata/builder';
import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import Registry from 'neon-extension-framework/core/registry';
import ShimApi from 'neon-extension-source-googlemusic/api/shim';
import {awaitPage} from 'neon-extension-source-googlemusic/core/helpers';


export class GoogleMusicLibraryService extends LibraryService {
    constructor() {
        super(Plugin);
    }

    initialize() {
        super.initialize();

        // Refresh library once page has loaded
        awaitPage().then(() =>
            this.refresh()
        );
    }

    refresh() {
        return ShimApi.library().then((items) => {
            Log.debug('Received %d track(s) from library', items.length);

            let failed = 0;

            // Create tracks
            let tracks = Filter(
                Map(items, (item) => {
                    try {
                        return MetadataBuilder.createTrack(item).toPlainObject();
                    } catch(err) {
                        failed++;
                        return null;
                    }
                }),
                (item) => item !== null
            );

            if(failed > 0) {
                Log.warn('Unable to create %d track(s)', failed);
            }

            // Emit tracks to background service
            this.emit('library.update', {
                items: tracks,
                source: Plugin.id
            });
        }, (err) => {
            Log.error('Unable to fetch library: %s', err && err.message, err);
        });
    }
}

// Register service
Registry.registerService(new GoogleMusicLibraryService());
