import Registry from 'eon.extension.framework/core/registry';

import Activity from './activity';
import Sync from './sync';


// Register plugins
Registry.register(new Activity());
Registry.register(new Sync());
