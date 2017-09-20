import Log from 'eon.extension.framework/core/logger';
import MigrateService from 'eon.extension.framework/services/migrate';
import Plugin from 'eon.extension.source.googlemusic/core/plugin';
import Preferences from 'eon.extension.framework/preferences';
import Registry from 'eon.extension.framework/core/registry';


export class GoogleMusicMigrateService extends MigrateService {
    constructor() {
        super(Plugin);
    }

    onPreferences(preferences) {
        Log.info('Migrating preferences...');

        // Enable plugin
        return Plugin.registerContentScripts()
            .then(() => Preferences.putBoolean(Plugin.id + ':enabled', true));
    }
}

// Register service
Registry.registerService(new GoogleMusicMigrateService());
