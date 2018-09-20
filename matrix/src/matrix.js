import * as _ from 'lodash'

const getComplimentaryCoordinate = prop => prop === 'col' ? 'row' : 'col'

const getSpanKey = prop => `${prop}span`

const getSpan = (cell, prop) => cell[getSpanKey(prop)]

const hasSpan = (cell, prop) => !_.isNil(getSpan(cell, prop))

const mergedAreaIncludesCell = (mergedCell, prop, cell) =>
  mergedCell[prop] + mergedCell[getSpanKey(prop)] > cell[prop]

const isInRange = (cell, prop, index, amount) =>
  cell[prop] >= index && cell[prop] < index + amount

const willBeDeleted = (cell, prop, index, amount) =>
  isADeletion(amount) && isInRange(cell, prop, index, Math.abs(amount))

const hasSameComplimentaryCoordinate = (cell1, cell2, prop) =>
  cell1[getComplimentaryCoordinate(prop)] === cell2[getComplimentaryCoordinate(prop)]

const isNextToDeletedArea = (cell, prop, index, amount) =>
  cell[prop] === index + amount

const isADeletion = amount => amount < 0

const reallocateMergedCells = (cells, prop, index, amount) => {
  if (!isADeletion(amount)) {
    return rellocateNotDeletion(cells, prop, index, amount)
  }

  return reallocateDeletion(cells, prop, index, amount)
}

const rellocateNotDeletion = (cells, prop, index, amount) => {
    return _.flatMap(cells, cell => {
      if (cell[prop] < index && (!hasSpan(cell, prop) || cell[prop] + getSpan(cell, prop) <= index)) {
        return [cell]
      }

      if (cell[prop] < index && hasSpan(cell, prop) && cell[prop] + getSpan(cell, prop) > index) {
        if (!isADeletion(amount)) {
          return [{ ...cell, [getSpanKey(prop)]: getSpan(cell, prop) + amount }]
        }
        return [cell]
      }

      return [cell]
    })
}

const reallocateDeletion = (cells, prop, index, amount) => {
  return _.map(cells, cell => {

    if (willBeDeleted(cell, prop, index, amount)) {
      return cell
    }

    if (hasSpan(cell, prop) && cell[prop] + getSpan(cell, prop) > index) {
      const countOfDeletedOutsideMergedArea = getCountDeletedOutsideMergedArea(cell, prop, index, amount)
      return {
        ...cell,
        [getSpanKey(prop)]: getSpan(cell, prop) - ((-amount) - countOfDeletedOutsideMergedArea)
      }
    }

    if (isNextToDeletedArea(cell, prop, index, (-amount))) {
      const mergedCell = findMergedCells(cells, cell, prop, index, amount)

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

const findMergedCells = (cells, cell, prop, index, amount) => {
  return _.find(cells, potentialMergedCell => {
    const sameComplimentaryCoordinate = hasSameComplimentaryCoordinate(potentialMergedCell, cell, prop)
    const isBeingRemoved = willBeDeleted(potentialMergedCell, prop, index, amount)
    const hasPropSpan = hasSpan(potentialMergedCell, prop)
    const included = mergedAreaIncludesCell(potentialMergedCell, prop, cell)

    return  sameComplimentaryCoordinate
        && isBeingRemoved
        && hasPropSpan
        && included
  })
}

const getCountDeletedOutsideMergedArea = (cell, prop, index, amount) => _.max([0, (index + (-amount)) - (cell[prop] + getSpan(cell, prop))])

const removeCells = (cells, prop, index, amount) =>
  _.filter(cells, cell => !willBeDeleted(cell, prop, index, amount))

const moveCells = (cells, prop, index, amount) => {
  const result = _.flatMap(cells, cell => {
    if (cell[prop] < index) {
      return [cell]
    }

    const newProp = cell[prop] + amount
    if (newProp < 0) {
      return []
    }

    const result = { ...cell, [prop]: cell[prop] + amount }
    return [result]
  })
  
  return result
}

export const reallocate = (cells, prop, index, amount) => {
  let paramCells = reallocateMergedCells(cells, prop, index, amount)

  if (isADeletion(amount)) {
    paramCells = removeCells(paramCells, prop, index, amount)
  }

  return moveCells(paramCells, prop, index, amount)
}
