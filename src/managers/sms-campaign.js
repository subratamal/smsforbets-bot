import SMSCampaignScraper from './../sms-campaign-scraper'
import config from './../config/dev.config'
import SMSCampaignData from './../managers/sms-campaign-data'
// import Logger from './../utils/logger'

// const logger = Logger('sms_campaign_manager_logger')

const {
  puppeteerMeta,
  pageMeta
} = config

export default class SMSCampaignManager {
  constructor({ logger }) {
    this.logger = logger
  }

  async init() {
    const campaignTransactions = await SMSCampaignData.fetchUnprocessedCampaigns()
    if (Array.isArray(campaignTransactions) && campaignTransactions.length === 0) {
      this.logger.info('No campaign to process at the moment. Will try again next time.')
      return
    }

    try {
      this.smsCampaignScraper = new SMSCampaignScraper({ campaignTransactions, logger: this.logger })
      await this.smsCampaignScraper.init(puppeteerMeta, pageMeta)
    } catch (err) {
      this.logger.info(err, 'Something went wrong. SMSBetsCampaign Scraper manager died apruptly. Please try again. If the problem persists, contact admin.')
    }
  }
}
