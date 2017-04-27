const dummyjson = require('dummy-json')

module.exports.helpers = {
  bankCompany: function () {
    const companies = ['Bye Bank', 'Indirecting', 'Caisse Livret', 'Credit Aquacole']
    return dummyjson.utils.randomArrayItem(companies)
  },

  // regular operations
  regularOperationsType: function () {
    const types = [
      'children_activities',
      'pocket_money',
      'toys',
      'regular_shopping',
      'pets',
      'clothing',
      'telecom',
      'shopping',
      'meals',
      'daily_life_others',
      'education_supplies',
      'electricity',
      'furnitures',
      'electronic',
      'multimedia',
      'hobbies',
      'advances',
      'expenses_bill',
      'internal_transfer',
      'bank_charges',
      'post',
      'taxes_others',
      'fuel',
      'vehicle_maintenance',
      'public_transportation',
      'restaurants',
      'cultural_trips',
      'cheques'
    ]
    return dummyjson.utils.randomArrayItem(types)
  }
}

const FORMATED_DATE =
  "{{date '2017-03-01' '2017-03-31' 'YYYY-MM-DDTHH:mm:ssZ'}}"

module.exports.partials = {
  randomRegularOperation: `{
    "bankAccount": "{{bankCompany}}",
    "label": "{{lorem 5}}",
    "operationType": "{{regularOperationsType}}",
    "date": "${FORMATED_DATE}",
    "amount": {{float -200 -3 round=0.01}},
    "raw": "{{lorem 10}}",
    "dateImport": "${FORMATED_DATE}",
    "currency": "€"
  }`,

  smallDebit: `{
    "bankAccount": "{{bankCompany}}",
    "label": "{{{label}}}",
    "operationType": "{{{type}}}",
    "date": "${FORMATED_DATE}",
    "amount": {{float -50 -5 round=0.01}},
    "raw": "{{{label}}}",
    "dateImport": "${FORMATED_DATE}",
    "currency": "€"
  }`,

  debit: `{
    "bankAccount": "{{bankCompany}}",
    "label": "{{{label}}}",
    "operationType": "{{{type}}}",
    "date": "${FORMATED_DATE}",
    "amount": {{float -150 -5 round=0.01}},
    "raw": "{{{label}}}",
    "dateImport": "${FORMATED_DATE}",
    "currency": "€"
  }`,

  bigDebit: `{
    "bankAccount": "{{bankCompany}}",
    "label": "{{{label}}}",
    "operationType": "{{{type}}}",
    "date": "${FORMATED_DATE}",
    "amount": {{float -1500 -500 round=0.01}},
    "raw": "{{{label}}}",
    "dateImport": "${FORMATED_DATE}",
    "currency": "€"
  }`,

  healthOperation: `{
    "bankAccount": "{{bankCompany}}",
    "label": "Consultation Docteur {{lastName}}",
    "operationType": "health_costs",
    "date": "${FORMATED_DATE}",
    "amount": {{float -450 -70 round=0.01}},
    "raw": "Consultation Docteur {{lastName}}",
    "dateImport": "${FORMATED_DATE}",
    "currency": "€",
    "action": {
      "type": "refund",
      "url": "https://recette-sante.cozy.works/#/remboursements"
    }
  }`,

  credit: `{
    "bankAccount": "{{bankCompany}}",
    "label": "{{{label}}}",
    "operationType": "{{{type}}}",
    "date": "${FORMATED_DATE}",
    "amount": {{float 10 150 round=0.01}},
    "raw": "{{{label}}}",
    "dateImport": "${FORMATED_DATE}",
    "currency": "€"
  }`,

  bigCredit: `{
    "bankAccount": "{{bankCompany}}",
    "label": "{{{label}}}",
    "operationType": "{{{type}}}",
    "date": "${FORMATED_DATE}",
    "amount": {{float 500 1500 round=0.01}},
    "raw": "{{{label}}}",
    "dateImport": "${FORMATED_DATE}",
    "currency": "€"
  }`,

  salaryOperation: `{
    "bankAccount": "{{bankCompany}}",
    "label": "Salaire de {{{mois}}}, de {{company}}",
    "operationType": "salary",
    "date": "${FORMATED_DATE}",
    "amount": {{float 2600 4000 round=0.01}},
    "raw": "Salaire de {{{mois}}}, de {{company}}",
    "dateImport": "${FORMATED_DATE}",
    "currency": "€"
  }`
}
