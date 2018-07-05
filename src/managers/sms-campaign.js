import SMSCampaignScraper from './../sms-campaign-scraper'
import config from './../config/dev.config'
import SMSCampaignData from './../managers/sms-campaign-data'

const {
  puppeteerMeta,
  pageMeta
} = config

export default class SMSCampaignManager {
  async init() {
    const campaignTransactions = await SMSCampaignData.fetchUnprocessedCampaigns()
    console.log(campaignTransactions)

    this.smsCampaignScraper = new SMSCampaignScraper(campaignTransactions)
    this.smsCampaignScraper.init(puppeteerMeta, pageMeta)
  }
}
