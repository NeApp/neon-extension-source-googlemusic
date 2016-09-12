import SourcePlugin from 'eon.extension.framework/base/plugins/source';


export class GoogleMusicPlugin extends SourcePlugin {
    constructor() {
        super('googlemusic', 'Google Music');
    }
}

export default new GoogleMusicPlugin();
