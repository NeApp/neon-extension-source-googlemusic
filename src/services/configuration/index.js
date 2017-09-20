import ConfigurationService from 'eon.extension.framework/services/configuration';
import Plugin from 'eon.extension.source.googlemusic/core/plugin';
import Registry from 'eon.extension.framework/core/registry';

import Options from './options';


export class GoogleMusicConfigurationService extends ConfigurationService {
    constructor() {
        super(Plugin, Options);
    }
}

// Register service
Registry.registerService(new GoogleMusicConfigurationService());
