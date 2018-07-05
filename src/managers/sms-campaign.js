import SMSCampaignScraper from './../sms-campaign-scraper'
import config from './../config/dev.config'
import SMSCampaignData from './../managers/sms-campaign-data'

const {
  puppeteerMeta,
  pageMeta
} = config

export default class SMSCampaignManager {
  async init() {
    const results = await SMSCampaignData.fetchUnprocessedCampaigns()
    console.log(results)

    this.smsCampaignScraper = new SMSCampaignScraper()
    this.smsCampaignScraper.init(puppeteerMeta, pageMeta)
  }
}
