import SyncService from 'eon.extension.framework/services/source/sync';
import Registry from 'eon.extension.framework/core/registry';

import Plugin from 'eon.extension.source.googlemusic/core/plugin';


export class GoogleMusicSyncService extends SyncService {
    constructor() {
        super(Plugin);
    }
}

// Register service
Registry.registerService(new GoogleMusicSyncService());
