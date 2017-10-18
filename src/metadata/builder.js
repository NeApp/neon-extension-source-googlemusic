import PickBy from 'lodash-es/pickBy';

import ItemBuilder from 'neon-extension-framework/models/item';
import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import {isDefined} from 'neon-extension-framework/core/helpers';


export class MetadataBuilder {
    createTrack(item) {
        if(!isDefined(item)) {
            return null;
        }

        if(!isDefined(item.artistTitle) || item.artistTitle.length < 1) {
            return null;
        }

        if(!isDefined(item.albumTitle) || item.albumTitle.length < 1) {
            return null;
        }

        // Artist
        let artist = {
            title: item.artistTitle,

            ids: this.createIds({
                id: item.artistId
            })
        };

        // Album
        let album = {
            title: item.albumTitle,

            ids: this.createIds({
                id: item.albumId
            }),

            artist: this.getAlbumArtist(item) || artist
        };

        // Create track
        return ItemBuilder.createTrack({
            title: item.title,

            number: item.number,
            duration: item.duration,

            ids: this.createIds({
                id: item.trackId
            }),

            artist,
            album
        });
    }

    getAlbumArtist(item) {
        if(!isDefined(item.albumArtistTitle) || item.albumArtistTitle.length < 1) {
            return null;
        }

        return {
            title: item.albumArtistTitle
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
