import Filter from 'lodash-es/filter';
import IsNil from 'lodash-es/isNil';
import Map from 'lodash-es/map';

import LibraryService from 'neon-extension-framework/Services/Source/Library';
import Log from 'neon-extension-source-googlemusic/Core/Logger';
import MetadataBuilder from 'neon-extension-source-googlemusic/Metadata/Builder';
import Plugin from 'neon-extension-source-googlemusic/Core/Plugin';
import Registry from 'neon-extension-framework/Core/Registry';
import ShimApi from 'neon-extension-source-googlemusic/Api/Shim';
import {awaitPage} from 'neon-extension-source-googlemusic/Core/Helpers';


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

            let errors = {
                failed: 0,
                invalid: 0
            };

            // Create tracks
            let tracks = Filter(
                Map(items, (item) => {
                    // Create track
                    try {
                        let track = MetadataBuilder.createTrack(item);

                        // Ensure track has been created
                        if(IsNil(track)) {
                            Log.trace('Ignoring invalid track: %o', item);
                            errors.invalid++;
                            return null;
                        }

                        // Encode track
                        return track.toPlainObject();
                    } catch(err) {
                        Log.trace('Unable to create track: %s', err);
                        errors.failed++;
                        return null;
                    }
                }),
                (item) => item !== null
            );

            if(errors.failed > 0) {
                Log.warn('Unable to create %d track(s)', errors.failed);
            }

            if(errors.invalid > 0) {
                Log.warn('Ignored %d invalid track(s)', errors.invalid);
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
