export default class Album {
    constructor(options) {
        options = options || {};

        this.id = options.id || null;
        this.title = options.title || null;
        this.coverUrl = options.coverUrl || null;
        this.description = options.description || null;
        this.year = options.year || null;

        this.artistId = options.artistId || null;
        this.artistTitle = options.artistTitle || null;

        this.tracks = options.tracks || [];
    }
}
