import Preferences from 'eon.extension.browser/preferences';
import Log from 'eon.extension.framework/core/logger';
import Registry from 'eon.extension.framework/core/registry';
import MigrateService from 'eon.extension.framework/services/migrate';

import Plugin from '../../core/plugin';


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
