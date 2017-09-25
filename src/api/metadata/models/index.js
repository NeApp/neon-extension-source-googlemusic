/* eslint-disable no-multi-spaces, key-spacing */
import Map from 'lodash-es/map';

import {isDefined} from 'neon-extension-framework/core/helpers';

import Album from './album';
import Track from './track';


const Models = {
    album: Album,
    track: Track
};

const PropertiesByModel = {
    album: {
        'title':                {index: 1},
        'artistTitle':          {index: 2},
        'coverUrl':             {index: 3},
        'tracks':               {index: 6, type: 'list', model: 'track'},
        'id':                   {index: 7},
        'year':                 {index: 9},
        'artistId':             {index: 10},
        'description':          {index: 12}
    },
    track: {
        'id':                   {index: 0},
        'title':                {index: 1},
        'albumCoverUrl':        {index: 2},
        'artistTitle':          {index: 3},
        'albumTitle':           {index: 4},
        'albumArtistTitle':     {index: 5},
        'duration':             {index: 13},
        'number':               {index: 14},
        'year':                 {index: 18},
        'albumId':              {index: 32},
        'artistId':             {index: 33}
    }
};

export default class Parser {
    static fromJsArray(type, data) {
        if(!isDefined(Models[type]) || !isDefined(PropertiesByModel[type])) {
            throw new Error('Unsupported model type: ' + type);
        }

        // Retrieve property values
        let values = {};

        for(let key in PropertiesByModel[type]) {
            if(!PropertiesByModel[type].hasOwnProperty(key)) {
                continue;
            }

            let descriptor = PropertiesByModel[type][key];

            if(descriptor.index >= data.length && (!isDefined(descriptor.optional) || descriptor.optional === false)) {
                throw new Error('No item available at index: ' + descriptor.index);
            }

            if(isDefined(descriptor.model)) {
                if(descriptor.type === 'list') {
                    values[key] = Map(
                        data[descriptor.index],
                        (item) => Parser.fromJsArray(descriptor.model, item)
                    );
                } else {
                    throw new Error('Unsupported model collection type: ' + descriptor.type);
                }
            } else {
                values[key] = data[descriptor.index];
            }
        }

        // Construct instance
        return new Models[type](values);
    }
}
