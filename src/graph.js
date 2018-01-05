import assert from 'assert';
import Promise from 'bluebird';

import debug from './debug';

export default (Model, options) => {
  debug('Graph mixin for Model %s with options %O', Model.modelName, options);

  Model.create = async function(data) {
    const modelName = Model.modelName;
    data = data || {};
    data.name = modelName;
    const connector = this.getConnector();
    const graph = connector.db.graph(modelName);
    return await graph.create(data);
  };

  Model.destroy = async function(deleteCollections) {
    const modelName = Model.modelName;
    const connector = this.getConnector();
    const graph = connector.db.graph(modelName);
    return await graph.drop(deleteCollections);
  };

  /**
   * Performs a traversal starting from the given startVertex and following
   * edges contained in any of the edge collections of graph.
   *
   * @param graphOptions {Object} The graph options
   * @property {String} startVertex The start vertex
   * @param options {Object} The options object
   * @returns {Promise.<Model|Error>}
   */
  Model.traversal = async function(graphOptions, options) {
    assert(typeof graphOptions === 'object', 'graphOptions must be an object');

    if (typeof graphOptions.startVertex !== 'string') {
      const err = new Error('startVertex is required');
      err.code = 'START_VERTEX_IS_REQUIRED';
      err.statusCode = 400;
      return Promise.reject(err);
    } else {
      const startVertex = graphOptions.startVertex;
      const modelName = Model.modelName;
      const connector = this.getConnector();
      const graph = connector.db.graph(modelName);
      return await graph.traversal(startVertex, graphOptions);
    }
  };

  if (typeof Model.remoteMethod === 'function') {
    Model.remoteMethod('traversal', {
      description: `Performs a traversal starting from the given startVertex 
        and following edges contained in any of the edge collections of graph 
        ${Model.modelName} name.`,
      accepts: [
        {
          arg: 'graphOptions',
          type: 'object',
          http: {source: 'query'},
          required: true,
        },
        {arg: 'options', type: 'object', http: 'optionsFromRequest'},
      ],
      http: {path: '/traversal', verb: 'get'},
      returns: {arg: 'result', root: true, type: 'object'},
    });
  }
};
