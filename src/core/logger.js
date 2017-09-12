import {Logger} from 'eon.extension.framework/core/logger';

import Plugin from './plugin';


export default Logger.create(Plugin.id, () =>
    Plugin.preferences.key('debugging.log_level')
);
