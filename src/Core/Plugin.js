import SourcePlugin from 'neon-extension-framework/Models/Plugin/Source';


export class GoogleMusicPlugin extends SourcePlugin {
    constructor() {
        super('googlemusic');
    }
}

export default new GoogleMusicPlugin();
