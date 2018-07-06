import path from 'path'
import fs from 'fs-extra'
import yaml from 'js-yaml'
import to from 'await-to-js'
import puppeteer from 'puppeteer'
import {
  EventEmitter 
} from 'events'
import SMSCampaignManager from './managers/sms-campaign-data'

const file = path.resolve('src/config.yaml')
const text = fs.readFileSync(file, 'utf8')
const jsonConfig = yaml.safeLoad(text)

const resolution = {
  x: 1920,
  y: 1080,
}

export default class SMSCampaignScraper extends EventEmitter {
  constructor({
    campaignTransactions = [],
    runId,
    logger
  }) {
    super();
    this.site = jsonConfig['site_meta']
    this.campaignTransactions = campaignTransactions
    this.runId = runId
    this.logger = logger

    fs.ensureDirSync(`./images/${this.runId}`)
  }

  async createBrowser(options = {}) {
    const defaultArgs = [
      '--disable-gpu',
      `--window-size=${resolution.x},${resolution.y}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
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
    if (this.browser) {
      await this.browser.close()
    }
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
    // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36')

    if (this.site['optimize_resource_fetch']) {
      await page.setRequestInterception(true)
      const block_ressources = ['image', 'stylesheet', 'media', 'font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset']
      page.on('request', request => {
        if (block_ressources.indexOf(request.resourceType()) > 0)
          request.abort()
        else
          request.continue()
      })
    }

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

    let [browserErr] = await to(this.createBrowser({
      headless,
      userDataDir,
      executablePath,
    }))

    if (browserErr) {
      this.logger.info(browserErr, `Failed creating Browser instance. Gracefully shutting down the SMSforBets Campaign scraper script!`)
      return
    }
    this.logger.info(`Browser instance created. Version: ${await this.browser.version()}`)

    let [pageErr, page] = await to(this.createPage({
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
    let [loginErr] = await to(this.login(this.page))
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
      await page.screenshot({path: path.resolve(`images/${this.runId}/post_page.png`)})

      await this.scrape()
    } catch (err) {
      this.logger.info(err, 'Exiting due to scraping error. Remaining campaigns will be processed in the next run.')
    } finally {
      await this.closeBrowser()
    }

    return this;
  }

  async login(page) {
    await page.goto(this.site.login_url)
    await page.screenshot({path: path.resolve(`images/${this.runId}/login.png`)})
    await this.enterText(page, '#loginAreax > div:nth-child(3) > div > input', String(this.site.username))
    await this.enterText(page, '#loginAreax > div:nth-child(4) > div > input', this.site.password)
    await page.click('#girisyap')
    await page.waitForNavigation()
  }

  async scrape() {
    const promises = this.campaignTransactions.map(async (campaignTransaction, idx) => {
      fs.ensureDirSync(`./images/${this.runId}/${campaignTransaction.id}`)

      let page = this.page
      if (idx > 0) {
        page = await this.createPage(this.pageOptions)
        await page.setCookie(...this.cookies)
        await page.goto(this.site.post_url)
      }

      let [detailedPageErr] = await to(this.fillDetailsPages(page, campaignTransaction))
      if (detailedPageErr) {
        this.logger.info({err: detailedPageErr, campaignId: campaignTransaction.id}, `Detailed page processing failed. Will be retried in the next run.`)
        return
      }

      const dataSubmitted = await this.fillApprovalPage(page, campaignTransaction)
      if (!dataSubmitted) {
        return
      }

      let [dbUpdateErr, dbUpdate] = await to(SMSCampaignManager.updateCampaignProcessed(campaignTransaction))
      if (dbUpdateErr) {
        this.logger.info({campaignId: campaignTransaction.id}, `Campaign database update failed.`)
        return
      }
      this.logger.info({campaignId: campaignTransaction.id}, `Campaign database updated successfully.`)

      await page.deleteCookie(...this.cookies)
    })

    await Promise.all(promises)
  }

  async fillDetailsPages(page, campaignTransaction) {
    await this.enterText(page, '#frmMesajGonder > div:nth-child(3) > div.panel-body > div > textarea', String(campaignTransaction.mobileNumbers))
    await this.enterText(page, '#mesaj', campaignTransaction.messageText)
    await page.screenshot({path: path.resolve(`images/${this.runId}/${campaignTransaction.id}/detailed_page_info.png`)})
    await page.click('#btnSubmit')
    await page.waitForNavigation()
  }

  async fillApprovalPage(page, campaignTransaction) {
    await page.screenshot({path: path.resolve(`images/${this.runId}/${campaignTransaction.id}/approval_page_before.png`)})
    await page.waitForSelector('#ortaDetay > form > div:nth-child(4) > div:nth-child(3) > input')

    let [approvalSubmitClickErr] = await to(page.click('#ortaDetay > form > div:nth-child(4) > div:nth-child(3) > input'))
    if (approvalSubmitClickErr) {
      this.logger.info({err: approvalSubmitClickErr, campaignId: campaignTransaction.id}, `Approval page submit button click failed. Will be retried in the next run.`)
      return
    }

    // await page.waitForNavigation({
    //   waitUntil: 'domcontentloaded'
    // })
    await page.screenshot({path: path.resolve(`images/${this.runId}/${campaignTransaction.id}/approval_page_after_submit.png`)})

    let dataSubmitted = true
    let [verificationErr] = await to(page.waitForFunction(`document.body.innerText.includes('Mesajınızın gönderimi başarıyla gerçekleşmiştir')`, {
      timeout: 5000
    }))

    if (verificationErr) {
      dataSubmitted = false
      this.logger.info({err: verificationErr, campaignId: campaignTransaction.id}, `Campaign details failed. Form submit didn't return success message!`)
    } else {
      this.logger.info({campaignId: campaignTransaction.id, messageText: campaignTransaction.messageText, mobileNumbers: campaignTransaction.mobileNumbers}, `Campaign details submitted successfully.`)
    }

    return dataSubmitted
  }

  async enterText(page, selector, text) {
    await page.click(selector)
    await page.keyboard.type(text)
  }

  async clickNavigate (page, selector, waitFor = -1) {
    await page.click(selector)
    if (waitFor >= 0) {
      await page.waitFor(waitFor * 1000)
    }
    else {
      await page.waitForNavigation()
    }
  }

  async destroy() {
    await this.closeBrowser()
  }
}
