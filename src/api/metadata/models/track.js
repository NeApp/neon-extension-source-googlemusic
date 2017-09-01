export default class Track {
    constructor(values) {
        values = values || {};

        this.id = values.id || null;
        this.title = values.title || null;
        this.number = values.number || null;
        this.duration = values.duration || null;
        this.year = values.year || null;

        this.artistId = values.artistId || null;
        this.artistTitle = values.artistTitle || null;

        this.albumId = values.albumId || null;
        this.albumTitle = values.albumTitle || null;
        this.albumCoverUrl = values.albumCoverUrl || null;

        this.albumArtistTitle = values.albumArtistTitle || null;
    }
}
