import SourcePlugin from 'neon-extension-framework/base/plugins/source';


export class GoogleMusicPlugin extends SourcePlugin {
    constructor() {
        super('googlemusic');
    }
}

export default new GoogleMusicPlugin();
