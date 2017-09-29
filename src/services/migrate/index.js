import Log from 'neon-extension-framework/core/logger';
import MigrateService from 'neon-extension-framework/services/migrate';
import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import Preferences from 'neon-extension-framework/preferences';
import Registry from 'neon-extension-framework/core/registry';


export class GoogleMusicMigrateService extends MigrateService {
    constructor() {
        super(Plugin);
    }

    onLegacyPreferences(preferences) {
        Log.info('Migrating preferences...');

        // Enable plugin
        return Plugin.registerContentScripts()
            .then(() => Preferences.putBoolean(Plugin.id + ':enabled', true));
    }
}

// Register service
Registry.registerService(new GoogleMusicMigrateService());
