/** 
 * Summary: 
 * This script creates a new database testdb with the specified schema and test entry.
 * 
 * Prerequisites: 
 * You must have an FDB_ADMIN_KEY in your .env file. This script takes care of the rest
 * by writing the client and server keys for the new database in your .env file.
 * 
 * TODO: Make into an interactive shell program to add flexibility, prevent overwrites, etc.
 *  
 */

require('dotenv').config();

const fs = require('fs');

const envfile = require('envfile')

const env = envfile.parseFileSync('.env');

const faunadb = require('faunadb'),
    q = faunadb.query;

let client = new faunadb.Client({ secret: process.env.FDB_ADMIN_KEY });

const createDB = async () => {
    try {
        const _db = await client.query(q.CreateDatabase({ name: 'testdb' }))
    } catch (e) {
        console.log(e);
    }
}

const createKeys = async () => {
    let _server, _client;
    try {
        _server = await client.query(
            q.CreateKey({ database: q.Database('testdb'), role: 'server' })
        );
        console.log('Created server key')
        env.FDB_SERVER_KEY = _server.secret;
    } catch (e) {
        console.log(e)
    }
    try {
        _client = await client.query(
            q.CreateKey({ database: q.Database('testdb'), role: 'client' })
        );
        console.log('Created client key')
        env.FDB_CLIENT_KEY = _client.secret;
    } catch (e) {
        console.log(e)
    }
    await fs.writeFile('./.env', envfile.stringifySync(env), () => console.log('Published environmental variables'));
    return { server: _server.secret, client: _client.secret };
}

const createSchema = async function (client) {
    try {
        const _users = await client.query(q.CreateCollection({ name: 'users' }))
        let _index = await client.query(
            q.CreateIndex(
                {
                    name: 'users_by_email',
                    permissions: { read: 'public' },
                    source: q.Collection('users'),
                    terms: [{ field: ['data', 'email'] }],
                    unique: true
                }
            )
        )
        console.log('Created schema')
    } catch (e) {
        console.log(e);
    }
}

const createUsers = async function (client) {
    try {
        const _user = await client.query(
            q.Create(
                q.Collection('users'),
                {
                    credentials: { password: 'secret password' },
                    data: { email: 'alice@example.com' }
                }
            )
        )
        console.log('Created a test user', _user)
    } catch (e) {
        console.log(e);
    }
}

const setupDB = async () => {
    await createDB();
    const _keys = await createKeys();
    return {
        client: new faunadb.Client({ secret: _keys.server }),
        keys: _keys
    }
}

(async () => {
    const db = await setupDB();
    const server_client = db.client;
    await createSchema(server_client);
    await createUsers(server_client);
})()