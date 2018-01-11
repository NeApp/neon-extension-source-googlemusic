import IsNil from 'lodash-es/isNil';

import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import {Artist, Album, Track} from 'neon-extension-framework/models/item/music';


export class MetadataBuilder {
    createTrack(item) {
        if(IsNil(item)) {
            return null;
        }

        // Ensure artist title is valid
        if(IsNil(item.artistTitle) || item.artistTitle.length < 1) {
            return null;
        }

        let fetchedAt = Date.now();

        // Artist
        let artist = Artist.create(Plugin.id, {
            keys: {
                id: item.artistId
            },

            // Metadata
            title: item.artistTitle,

            // Timestamps
            fetchedAt
        });

        // Track
        return Track.create(Plugin.id, {
            keys: {
                id: item.trackId
            },

            // Metadata
            title: item.title,

            number: item.number,
            duration: item.duration,

            // Timestamps
            fetchedAt,

            // Children
            album: this.createAlbum(item, artist, fetchedAt),
            artist
        });
    }

    createAlbum(item, artist, fetchedAt) {
        let title = null;

        // Retrieve title
        if(!IsNil(item.albumTitle) && item.albumTitle.length >= 1) {
            title = item.albumTitle;
        }

        // Build album
        return Album.create(Plugin.id, {
            keys: {
                id: item.albumId
            },

            // Metadata
            title,

            // Timestamps
            fetchedAt,

            // Children
            artist: this.createAlbumArtist(item, fetchedAt) || artist
        });
    }

    createAlbumArtist(item, fetchedAt) {
        if(IsNil(item.albumArtistTitle) || item.albumArtistTitle.length < 1) {
            return null;
        }

        // Build album artist
        return Artist.create(Plugin.id, {
            // Metadata
            title: item.albumArtistTitle,

            // Timestamps
            fetchedAt
        });
    }
}

export default new MetadataBuilder();
