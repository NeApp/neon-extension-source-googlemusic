import SyncService from 'eon.extension.framework/base/services/source/sync';
import Registry from 'eon.extension.framework/core/registry';

import Plugin from '../../core/plugin';


export class GoogleMusicSyncService extends SyncService {
    constructor() {
        super(Plugin);
    }
}

// Register service
Registry.registerService(new GoogleMusicSyncService());
