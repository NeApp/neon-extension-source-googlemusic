import Plugin from 'eon.extension.source.googlemusic/core/plugin';
import Registry from 'eon.extension.framework/core/registry';
import SyncService from 'eon.extension.framework/services/source/sync';


export class GoogleMusicSyncService extends SyncService {
    constructor() {
        super(Plugin);
    }
}

// Register service
Registry.registerService(new GoogleMusicSyncService());
