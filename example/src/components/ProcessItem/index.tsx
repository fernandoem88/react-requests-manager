import React, { useEffect, useState } from 'react'
import ReactSlider from 'react-slider'

import { Root, SliderWrapper, ThumbLabel } from './styled'
import { $$ } from '../../reducers/requests-configurator'
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

  const process = $$.useRequests((reqs) => {
    const { details } = reqs[requestName]
    return details.processes.find((pcss) => pcss.id === processId)
  })

  const isProcessing = !!(process?.status === 'processing')
  const isEnded = !!(
    process?.status === 'success' || process?.status === 'error'
  )
  const isSuspended = !!(process?.status === 'suspended')
  const canAbort = isProcessing || isSuspended
  const canStart = !process
  useEffect(() => {
    if (isEnded) {
      setValue(100)
    }
  }, [isEnded])

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
    }
  }, [process, duration])

  const processingStatus = process?.status

  const handleStart = () => {
    const pcssId = $$.requests[requestName]({
      delay: duration,
      index: props.index
    })
    setValue(0)
    !!pcssId && setProcessId(pcssId)
  }

  const handleAbort = () => {
    if (process) {
      $$.extraActions.abort({
        requestName: process.requestName as any,
        id: process.id
      })
    }
  }
  return (
    <Root status={processingStatus}>
      <SliderWrapper>
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

            let label = `${duration} second${duration > 1 ? 's' : ''}`
            if (process) {
              const { index, status } = process
              label = `process #${index}: ${status || ''} ${state.valueNow}%`
            }

            return (
              <React.Fragment key={props.index}>
                <div {...thumbProps} key={'thumb'}></div>
                <ThumbLabel key={'label'} status={processingStatus}>
                  {label}
                </ThumbLabel>
              </React.Fragment>
            )
          }}
          pearling
          minDistance={0}
        />
      </SliderWrapper>
      {(canAbort || canStart) && (
        <div>
          {
            <div onClick={canAbort ? handleAbort : handleStart}>
              {canAbort ? 'abort' : 'start'}
            </div>
          }
        </div>
      )}
    </Root>
  )
})
export type RequestItemProps = Props
export default React.memo(RequestItem)
