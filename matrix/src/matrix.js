import * as _ from 'lodash'

const getComplimentaryCoordinate = prop => prop === 'col' ? 'row' : 'col'

const getSpanKey = prop => `${prop}span`

const getSpan = (cell, prop) => cell[getSpanKey(prop)]

const hasSpan = (cell, prop) => !_.isNil(getSpan(cell, prop))

const mergedAreaIncludesCell = (mergedCell, prop, cell) =>
  mergedCell[prop] + mergedCell[getSpanKey(prop)] > cell[prop]

const isInRange = (cell, prop, index, amount) =>
  cell[prop] >= index && cell[prop] < index + amount

const willBeDeleted = (cell, tableData) => {
  const {prop, index, amount} = tableData
  return isADeletion(amount) && isInRange(cell, prop, index, Math.abs(amount)) 
}

const hasSameComplimentaryCoordinate = (cell1, cell2, prop) =>
  cell1[getComplimentaryCoordinate(prop)] === cell2[getComplimentaryCoordinate(prop)]

const isNextToDeletedArea = (cell, prop, index, amount) =>
  cell[prop] === index + amount

const isADeletion = amount => amount < 0

const reallocateMergedCells = (tableData) => {
  if (!isADeletion(tableData.amount)) {
    return rellocateNotDeletion(tableData)
  }

  return reallocateDeletion(tableData)
}

const rellocateNotDeletion = ({cells, prop, index, amount}) => {
    return _.flatMap(cells, cell => {
      if (cell[prop] < index && hasSpan(cell, prop) && cell[prop] + getSpan(cell, prop) > index) {
          return [{ ...cell, [getSpanKey(prop)]: getSpan(cell, prop) + amount }]
      }

      return [cell]
    })
}

const reallocateDeletion = (tableData) => {
  const {cells, prop, index, amount} = tableData

  return _.map(cells, cell => {

    if (willBeDeleted(cell, tableData)) {
      return cell
    }

    if (hasSpan(cell, prop) && cell[prop] + getSpan(cell, prop) > index) {
      const countOfDeletedOutsideMergedArea = getCountDeletedOutsideMergedArea(cell, tableData)
      return {
        ...cell,
        [getSpanKey(prop)]: getSpan(cell, prop) - ((-amount) - countOfDeletedOutsideMergedArea)
      }
    }

    if (isNextToDeletedArea(cell, prop, index, (-amount))) {
      const mergedCell = findMergedCells(cell, tableData)

      if (mergedCell) {
        return {
          ...cell,
          ..._.pick(mergedCell, ['rowspan', 'colspan']),
          [getSpanKey(prop)]: getSpan(mergedCell, prop) - (cell[prop] - mergedCell[prop])
        }
      }
    }

    return cell

  })
}

const findMergedCells = (cell, tableData) => {
  const {cells, prop} = tableData

  return _.find(cells, potentialMergedCell => {
    const sameComplimentaryCoordinate = hasSameComplimentaryCoordinate(potentialMergedCell, cell, prop)
    const isBeingRemoved = willBeDeleted(potentialMergedCell, tableData)
    const hasPropSpan = hasSpan(potentialMergedCell, prop)
    const included = mergedAreaIncludesCell(potentialMergedCell, prop, cell)

    return  sameComplimentaryCoordinate && isBeingRemoved && hasPropSpan && included
  })
}

const getCountDeletedOutsideMergedArea = (cell, tableData) => {
  const {prop, index, amount} = tableData
  return _.max([0, (index + (-amount)) - (cell[prop] + getSpan(cell, prop))])
}

const removeCells = (tableData) => {
  const {cells} = tableData
  return _.filter(cells, cell => !willBeDeleted(cell, tableData))
}

const moveCells = (tableData) => {
  const {cells, prop, index, amount} = tableData

  const result = _.flatMap(cells, cell => {
    if (cell[prop] < index) {
      return [cell]
    }

    const newProp = cell[prop] + amount
    const moved = { ...cell, [prop]: newProp }

    return newProp < 0 ? [] : [moved]
  })
  
  return result
}

export const reallocate = (cells, prop, index, amount) => {
  const tableData = {cells, prop, index, amount}
  tableData.cells = reallocateMergedCells(tableData)

  if (isADeletion(amount)) {
    tableData.cells = removeCells(tableData)
  }

  return moveCells(tableData)
}
