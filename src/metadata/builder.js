import PickBy from 'lodash-es/pickBy';

import ItemBuilder from 'neon-extension-framework/models/item';
import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import {isDefined} from 'neon-extension-framework/core/helpers';


export class MetadataBuilder {
    createTrack(item) {
        if(!isDefined(item) || !isDefined(item.artistId) || !isDefined(item.albumId)) {
            return null;
        }

        // Ensure artist title is valid
        if(!isDefined(item.artistTitle) || item.artistTitle.length < 1) {
            return null;
        }

        let fetchedAt = Date.now();

        // Artist
        let artist = {
            title: item.artistTitle,
            fetchedAt,

            ids: this.createIds({
                id: item.artistId
            })
        };

        // Create track
        return ItemBuilder.createTrack({
            title: item.title,

            number: item.number,
            duration: item.duration,

            fetchedAt,

            ids: this.createIds({
                id: item.trackId
            }),

            // Children
            album: this.buildAlbum(item, artist, fetchedAt),
            artist
        });
    }

    buildAlbum(item, artist, fetchedAt) {
        let title = null;

        // Retrieve title
        if(isDefined(item.albumTitle) && item.albumTitle.length >= 1) {
            title = item.albumTitle;
        }

        // Build album
        return {
            title,
            fetchedAt,

            ids: this.createIds({
                id: item.albumId
            }),

            // Children
            artist: this.buildAlbumArtist(item, fetchedAt) || artist
        };
    }

    buildAlbumArtist(item, fetchedAt) {
        if(!isDefined(item.albumArtistTitle) || item.albumArtistTitle.length < 1) {
            return null;
        }

        // Build album artist
        return {
            title: item.albumArtistTitle,
            fetchedAt
        };
    }

    createIds(values) {
        values = PickBy(values, (value) => isDefined(value) && value.length > 0);

        // Ensure identifiers exist
        if(Object.keys(values) < 1) {
            return {};
        }

        // Build identifiers object
        let ids = {};

        ids[Plugin.id] = values;

        return ids;
    }
}

export default new MetadataBuilder();
