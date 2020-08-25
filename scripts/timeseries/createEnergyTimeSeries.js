const eachDayOfInterval = require('date-fns/eachDayOfInterval')
const parseISO = require('date-fns/parseISO')
const formatISO = require('date-fns/formatISO')
const lastDayOfMonth = require('date-fns/lastDayOfMonth')
const mkAPI = require('../api')
const log = require('cozy-logger').namespace('create-energy-time-series')

const EDF_TS_DOCTYPE = 'io.cozy.timeseries.fr.edf'
const ENEDIS_TS_DOCTYPE = 'io.cozy.timeseries.fr.enedis'

const edfData = require('../../data/edf/data.json')
const utils = {}

const sortByDate = (a, b) => {
  if (a.date < b.date) {
    return -1
  }
  if (a.date > b.date) {
    return 1
  }
  return 0
}

// Generate random values that sum to totalValueToReach
const generateRandomValues = (nValues, totalValueToReach) => {
  let totalValues = 0
  const values = []
  for (let i = 0; i < nValues - 1; i++) {
    const random = Math.floor(
      Math.random() *
        Math.floor(totalValueToReach - totalValues - (nValues - i))
    )
    values.push(random)
    totalValues += random
  }
  const lastValue = totalValueToReach - totalValues
  values.push(lastValue)
  return values
}

// const generateRandomWeeklydataserie = weeklydataserie => {
//   const dailydataserie = []
//   for (let i = 0; i < monthlydataserie.dates.length; i++) {
//     const serie = monthlydataserie.series.filter(
//       serie => serie.type === 'gas' || serie.type === 'electricity'
//     )[0]
//     const consumptionMonth = serie.values[i]
//     const startDateISO = parseISO(monthlydataserie.dates[i])
//     const endDateISO = lastDayOfMonth(startDateISO)
//     const weeksInMonth = eachWeekOfInterval({
//       start: startDateISO,
//       end: endDateISO
//     }).map(date => formatISO(date))

//     const weeksValues = generateRandomValues(
//       weeksInMonth.length,
//       consumptionMonth
//     )
//     const series = [{ type: serie.type, values: weeksValues }]
//     const weeklyDataSerie = {
//       startDate: startDateISO,
//       endDate: endDateISO,
//       dates: weeksInMonth,
//       series
//     }
//     weeklydataserie.push(weeklyDataSerie)
//   }
// }

/*
TODO: better understand date format and timezones...
*/
const generateRandomDailydataserie = monthlydataserie => {
  const dailydataserie = []

  for (let i = 0; i < monthlydataserie.dates.length; i++) {
    const consumptionMonth = monthlydataserie.values[i]
    const startDateISO = parseISO(monthlydataserie.dates[i])
    const endDateISO = formatISO(lastDayOfMonth(startDateISO), {
      representation: 'date'
    })
    const daysInMonth = eachDayOfInterval({
      start: startDateISO,
      end: new Date(endDateISO)
    }).map(date => formatISO(date, { representation: 'date' }))

    const daysValues = generateRandomValues(
      daysInMonth.length,
      consumptionMonth
    )
    const dayDataSerie = {
      startDate: startDateISO,
      endDate: new Date(endDateISO),
      dates: daysInMonth.map(date => new Date(date)),
      values: daysValues,
      type: monthlydataserie.type
    }
    dailydataserie.push(dayDataSerie)
  }
  return dailydataserie
}

const extractEnergydataserie = (consumptionData, statementReason, type) => {
  const serieValues = consumptionData
    .filter(entry => entry.statementReason === statementReason)
    .map(entry => {
      return {
        value: entry.value,
        cost: entry.cost,
        date: new Date(entry.period).toISOString()
      }
    })
    .sort(sortByDate)

  const serieId = serieValues[0].date // serieId should be unique, the date is not
  const energyTS = {
    startDate: serieValues[0].date,
    endDate: serieValues[serieValues.length - 1].date,
    dates: serieValues.map(e => e.date),
    values: serieValues.map(e => e.value),
    type,
    serieId
  }
  const moneyTS = {
    startDate: serieValues[0].date,
    endDate: serieValues[serieValues.length - 1].date,
    dates: serieValues.map(e => e.date),
    values: serieValues.map(e => e.value),
    type: 'money',
    serieId
  }
  return { energy: energyTS, money: moneyTS }
}

