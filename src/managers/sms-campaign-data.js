import knex from './knex'

const CAMPAIGN_TABLE = 'sms_submissions'
const CAMPAIGN_TRANSACTION_TABLE = 'sms_submission_numbers'

class SMSCampaignData {
  async fetchUnprocessedCampaigns() {
    let rows

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

    const results = rows.map(row => this.toPhoneNumber(row))
    return results
  }

  async updateCampaignProcessed(campaignTransaction) {
    let rows

    rows = await knew
      .table(`${CAMPAIGN_TRANSACTION_TABLE}`)
      .whereIn('id_submission', campaignTransaction.mobileNumbers)
      .update({
        'processed': 1,
        'status': 1,
        'reference': 'test'
      })

    return rows
  }

  toPhoneNumber(row) {
    if (!row) return null

    return {
      id: row.id,
      messageText: row.message_text,
      mobileNumbers: row.mobile_numbers
    }
  }
}

export default new SMSCampaignData()
