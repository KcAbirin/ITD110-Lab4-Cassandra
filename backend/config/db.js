const cassandra = require('cassandra-driver');

const contactPoints = (
    process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1'
).split(',');

const localDataCenter =
    process.env.CASSANDRA_DATACENTER || 'datacenter1';

const keyspace =
    process.env.CASSANDRA_KEYSPACE || 'education';

const bootstrapClient = new cassandra.Client({
    contactPoints,
    localDataCenter,
});

const client = new cassandra.Client({
    contactPoints,
    localDataCenter,
    keyspace,
});

const connectDB = async () => {
    try {

        // CONNECT WITHOUT KEYSPACE FIRST
        await bootstrapClient.connect();

        // CREATE KEYSPACE
        await bootstrapClient.execute(`
            CREATE KEYSPACE IF NOT EXISTS ${keyspace}
            WITH replication = {
                'class': 'SimpleStrategy',
                'replication_factor': 1
            }
        `);

        await bootstrapClient.shutdown();

        // CONNECT TO KEYSPACE
        await client.connect();

        // CREATE TABLE
        await client.execute(`
            CREATE TABLE IF NOT EXISTS education_survival_rate (
                geolocation text,
                year int,
                education_level text,
                sex text,
                indicator text,
                survival_rate double,

                PRIMARY KEY (
                    (geolocation),
                    year,
                    education_level,
                    sex
                )
            )
            WITH CLUSTERING ORDER BY (
                year DESC,
                education_level ASC,
                sex ASC
            )
        `);

        console.log(
           `Cassandra Connected (keyspace: ${keyspace})`
        );

    } catch (error) {

        console.error('Database Error:', error.message);

        process.exit(1);
    }
};

module.exports = {
    connectDB,
    client,
};