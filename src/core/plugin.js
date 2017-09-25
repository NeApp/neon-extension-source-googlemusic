import SourcePlugin from 'neon-extension-framework/base/plugins/source';

import Manifest from '../../manifest.json';


export class GoogleMusicPlugin extends SourcePlugin {
    constructor() {
        super('googlemusic', Manifest);
    }
}

export default new GoogleMusicPlugin();
