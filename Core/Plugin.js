import SourcePlugin from '@radon-extension/framework/Models/Plugin/Source';


export class GoogleMusicPlugin extends SourcePlugin {
    constructor() {
        super('googlemusic');
    }
}

export default new GoogleMusicPlugin();
