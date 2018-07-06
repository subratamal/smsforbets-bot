import path from 'path'
import fs from 'fs-extra'
import bunyan from 'bunyan'

const PRODUCTION = process.env.NODE_ENV === 'production'
const STDOUT_LOG_LEVEL = process.env.DEBUG ? 'debug' : 'info'

const LOGS_DIR = path.resolve('./data/logs')

fs.ensureDirSync(LOGS_DIR)

function errorSerializer(error) {
  if (!error || !error.stack) return error

  const data = {
    message: error.message,
    name: error.name,
    stack: getFullErrorStack(error),
    code: error.code,
    signal: error.signal,
  }

  return data
}

function createSubLogger(logger, sub, data) {
  return logger.child({
    ...{
      sub,
    },
    ...data,
  })
}

function createLogger(name, options = {}) {
  const { fileOnly = false, data } = options

  const logger = bunyan.createLogger({
    ...{
      name,
      serializers: {
        err: errorSerializer,
      },
      streams: [],
    },
    ...data,
  })

  if (!fileOnly && !PRODUCTION) {
    logger.addStream({
      name: 'stdout',
      level: STDOUT_LOG_LEVEL,
      stream: process.stdout,
    })
  }

  const file = path.join(LOGS_DIR, `${name}.log`)

  fs.ensureDirSync(path.dirname(file))

  logger.addStream({
    name: 'file',
    level: 'info',
    type: 'rotating-file',
    path: file,
    period: '1h',
    count: 15,
  })

  logger.sub = (...args) => createSubLogger(logger, ...args)
  return logger
}

function getFullErrorStack(error) {
  let stack = error.stack || error.toString()
  stack += `\nCaused by: ${stack}`
  return stack
}

export default createLogger
