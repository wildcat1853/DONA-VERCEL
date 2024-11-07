const { knex } = require('knex');

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      user: 'your_database_user',
      password: 'your_database_password',
      database: 'your_database_name'
    },
    migrations: {
      directory: './migrations'
    }
  }
};