// utils.extractEnergyDataPoints = (consumptionData, statementReason, type) => {
//   const serieValues = consumptionData
//     .filter(entry => entry.statementReason === statementReason)
//     .map(entry => {
//       return {
//         value: entry.value,
//         cost: entry.cost,
//         date: new Date(entry.period)
//       }
//     })
//     .sort(sortByDate)
// }

utils.createEnergyDailyTS = async (client, monthlydataserie, dryRun) => {
  const dailydataserie = generateRandomDailydataserie(monthlydataserie)
  if (!dryRun) {
    dailydataserie.map(async dataserie => {
      const energyTS = await client.save({
        _type: ENEDIS_TS_DOCTYPE,
        dataserie,
        dbSource: ENEDIS_TS_DOCTYPE,
        dataSource: 'Enedis'
      })
      log(
        'info',
        `Created daily ${monthlydataserie.type} time series on ${ENEDIS_TS_DOCTYPE} with ids ${energyTS.data._id}`
      )
    })
  } else {
    log(
      'info',
      `Would have created daily ${dailydataserie.length} ${
        monthlydataserie.type
      } time series on ${ENEDIS_TS_DOCTYPE} from ${dailydataserie[0].startDate.toISOString()} to ${dailydataserie[
        dailydataserie.length - 1
      ].endDate.toISOString()}`
    )
  }
}

utils.createEnergyMonthlyTS = async (client, dataserie, dryRun) => {
  if (!dryRun) {
    const energyTS = await client.save({
      _type: EDF_TS_DOCTYPE,
      dataserie,
      dbSource: EDF_TS_DOCTYPE,
      dataSource: 'EDF'
    })
    log(
      'info',
      `Created monthly ${dataserie.type} time serie on ${EDF_TS_DOCTYPE} with id ${energyTS.data._id}`
    )
  } else {
    log(
      'info',
      `Would have created monthly ${dataserie.type} time serie on ${EDF_TS_DOCTYPE} from ${dataserie.startDate} to ${dataserie.endDate}`
    )
  }
}

utils.run = async (api, client, dryRun) => {
  await api.createDoctype(EDF_TS_DOCTYPE)
  await api.createDoctype(ENEDIS_TS_DOCTYPE)

  const consumptionData = edfData['org.fing.mesinfos.consumptionstatement']
  const elecDataSeries = extractEnergydataserie(
    consumptionData,
    'EdeliaMonthlyElecConsumption',
    'electricity'
  )
  const elecEnergyDS = elecDataSeries.energy
  const elecMoneyDS = elecDataSeries.money
  const gasDataSerie = extractEnergydataserie(
    consumptionData,
    'EdeliaMonthlyGasConsumption',
    'gas'
  )
  const gasEnergyDS = gasDataSerie.energy
  const gasMoneyDS = gasDataSerie.money
  await utils.createEnergyMonthlyTS(client, elecEnergyDS, dryRun)
  await utils.createEnergyMonthlyTS(client, elecMoneyDS, dryRun)
  await utils.createEnergyMonthlyTS(client, gasEnergyDS, dryRun)
  await utils.createEnergyMonthlyTS(client, gasMoneyDS, dryRun)
  await utils.createEnergyDailyTS(client, elecEnergyDS, dryRun)
  await utils.createEnergyDailyTS(client, gasEnergyDS, dryRun)

  return
}

module.exports = {
  getDoctypes: function() {
    return [EDF_TS_DOCTYPE, ENEDIS_TS_DOCTYPE]
  },
  utils,
  log,
  run: async function(ach, dryRun = false) {
    return utils.run(mkAPI(ach.client), ach.cozyClient, dryRun).catch(err => {
      console.log('well ?', err)
      return {
        error: {
          message: err.message,
          stack: err.stack
        }
      }
    })
  }
}
