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

// const generateRandomWeeklyDataSeries = weeklyDataSeries => {
//   const dailyDataSeries = []
//   for (let i = 0; i < monthlyDataSeries.dates.length; i++) {
//     const serie = monthlyDataSeries.series.filter(
//       serie => serie.type === 'gas' || serie.type === 'electricity'
//     )[0]
//     const consumptionMonth = serie.values[i]
//     const startDateISO = parseISO(monthlyDataSeries.dates[i])
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
//     weeklyDataSeries.push(weeklyDataSerie)
//   }
// }

const generateRandomDailyDataSeries = (monthlyDataSeries, energyType) => {
  const dailyDataSeries = []
  const serie = monthlyDataSeries.series.filter(
    serie => serie.type === energyType
  )[0]
  for (let i = 0; i < monthlyDataSeries.dates.length; i++) {
    const consumptionMonth = serie.values[i]
    const startDateISO = parseISO(monthlyDataSeries.dates[i])
    const endDateISO = formatISO(lastDayOfMonth(startDateISO), { representation: 'date' })
    console.log('start : ', startDateISO)
    console.log('end : ', endDateISO)
    const daysInMonth = eachDayOfInterval({
      start: startDateISO,
      end: new Date(endDateISO)
    }).map(date => formatISO(date, {representation: 'date'}))
    
    const daysValues = generateRandomValues(
      daysInMonth.length,
      consumptionMonth
    )
    const series = [{ type: serie.type, values: daysValues }]
    const dayDataSerie = {
      startDate: startDateISO,
      endDate: new Date(endDateISO),
      dates: daysInMonth.map(date => new Date(date)),
      series
    }
    dailyDataSeries.push(dayDataSerie)
  }
  return dailyDataSeries
}

const extractEnergyDataSeries = (consumptionData, statementReason, type) => {
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
  const series = [
    {
      values: serieValues.map(e => e.value),
      type: type
    },
    {
      values: serieValues.map(e => e.cost),
      type: 'money'
    }
  ]
  return {
    startDate: serieValues[0].date,
    endDate: serieValues[serieValues.length - 1].date,
    dates: serieValues.map(e => e.date),
    series
  }
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

utils.createEnergyDailyTS = async (
  client,
  monthlyDataSeries,
  energyType,
  dryRun
) => {
  const dailyDataSeries = generateRandomDailyDataSeries(
    monthlyDataSeries,
    energyType
  )
  if (!dryRun) {
    dailyDataSeries.map(async dataseries => {
      const energyTS = await client.save({
        _type: ENEDIS_TS_DOCTYPE,
        dataseries,
        dbSource: ENEDIS_TS_DOCTYPE,
        dataSource: 'Enedis'
      })
      log(
        'info',
        `Created daily ${energyType} time series on ${ENEDIS_TS_DOCTYPE} with ids ${energyTS.data._id}`
      )
    })
  } else {
    log(
      'info',
      `Would have created daily ${
        dailyDataSeries.length
      } ${energyType} time series on ${ENEDIS_TS_DOCTYPE} from ${dailyDataSeries[0].startDate.toISOString()} to ${dailyDataSeries[
        dailyDataSeries.length - 1
      ].endDate.toISOString()}`
    )
  }
}

utils.createEnergyMonthlyTS = async (
  client,
  dataseries,
  energyType,
  dryRun
) => {
  if (!dryRun) {
    const elecTS = await client.save({
      _type: EDF_TS_DOCTYPE,
      dataseries,
      dbSource: EDF_TS_DOCTYPE,
      dataSource: 'EDF'
    })
    log(
      'info',
      `Created monthly ${energyType} time serie on ${EDF_TS_DOCTYPE} with id ${elecTS.data._id}`
    )
  } else {
    log(
      'info',
      `Would have created monthly ${energyType} time serie on ${EDF_TS_DOCTYPE} from ${dataseries.startDate} to ${dataseries.endDate}`
    )
  }
}

utils.run = async (api, client, dryRun) => {
  await api.createDoctype(EDF_TS_DOCTYPE)
  await api.createDoctype(ENEDIS_TS_DOCTYPE)

  const consumptionData = edfData['org.fing.mesinfos.consumptionstatement']
  const elecDataSerie = extractEnergyDataSeries(
    consumptionData,
    'EdeliaMonthlyElecConsumption',
    'electricity'
  )
  const gasDataSerie = extractEnergyDataSeries(
    consumptionData,
    'EdeliaMonthlyGasConsumption',
    'gas'
  )
  await utils.createEnergyMonthlyTS(
    client,
    elecDataSerie,
    'electricity',
    dryRun
  )
  await utils.createEnergyMonthlyTS(client, gasDataSerie, 'gas', dryRun)
  await utils.createEnergyDailyTS(client, elecDataSerie, 'electricity', dryRun)
  await utils.createEnergyDailyTS(client, gasDataSerie, 'gas', dryRun)

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
