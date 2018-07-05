import path from 'path'
import fs from 'fs-extra'
import yaml from 'js-yaml'
import to from 'await-to-js'
import puppeteer from 'puppeteer'
import {
  EventEmitter 
} from 'events'
import Logger from './utils/logger'
import SMSCampaignManager from './managers/sms-campaign-data'

const logger = Logger('sms_campaign_logger')

const file = path.resolve('src/config.yaml')
const text = fs.readFileSync(file, 'utf8')
const jsonConfig = yaml.safeLoad(text)

const resolution = {
  x: 1920,
  y: 1080,
}

export default class SMSCampaignScraper extends EventEmitter {
  constructor(campaignTransactions = [], browser = {}, page = {}, ) {
    super();
    this.browser = browser;
    this.page = page;
    this.site = jsonConfig['site_meta']
    this.campaignTransactions = campaignTransactions
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
    logger.info(`Browser instance created. Version: ${await this.browser.version()}`)
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

    await this.createBrowser({
      headless,
      userDataDir,
      executablePath,
    });

    this.page = await this.createPage({
      width,
      height,
      setBypassCSP,
    });

    // Login
    try {
      await this.login(this.page)
    } catch (err) {
      logger.info('Login failed. Exiting')
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
      logger.info('exiting due to scraping error. remaining campaigns will be processed in the next run')
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
      await this.fillDetailsPages(page, campaignTransaction)
      const dataSubmitted = await this.fillApprovalPage(page)
      if (!dataSubmitted) {
        return
      }

      let err, dbUpdated;
      [err, dbUpdate] = to(await SMSCampaignManager.updateCampaignProcessed(campaignTransaction))
      if (err) {
        logger.info(`campaign status update failed for campaign Id: ${campaignTransaction.id}`)
      }
      logger.info(`campaign status updated successfully for campaign Id: ${campaignTransaction.id} with mobile numbers
        ${campaignTransaction.mobileNumbers}`)

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

  async fillApprovalPage(page) {
    await page.click('#ortaDetay > form > div:nth-child(4) > div:nth-child(3) > input')
    await page.waitForNavigation()

    let dataSubmitted = true
    let [err] = await to(page.waitForFunction(`document.body.innerText.includes('Mesajınızın gönderimi başarıyla gerçekleşmiştir')`, {
      timeout: 5000
    }))

    if (err) {
      dataSubmitted = false
      logger.info(err)
    } else {
      logger.info(`campaign details submitted successfully for campaign Id ${campaignTransaction.id} with message text::
    '${campaignTransaction.messageText}' and mobile numbers:: ${campaignTransaction.mobileNumbers}`)
    }

    return dataSubmitted
  }
}
