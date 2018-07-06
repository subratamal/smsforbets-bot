import cron from 'node-cron'
import SMSCampaignManager from './managers/sms-campaign'
import Logger from './utils/logger'
import uuidv4 from 'uuid/v4'

let IS_CURRENTLY_PROCESSING = false

console.log('Starting SMSForBetsCampaign Bot...')

run()
cron.schedule('* * * * *', run)

async function run() {
  const _runId = uuidv4()
  const logger = Logger('SMSForBetsCampaign_Bot', {
    data: {
      runId: _runId
    }
  })

  if (!IS_CURRENTLY_PROCESSING) {
    IS_CURRENTLY_PROCESSING = true
    const smsCampaignManager = new SMSCampaignManager({
      runId: _runId,
      logger
    })

    logger.info(`Starting run ${_runId}`)
    await smsCampaignManager.init()
    logger.info(`Ending run ${_runId}`)
    IS_CURRENTLY_PROCESSING = false
  }
}
