import SourcePlugin from 'eon.extension.framework/base/plugins/source';

import Manifest from '../../manifest.json';


export class GoogleMusicPlugin extends SourcePlugin {
    constructor() {
        super('googlemusic', 'Google Music', Manifest);
    }
}

export default new GoogleMusicPlugin();
