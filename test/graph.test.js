import ArangoDBConnector from 'loopback-connector-arangodb';
import {DataSource, ModelBuilder} from 'loopback-datasource-juggler';
import edge from 'loopback-edge-arangodb/dist/edge';
import loopback from 'loopback';
import request from 'supertest';

import graph from '../src/graph';

import './should';

const modelBuilder = new ModelBuilder();
const mixins = modelBuilder.mixins;

describe('Graph', () => {
  const startVertex = 'Person/matteo';
  const verticesData = [
    {id: 'matteo', firstName: 'Matteo'},
    {id: 'antonio', firstName: 'Antonio'},
    {id: 'alessandro', firstName: 'Alessandro'},
  ];
  const edgesData = [
    {id: 'x', _from: 'Person/a', _to: 'Person/b'},
    {id: 'y', _from: 'Person/b', _to: 'Person/d'},
    {id: 'z', _from: 'Person/c', _to: 'Person/a'},
    {id: 'h', _from: 'Person/a', _to: 'Person/d'},
  ];
  const graphDefinition = {
    edgeDefinitions : [
      {
        collection: "Friend",
        from: [
          "Person"
        ],
        to: [
          "Person"
        ]
      }
    ]
  };

  const arangodb = new DataSource('arangodb', {connector: ArangoDBConnector},
    modelBuilder);

  mixins.define('Edge', edge);
  mixins.define('Graph', graph);

  const Person = arangodb.createModel('Person', {name: String}, {forceId: false});
  const Friend = arangodb.createModel('Friend',
    {
      name: String,
      type: {type: Number, default: 1},
      created: {type: Date, defaultFn: 'now'},
    },
    {forceId: false, arangodb: {edge: true}, mixins: {Edge: true}}
  );
  const GraphFriend = arangodb.createModel('GraphFriend', {}, {mixins: {Graph: true}});

  async function createSampleData() {
    await Person.create(verticesData);
    return Friend.create(edgesData);
  }

  async function destroySampleData() {
    await Person.destroyAll();
    await Friend.destroyAll();
    return GraphFriend.destroy();
  }

  before(async() => {
    await arangodb.automigrate();
    await createSampleData();
    return GraphFriend.create(graphDefinition);
  });

  after(() => destroySampleData());

  describe('Graph.traversal', () => {
    it('startVertex is required', async() => {
      try {
        await GraphFriend.traversal({});
      } catch (err) {
        err.should.be.instanceof(Error);
        err.code.should.equal('START_VERTEX_IS_REQUIRED');
        err.statusCode.should.equal(400);
      }
    });

    it('get friends of friends', async() => {
      const outbound = await GraphFriend
        .traversal({startVertex: startVertex, direction: 'outbound'});
      outbound.visited.should.exist();
      const visited = outbound.visited;
      visited.vertices.should.exist();
      visited.paths.should.exist();
    });
  });

  describe.skip('REST API', async() => {
    let app, server;

    before(done => {
      app = loopback();
      app.use('/api', loopback.rest());

      app.loopback.modelBuilder.mixins.define('Edge', edge);
      const ds = loopback.createDataSource({connector: ArangoDBConnector});
      const Friend = ds.createModel('Friend', {}, {
        arangodb: {edge: true},
        mixins: {Edge: true},
      });
      app.model(Friend);
      server = app.listen(() => {
        done();
      });
    });

    after(() => {
      server.close();
    });

    it('Expose traversal method', async() => {
      const nodeId = verticesOutEdges.nodeId;
      const graphOptions = JSON.stringify({
        startVertex: nodeId,
        direction: 'outbound',
      });
      const res = await request(app)
        .get(`/api/Friends/traversal?graphOptions=${graphOptions}`);
      const outbound = res.body;
      outbound.visited.should.exist();
      const visited = outbound.visited;
      visited.vertices.should.exist();
      visited.paths.should.exist();
    });
  });
});

