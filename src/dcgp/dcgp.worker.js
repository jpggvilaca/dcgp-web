/* eslint-env worker */
import initializer from 'dcgp'
import dcgpUrl from 'dcgp/dcgp.wasm'
import {
  setDcgpInstance,
  START_EVOLUTION,
  PAUSE_EVOLUTION,
  RESET_EVOLUTION,
  LOSS_THRESHOLD,
  evolutionProgress,
  pauseEvolution,
} from './actions'

let isEvolving = false
let hasReset = false

function handleMessages(event, dcgp) {
  switch (event.data.type) {
    case START_EVOLUTION:
      isEvolving = true
      hasReset = false
      runEvolutionAlgorithm(event.data, dcgp)
      break
    case PAUSE_EVOLUTION:
      isEvolving = false
      break
    case RESET_EVOLUTION:
      isEvolving = false
      hasReset = true
      break
    default:
      break
  }
}

function runEvolutionAlgorithm(action, dcgp) {
  const { parameters, activeKernelIds, step } = action.payload

  const {
    seed,
    network: { rows, columns, arity, levelsBack },
    algorithm: { id: algorithmId, maxGenerations, offsprings },
  } = parameters

  const myKernelSet = new dcgp.KernelSet(activeKernelIds)
  const myExpression = new dcgp.Expression(
    2,
    1,
    rows,
    columns,
    levelsBack,
    arity,
    myKernelSet,
    seed
  )

  // some simple dataset: y = 2x + 2
  const inputs = [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]]
  const outputs = [[2], [4], [6], [8], [10]]

  let index = 0

  // by wrapping each loop in a setTimeout
  // the new messages will be handled before the next loop
  // "it cuts the loop in seperate chunck"
  const evolutionStep = async () => {
    return await new Promise(resolve => {
      setTimeout(() => {
        index++

        const resultObj = dcgp.algorithms[algorithmId](
          myExpression,
          offsprings,
          maxGenerations,
          inputs,
          outputs
        )

        resolve(resultObj)
      }, 0)
    })
  }

  const sendProgress = async resultObj => {
    await new Promise(resolve => {
      setTimeout(() => {
        !hasReset &&
          postMessage(
            evolutionProgress({
              ...resultObj,
              step: step + index * maxGenerations,
            })
          )

        resolve()
      }, 0)
    })
  }

  const evolutionLoop = async () => {
    while (isEvolving) {
      const resultObj = await evolutionStep()

      await sendProgress(resultObj)

      if (resultObj.loss <= LOSS_THRESHOLD) {
        postMessage(pauseEvolution())
      }
    }
  }

  evolutionLoop().then(() => {
    myKernelSet.destroy()
    myExpression.destroy()
  })
}

const main = async () => {
  const dcgp = await initializer(fetch(dcgpUrl))

  postMessage(setDcgpInstance({ module: dcgp.module }))

  onmessage = event => handleMessages(event, dcgp)
}

main()
