const { MongoClient } = require('mongodb');
const { createSecureContext } = require('tls');

class AtomicMongoCounter {
  description = {
    displayName: 'Atomic Mongo Counter',
    name: 'atomicMongoCounter',
    icon: 'file:atomicMongoCounter.svg',
    group: ['transform'],
    version: 1,
    description: 'Atomically increments a MongoDB counter and returns the new value',
    defaults: {
      name: 'Atomic Mongo Counter',
    },
    inputs: ['main'],
    outputs: ['main'],

    credentials: [
      {
        name: 'mongoDb',
        required: true,
      },
    ],

    properties: [
      {
        displayName: 'Collection',
        name: 'collection',
        type: 'string',
        default: 'counters',
        required: true,
      },
      {
        displayName: 'Lookup Field',
        name: 'lookupField',
        type: 'string',
        default: 'counter_name',
        required: true,
      },
      {
        displayName: 'Lookup Value',
        name: 'lookupValue',
        type: 'string',
        default: 'package_id_counter',
        required: true,
      },
      {
        displayName: 'Counter Field',
        name: 'counterField',
        type: 'string',
        default: 'seq',
        required: true,
      },
      {
        displayName: 'Increment By',
        name: 'incrementBy',
        type: 'number',
        default: 1,
        required: true,
      },
      {
        displayName: 'Output Field',
        name: 'outputField',
        type: 'string',
        default: 'package_id',
        required: true,
      },
      {
        displayName: 'Upsert',
        name: 'upsert',
        type: 'boolean',
        default: false,
      },
    ],
  };

  async execute() {
    const credentials = await this.getCredentials('mongoDb');

    if (!credentials) {
      throw new Error('MongoDB credentials were not returned');
    }

    const collectionName = String(
      this.getNodeParameter('collection', 0)
    ).trim();

    const lookupField = String(
      this.getNodeParameter('lookupField', 0)
    ).trim();

    const lookupValue = this.getNodeParameter('lookupValue', 0);

    const counterField = String(
      this.getNodeParameter('counterField', 0)
    ).trim();

    const incrementBy = Number(
      this.getNodeParameter('incrementBy', 0)
    );

    const outputField = String(
      this.getNodeParameter('outputField', 0)
    ).trim();

    const upsert = Boolean(
      this.getNodeParameter('upsert', 0)
    );

    if (!collectionName) {
      throw new Error('Collection is required');
    }

    if (!lookupField) {
      throw new Error('Lookup Field is required');
    }

    if (
      lookupValue === undefined ||
      lookupValue === null ||
      lookupValue === ''
    ) {
      throw new Error('Lookup Value is required');
    }

    if (!counterField) {
      throw new Error('Counter Field is required');
    }

    if (!outputField) {
      throw new Error('Output Field is required');
    }

    if (!Number.isSafeInteger(incrementBy) || incrementBy <= 0) {
      throw new Error('Increment By must be a positive safe integer');
    }

    const database = String(credentials.database || '').trim();

    if (!database) {
      throw new Error(
        'MongoDB database is missing from the selected credential'
      );
    }

    let connectionString;

    if (credentials.configurationType === 'connectionString') {
      connectionString = String(
        credentials.connectionString || ''
      ).trim();

      if (!connectionString) {
        throw new Error(
          'MongoDB connection string is missing from the selected credential'
        );
      }
    } else if (credentials.configurationType === 'values') {
      const host = String(credentials.host || '').trim();
      const user = String(credentials.user || '');
      const password = String(credentials.password || '');

      if (!host) {
        throw new Error(
          'MongoDB host is missing from the selected credential'
        );
      }

      if (!user) {
        throw new Error(
          'MongoDB user is missing from the selected credential'
        );
      }

      if (!password) {
        throw new Error(
          'MongoDB password is missing from the selected credential'
        );
      }

      if (credentials.port) {
        connectionString =
          `mongodb://${user}:${password}@${host}:${credentials.port}`;
      } else {
        connectionString =
          `mongodb+srv://${user}:${password}@${host}`;
      }
    } else {
      throw new Error(
        `Unsupported MongoDB configuration type: ${credentials.configurationType}`
      );
    }

    const driverInfo = {
      name: 'n8n_atomic_counter',
      version: '1',
    };

    let client;

    try {
      if (credentials.tls) {
        const secureContext = createSecureContext({
          ca: credentials.ca || undefined,
          cert: credentials.cert || undefined,
          key: credentials.key || undefined,
          passphrase: credentials.passphrase || undefined,
        });

        client = await MongoClient.connect(connectionString, {
          tls: true,
          secureContext,
          driverInfo,
        });
      } else {
        client = await MongoClient.connect(connectionString, {
          driverInfo,
        });
      }

      const collection = client
        .db(database)
        .collection(collectionName);

      const result = await collection.findOneAndUpdate(
        {
          [lookupField]: lookupValue,
        },
        {
          $inc: {
            [counterField]: incrementBy,
          },
        },
        {
          returnDocument: 'after',
          upsert,
        },
      );

      if (!result) {
        throw new Error(
          `Counter document not found for ${lookupField}=${lookupValue}`
        );
      }

      const value = result[counterField];

      if (!Number.isSafeInteger(value)) {
        throw new Error(
          `Counter field "${counterField}" returned an invalid integer value`
        );
      }

      return [
        [
          {
            json: {
              [outputField]: value,
            },
          },
        ],
      ];
    } finally {
      if (client) {
        await client.close();
      }
    }
  }
}

module.exports = {
  AtomicMongoCounter,
};
