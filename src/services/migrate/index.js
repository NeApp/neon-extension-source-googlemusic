import MigrateService from 'neon-extension-framework/services/migrate';
import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import Registry from 'neon-extension-framework/core/registry';


export class GoogleMusicMigrateService extends MigrateService {
    constructor() {
        super(Plugin);
    }
}

// Register service
Registry.registerService(new GoogleMusicMigrateService());
