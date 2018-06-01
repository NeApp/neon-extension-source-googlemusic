import ConfigurationService from 'neon-extension-framework/Services/Configuration';
import Plugin from 'neon-extension-source-googlemusic/Core/Plugin';
import Registry from 'neon-extension-framework/Core/Registry';
import {Page} from 'neon-extension-framework/Models/Configuration';
import {EnableOption} from 'neon-extension-framework/Models/Configuration/Options';


export const Options = [
    new Page(Plugin, null, [
        new EnableOption(Plugin, 'enabled', {
            default: false,

            type: 'plugin',
            permissions: true,
            contentScripts: true
        })
    ])
];

export class GoogleMusicConfigurationService extends ConfigurationService {
    constructor() {
        super(Plugin, Options);
    }
}

// Register service
Registry.registerService(new GoogleMusicConfigurationService());
