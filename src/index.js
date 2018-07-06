import cron from 'node-cron'
import SMSCampaignManager from './managers/sms-campaign'
import Logger from './utils/logger'
import uuidv4 from 'uuid/v4'

let IS_CURRENTLY_PROCESSING = false

// cron.schedule('* * * * *', async function () {
//   const _runId = uuidv4()
//   const logger = Logger('SMSForBetsCampaign_Bot', {
//     data: {
//       runId: _runId
//     }
//   })

//   if (!IS_CURRENTLY_PROCESSING) {
//     IS_CURRENTLY_PROCESSING = true
//     const smsCampaignManager = new SMSCampaignManager({
//       runId: _runId,
//       logger
//     })

//     console.log(`Initalizing SMSForBetsCampaign Bot.`)
//     await smsCampaignManager.init()
//     logger.info(`Destroying SMSForBetsCampaign Bot.`)
//     IS_CURRENTLY_PROCESSING = false
//   }
// })

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

    console.log(`Initalizing SMSForBetsCampaign Bot.`)
    await smsCampaignManager.init()
    logger.info(`Destroying SMSForBetsCampaign Bot.`)
    IS_CURRENTLY_PROCESSING = false
  }
}

run()
