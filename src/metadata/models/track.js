export default class Track {
    constructor(values) {
        values = values || {};

        this.id = values.trackId || values.key || null;

        this.key = values.key || null;
        this.trackId = values.trackId || null;

        this.title = values.title || null;
        this.titleSort = values.titleSort || null;

        this.number = values.number || null;
        this.duration = values.duration || null;
        this.year = values.year || null;

        this.artistId = values.artistId || null;
        this.artistTitle = values.artistTitle || null;
        this.artistTitleSort = values.artistTitleSort || null;

        this.albumId = values.albumId || null;
        this.albumTitle = values.albumTitle || null;
        this.albumTitleSort = values.albumTitleSort || null;
        this.albumCoverUrl = values.albumCoverUrl || null;

        this.albumArtistTitle = values.albumArtistTitle || null;
        this.albumArtistTitleSort = values.albumArtistTitleSort || null;
    }
}
