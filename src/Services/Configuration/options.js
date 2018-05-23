import {Page, Options} from 'neon-extension-framework/Models/Configuration';
import Plugin from 'neon-extension-source-googlemusic/Core/Plugin';


export default [
    new Page(Plugin, null, [
        new Options.EnableOption(Plugin, 'enabled', {
            default: false,

            type: 'plugin',
            permissions: true,
            contentScripts: true
        })
    ])
];
