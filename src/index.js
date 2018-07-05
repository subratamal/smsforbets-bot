import cron from 'node-cron'
import SMSCampaignManager from './managers/sms-campaign'

// cron.schedule('* * * * *', async function () {
//   const smsCampaignManager = new SMSCampaignManager()
//   await smsCampaignManager.init()
// })

(async function () {
  const smsCampaignManager = new SMSCampaignManager()
  await smsCampaignManager.init()
})()
