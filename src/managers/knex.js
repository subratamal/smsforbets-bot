import fs from 'fs'
import path from 'path'
import knex from 'knex'
import yaml from 'js-yaml'

const file = path.resolve('src/config.yaml')
const text = fs.readFileSync(file, 'utf8')
const jsonConfig = yaml.safeLoad(text)

const DEFAULT_POOL_SIZE = 10

function createKnex() {
  const dbConfig = jsonConfig['db']

  const knexConfig = {
    client: 'mysql2',
    connection: {
      host: dbConfig['host'],
      port: dbConfig['port'] || 80,
      user: dbConfig['username'],
      password: dbConfig['password'],
      database: dbConfig['db_name'],
      multipleStatements: true,
      charset: 'UTF8_UNICODE_CI'
    },
    useNullAsDefault: false,
    pool: {
      min: 0,
      max: dbConfig['pool_size'] || DEFAULT_POOL_SIZE
    },
    debug: false
  }

  return knex(knexConfig)
}

export default createKnex()
