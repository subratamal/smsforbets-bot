import path from 'path'
import fs from 'fs-extra'
import yaml from 'js-yaml'
import puppeteer from 'puppeteer'
import { EventEmitter } from 'events'
import Logger from './utils/logger'

const logger = Logger('sms_campaign_logger')

const file = path.resolve('src/config.yaml')
const text = fs.readFileSync(file, 'utf8')
const jsonConfig = yaml.safeLoad(text)

const resolution = {
  x: 1920,
  y: 1080,
}

export default class SMSCampaignScraper extends EventEmitter {
  constructor(browser = {}, page = {}) {
    super();
    this.browser = browser;
    this.page = page;
    this.site = jsonConfig['site_meta']
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

  async createPage(options) {
    const {
      width,
      height,
      setBypassCSP,
    } = options;

    this.page = await this.browser.newPage();
    await this.page.setViewport({
      width,
      height,
    });
    await this.page.setBypassCSP(setBypassCSP);
  }

  async init(browserOptions = {}, pageOptions = {}) {
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

    await this.createPage({
      width,
      height,
      setBypassCSP,
    });

    await this.page.goto(this.site.login_url, {
      waitUntil: 'networkidle2',
    });

    // Login
    await this.page.type('#loginAreax > div:nth-child(3) > div > input', this.site.username);
    await this.page.type('#loginAreax > div:nth-child(4) > div > input', this.site.password);
    await this.page.click('#girisyap');
    await this.page.waitForNavigation();

    await this.page.goto(this.site.post_url, {
      waitUntil: 'networkidle2',
    })

    return this;
  }
}
