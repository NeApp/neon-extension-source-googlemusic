import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import Registry from 'neon-extension-framework/core/registry';
import SyncService from 'neon-extension-framework/services/source/sync';


export class GoogleMusicSyncService extends SyncService {
    constructor() {
        super(Plugin);
    }
}

// Register service
Registry.registerService(new GoogleMusicSyncService());
