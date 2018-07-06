import knex from './knex'
import yaml from 'js-yaml'
import path from 'path'
import fs from 'fs'

const file = path.resolve('src/config.yaml')
const text = fs.readFileSync(file, 'utf8')
const jsonConfig = yaml.safeLoad(text)
const appConfig = jsonConfig['app_config']
const pageSize = appConfig['page_size']

const CAMPAIGN_TABLE = 'sms_submissions'
const CAMPAIGN_TRANSACTION_TABLE = 'sms_submission_numbers'

class SMSCampaignData {
  async fetchUnprocessedCampaigns() {
    let rows

    try {
      rows = await knex
        .table(`${CAMPAIGN_TABLE} as ss`)
        .leftJoin(`${CAMPAIGN_TRANSACTION_TABLE} as ssn`, `ss.id`, `ssn.id_submission`)
        .where(`ssn.processed`, '=', 0)
        .groupBy(`ss.id`, `ss.message_text`)
        .select(
          `ss.id`,
          `ss.message_text`,
          knex.raw(`GROUP_CONCAT(ssn.mobile_number) mobile_numbers`)
        )
        .limit(pageSize)
    } catch (err) {
      console.log(err)
    }

    const results = rows.map(row => this.toPhoneNumber(row))
    return results
  }

  async updateCampaignProcessed(campaignTransaction) {
    let rows
    const mobileNumbers = this.toMobileNumersArray(campaignTransaction)
    try {
      rows = await knex
        .table(`${CAMPAIGN_TRANSACTION_TABLE}`)
        .where((builder) =>
          builder
          .where('id_submission', campaignTransaction.id)
          .whereIn('mobile_number', mobileNumbers)
        )
        .update({
          'processed': 1,
          'status': 1,
          'reference': 'test'
        })
    } catch (err) {
      console.log(err)
    }

    return rows
  }

  toPhoneNumber(row) {
    if (!row) return null

    return {
      id: row.id,
      messageText: row.message_text,
      mobileNumbers: '905305411415'
      // mobileNumbers: row.mobile_numbers.split(',').slice(0, 1).join(',')
    }
  }

  toMobileNumersArray(campaignTransaction) {
    const mobileNumbersTmp = campaignTransaction.mobileNumbers.split(',')
    const mobileNumbers = mobileNumbersTmp.map(mobileNumber => parseInt(mobileNumber))
    return mobileNumbers
  }
}

export default new SMSCampaignData()
