import cron from 'node-cron'
import SMSCampaignManager from './managers/sms-campaign'
import Logger from './utils/logger'
import uuidv4 from 'uuid/v4'

let IS_CURRENTLY_PROCESSING = false

console.log('Starting SMSForBets.com Campaign Bot ...')

run()
cron.schedule('* * * * *', run)

async function run() {
  const _runId = uuidv4()
  const logger = Logger('SMSForBets.com-Campaign-Bot', {
    data: {
      runId: _runId
    }
  })

  process.on('unhandledRejection', (reason, p) => {
    logger.error({ err: reason, p }, 'unhandledRejection run')
    IS_CURRENTLY_PROCESSING = false
  })

  if (!IS_CURRENTLY_PROCESSING) {
    try {
      IS_CURRENTLY_PROCESSING = true
      const smsCampaignManager = new SMSCampaignManager({
        runId: _runId,
        logger
      })

      logger.info(`Starting run ${_runId}`)
      await smsCampaignManager.init()
      logger.info(`Ending run ${_runId}`)
    } catch(err) {
      logger.error(err, 'uncaught error')
    } finally {
      IS_CURRENTLY_PROCESSING = false
    }
  }
}
