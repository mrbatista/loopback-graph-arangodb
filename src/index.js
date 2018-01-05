import {deprecate} from 'util';
import graph from './graph';

export default deprecate(app => {
  app.modelBuilder.mixins.define('Graph', graph);
}, 'app.modelBuilder.mixins.define: Use mixinSources instead; ' +
    'see https://github.com/mrbatista/loopback-graph-arangodb');

