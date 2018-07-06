import cron from 'node-cron'
import SMSCampaignManager from './managers/sms-campaign'
import Logger from './utils/logger'
import uuidv4 from 'uuid/v4'

const _runId = uuidv4()
const logger = Logger('SMSForBetsCampaign_Bot', {
  data: {
    runId: _runId
  }
})


// cron.schedule('* * * * *', async function () {
//   const smsCampaignManager = new SMSCampaignManager()
//   await smsCampaignManager.init()
// })

async function run() {
  const smsCampaignManager = new SMSCampaignManager({
    logger
  })
  logger.info(`Initalizing SMSForBetsCampaign Bot.`)
  await smsCampaignManager.init();
}

run()
