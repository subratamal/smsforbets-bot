import path from 'path'
import fs from 'fs-extra'
import yaml from 'js-yaml'
import to from 'await-to-js'
import puppeteer from 'puppeteer'
import {
  EventEmitter 
} from 'events'
// import Logger from './utils/logger'
import SMSCampaignManager from './managers/sms-campaign-data'

// const logger = Logger('sms_campaign_logger')

const file = path.resolve('src/config.yaml')
const text = fs.readFileSync(file, 'utf8')
const jsonConfig = yaml.safeLoad(text)

const resolution = {
  x: 1920,
  y: 1080,
}

export default class SMSCampaignScraper extends EventEmitter {
  constructor({ campaignTransactions = [], logger }) {
    super();
    this.site = jsonConfig['site_meta']
    this.campaignTransactions = campaignTransactions
    this.logger = logger
  }

  async createBrowser(options = {}) {
    const defaultArgs = [
      '--disable-gpu',
      `--window-size=${resolution.x},${resolution.y}`,
      '--no-sandbox',
    ]

    const defaultOptions = {
      args: defaultArgs,
      timeout: 60000,
      userDataDir: path.resolve('puppeteer-data-dir'),
    }

    const browserOptions = Object.assign({}, defaultOptions, options)

    this.browser = await puppeteer.launch(browserOptions)
  }

  async closeBrowser() {
    await this.browser.close();
  }

  async createPage(options) {
    const {
      width,
      height,
      setBypassCSP,
    } = options;

    const page = await this.browser.newPage();
    await page.setViewport({
      width,
      height,
    });
    await page.setBypassCSP(setBypassCSP);
    return page
  }

  async init(browserOptions = {}, pageOptions = {}) {
    this.pageOptions = pageOptions

    const {
      headless,
      userDataDir,
      executablePath,
    } = browserOptions;

    const {
      width,
      height,
      setBypassCSP,
    } = pageOptions;

    let [ browserErr ] = await to(this.createBrowser({
      headless,
      userDataDir,
      executablePath,
    }))

    if (browserErr) {
      this.logger.info(browserErr, `Failed creating Browser instance. Gracefully shutting down the SMSforBets Campaign scraper script!`)
      return
    }
    this.logger.info(`Browser instance created. Version: ${await this.browser.version()}`)

    let [ pageErr, page ] = await to(this.createPage({
      width,
      height,
      setBypassCSP,
    }))

    if (pageErr) {
      this.logger.info(pageErr, `Failed creating Page instance. Gracefully shutting down the SMSforBets Campaign scraper script!`)
      return
    }
    this.page = page
    this.logger.info(`Page instance created.`)

    // Login
    let [ loginErr ] = await to(this.login(this.page))
    if (loginErr) {
      this.logger.info(loginErr, 'Login process failed. Gracefully shutting down the SMSforBets Campaign scraper script!')
      await this.closeBrowser()
    }

    try {
      // Get cookies
      this.cookies = await this.page.cookies()

      await this.page.goto(this.site.post_url, {
        waitUntil: 'networkidle2',
      })

      await this.scrape()
    } catch (err) {
      this.logger.info(err, 'Exiting due to scraping error. Remaining campaigns will be processed in the next run.')
    } finally {
      await this.closeBrowser()
    }

    return this;
  }

  async login(page) {
    await page.goto(this.site.login_url, {
      waitUntil: 'networkidle2',
    });
    await page.type('#loginAreax > div:nth-child(3) > div > input', String(this.site.username));
    await page.type('#loginAreax > div:nth-child(4) > div > input', this.site.password);
    await page.click('#girisyap');
    await page.waitForNavigation();
  }

  async scrape() {
    const promises = this.campaignTransactions.map(async (campaignTransaction, idx) => {
      let page = this.page
      if (idx > 0) {
        page = await this.createPage(this.pageOptions)
        await page.setCookie(...this.cookies)
        await page.goto(this.site.post_url)
      }

      let [ detailedPageErr ] = await to(this.fillDetailsPages(page, campaignTransaction))
      if (detailedPageErr) {
        this.logger.info(detailedPageErr, `Detailed page processing failed for campaign id ${campaignTransaction.id}. Will be retried in the next run.`)
        return
      }

      const dataSubmitted = await this.fillApprovalPage(page, campaignTransaction)
      if (!dataSubmitted) {
        return
      }

      let [dbUpdateErr, dbUpdate] = await to(SMSCampaignManager.updateCampaignProcessed(campaignTransaction))
      if (dbUpdateErr) {
        this.logger.info(`Campaign database update failed for campaign Id: ${campaignTransaction.id}`)
        return
      }
      this.logger.info(`Campaign database updated successfully for campaign Id: ${campaignTransaction.id}`)

      await page.deleteCookie(...this.cookies)
    })

    await Promise.all(promises)
  }

  async fillDetailsPages(page, campaignTransaction) {
    await page.type('#frmMesajGonder > div:nth-child(3) > div.panel-body > div > textarea', String(campaignTransaction.mobileNumbers))
    await page.type('#mesaj', campaignTransaction.messageText)
    await page.click('#btnSubmit')
    await page.waitForNavigation()
  }

  async fillApprovalPage(page, campaignTransaction) {
    let [ approvalSubmitClickErr ]  = await to(page.click('#ortaDetay > form > div:nth-child(4) > div:nth-child(3) > input'))
    if (approvalSubmitClickErr) {
      this.logger.info(approvalSubmitClickErr, `Approval page submit button click failed for campaign id ${campaignTransaction.id}. Will be retried in the next run.`)
      return
    }
    await page.waitForNavigation()

    let dataSubmitted = true
    let [ verificationErr ] = await to(page.waitForFunction(`document.body.innerText.includes('Mesajınızın gönderimi başarıyla gerçekleşmiştir')`, {
      timeout: 5000
    }))

    if (verificationErr) {
      dataSubmitted = false
      this.logger.info(verificationErr, `Campaign details failed for campaign Id ${campaignTransaction.id}. Form submit didn't return success message!`)
    } else {
      this.logger.info(`Campaign details submitted successfully for campaign Id ${campaignTransaction.id} with message text::
    '${campaignTransaction.messageText}' and mobile numbers:: ${campaignTransaction.mobileNumbers}`)
    }

    return dataSubmitted
  }
}
