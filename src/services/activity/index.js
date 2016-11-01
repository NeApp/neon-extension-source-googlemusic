import ActivityService, {ActivityEngine} from 'eon.extension.framework/services/source/activity';
import MessagingBus from 'eon.extension.framework/messaging/bus';
import Registry from 'eon.extension.framework/core/registry';
import {Artist, Album, Track} from 'eon.extension.framework/models/music';

import uuid from 'uuid';

import Log from 'eon.extension.source.googlemusic/core/logger';
import Plugin from 'eon.extension.source.googlemusic/core/plugin';
import PlayerMonitor from './player/monitor';


export class GoogleMusicActivityService extends ActivityService {
    constructor() {
        super(Plugin);

        this.bus = null;
        this.engine = null;
        this.monitor = null;
    }

    initialize() {
        super.initialize();

        // Construct messaging bus
        this.bus = new MessagingBus(Plugin.id + ':activity:' + uuid.v4());
        this.bus.connect('eon.extension.core:scrobble');

        // Construct activity engine
        this.engine = new ActivityEngine(this.plugin, this.bus, {
            getMetadata: this._getMetadata.bind(this),
            isEnabled: () => true
        });

        // Bind to page
        this.bind();
    }

    bind() {
        // Initialize player monitor
        this.monitor = new PlayerMonitor();

        // Bind activity engine to monitor
        this.engine.bind(this.monitor);

        // Bind player monitor to page
        return this.monitor.bind(document);
    }

    _getMetadata(identifier) {
        // Construct artist
        let artist = Artist.create(this.plugin, identifier.artist.key, {
            title: identifier.artist.title
        });

        // Construct album
        let album = Album.create(this.plugin, identifier.album.key, {
            title: identifier.album.title,

            // Children
            artist: artist
        });

        // Construct track
        return Track.create(this.plugin, identifier.key, {
            title: identifier.title,
            duration: this._getTrackDuration(),

            // Children
            artist: artist,
            album: album
        });
    }

    _getTrackDuration() {
        let $node = document.querySelector('#material-player-progress');

        if($node === null) {
            Log.warn('Unable to find "#material-player-progress" element');
            return null;
        }

        return parseInt($node.getAttribute('aria-valuemax'), 10);
    }
}

// Register service
Registry.registerService(new GoogleMusicActivityService());
