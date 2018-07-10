import cron from 'node-cron'
import SMSCampaignManager from './managers/sms-campaign'
import Logger from './utils/logger'
import uuidv4 from 'uuid/v4'

let IS_CURRENTLY_PROCESSING = false

console.log('Starting SMSForBets.com Campaign Bot ...')

tryRun()
cron.schedule('* * * * *', tryRun)

async function tryRun() {
  const exitHandler = (options, err) => {
    logger.error({ err }, 'unhandled error.')
    IS_CURRENTLY_PROCESSING = false

    if (options.exit) process.exit()
  }

  // do app specific cleaning before exiting
  process.on('exit', exitHandler.bind(null, {}))

  // catch ctrl+c event and exit normally
  process.on('SIGINT', exitHandler.bind(null, {
    exit: true
  }))

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, {
    exit: true
  }))
  process.on('SIGUSR2', exitHandler.bind(null, {
    exit: true
  }))

  // catch uncaught exceptions, trace, then exit normally
  process.on('uncaughtException', exitHandler.bind(null, {}))

  process.on('unhandledRejection', (reason, p) => {
    logger.error({
      err: reason,
      p
    }, 'unhandledRejection run')
    IS_CURRENTLY_PROCESSING = false
  })

  let logger
  try {
    const _runId = uuidv4()
    logger = Logger('SMSForBets.com-Campaign-Bot', {
      data: {
        runId: _runId
      }
    })

    await run(logger, _runId)
  } catch (err) {
    logger.info(err)
  }
}

async function run(logger, _runId) {
  try {
    if (!IS_CURRENTLY_PROCESSING) {
      IS_CURRENTLY_PROCESSING = true
      const smsCampaignManager = new SMSCampaignManager({
        runId: _runId,
        logger
      })

      logger.info(`Starting run ${_runId}`)
      await smsCampaignManager.init()
      logger.info(`Ending run ${_runId}`)
    }
  } catch (err) {
    logger.error(err, 'uncaught error')
  } finally {
    IS_CURRENTLY_PROCESSING = false
  }
}
