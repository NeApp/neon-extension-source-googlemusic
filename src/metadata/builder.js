import PickBy from 'lodash-es/pickBy';

import Plugin from 'neon-extension-source-googlemusic/core/plugin';
import {Artist, Album, Track} from 'neon-extension-framework/models/item/music';
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

        // Create artist
        let artist = new Artist({
            title: item.artistTitle,

            ids: this.createIds({
                id: item.artistId
            })
        });

        // Create album
        let album = new Album({
            title: item.albumTitle,

            ids: this.createIds({
                id: item.albumId
            })
        }, {
            artist: this.createAlbumArtist(item) || artist
        });

        // Create track
        return new Track({
            title: item.title,

            number: item.number,
            duration: item.duration,

            ids: this.createIds({
                id: item.trackId
            })
        }, {
            artist: artist,
            album: album
        });
    }

    createAlbumArtist(item) {
        if(!isDefined(item.albumArtistTitle) || item.albumArtistTitle.length < 1) {
            return null;
        }

        return new Artist({
            title: item.albumArtistTitle
        });
    }

    createIds(values) {
        let ids = {};

        ids[Plugin.id] = PickBy(values, (value) =>
            isDefined(value)
        );

        return ids;
    }
}

export default new MetadataBuilder();
