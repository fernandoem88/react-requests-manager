import React, { useEffect, useState } from 'react'
import ReactSlider from 'react-slider'

import { Root } from './styled'
import { $$, useRequests } from '../../reducers/requests'
import { getRandomNumber } from '../../configs'

interface Props {
  duration?: number
  requestName: keyof typeof $$.requests
  index: number
  version: string
}
const RequestItem: React.FC<Props> = React.memo((props) => {
  const { requestName } = props
  const [duration] = useState(() => props.duration || getRandomNumber(4) + 1)
  const [processId, setProcessId] = useState<string>()
  const [value, setValue] = useState(0)
  const [timer, setTimer] = useState(duration)

  const process = useRequests((reqs) => {
    const { details } = reqs[requestName]
    return details.processes.find((pcss) => pcss.id === processId)
  })

  const isProcessing = !!(process?.status === 'processing')
  const isEnded = !!(
    process?.status === 'success' || process?.status === 'error'
  )
  const isSuspended = !!(process?.status === 'suspended')
  const isAborted = !!(process?.status === 'aborted')
  useEffect(() => {
    if (isEnded) {
      setValue(100)
      setTimer(0)
    }
  }, [isEnded])
  useEffect(() => {
    if (!isProcessing) return
    let d = duration
    const ti = setInterval(() => {
      setTimer((t) => {
        const newT = t - 1
        d = newT
        if (newT < 0) {
          return 0
        }
        return newT
      })
      if (d <= 0) {
        clearInterval(ti)
      }
    }, 1000)
    return () => clearInterval(ti)
  }, [duration, isProcessing])

  useEffect(() => {
    let d = 0
    if (!isProcessing) return
    const ti = setInterval(() => {
      setValue((v) => {
        const newV = v + 1
        d = newV
        if (newV > 100) {
          return v
        }
        return newV
      })
      if (d >= 100) {
        clearInterval(ti)
      }
    }, 10 * duration)
    return () => clearInterval(ti)
  }, [duration, isProcessing])

  useEffect(() => {
    if (!process) {
      setProcessId(undefined)
      setTimer(duration)
    }
  }, [process, duration])

  const processingStatus = process?.status

  const handleStart = () => {
    const pcssId = $$.requests[requestName]({
      delay: duration,
      index: props.index
    })
    setTimer(duration)
    setValue(0)
    !!pcssId && setProcessId(pcssId)
  }

  const handleAbort = () => {
    if (process) {
      $$.actions.abort({
        requestName: process.requestName as any,
        id: process.id
      })
    }
  }
  return (
    <Root status={processingStatus}>
      <div>
        <ReactSlider
          className='request-slider'
          thumbClassName='request-thumb'
          trackClassName='request-track'
          value={[value, 100]}
          ariaLabel={['Lower thumb', 'Upper thumb']}
          ariaValuetext={(state) => `Thumb value ${state.valueNow}`}
          renderThumb={(thumbProps, state) => {
            if (thumbProps.key === 'request-thumb-1')
              return <div {...thumbProps} />
            return (
              <div {...thumbProps}>
                {isEnded || isAborted || isSuspended
                  ? `${process?.status || ''} ${state.valueNow}% `
                  : ''}
              </div>
            )
          }}
          pearling
          minDistance={0}
        />
        {timer}
      </div>
      <div>
        <div onClick={isProcessing || isSuspended ? handleAbort : handleStart}>
          {isProcessing || isSuspended ? 'abort' : 'start'}
        </div>
      </div>
    </Root>
  )
})
export type RequestItemProps = Props
export default React.memo(RequestItem)
