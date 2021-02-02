import React, { useState, useEffect } from 'react'
import uniqid from 'uniqid'

import { Root, Header, Title, Status, ActionWrapper } from './styled'

import { $$ } from '../../reducers/requests-configurator'
import ProcessItem from '../ProcessItem'

interface Props {
  requestName: keyof typeof $$.requests
  duration?: number
}
const RequestItem: React.FC<Props> = (props) => {
  const { requestName } = props
  const req = $$.useRequests((reqs) => reqs[props.requestName])
  const [version, setVersion] = useState('')
  const [ids, setIds] = useState<string[]>([])

  const canReset = !req.isProcessing && req.details.count.total > 0

  const handleAbort = () => {
    req.isProcessing && $$.extraActions.abort({ requestName })
  }
  const handleReset = () => canReset && $$.extraActions.reset(requestName)

  const handleClick = () => {
    handleAbort()
    handleReset()
  }

  const actionBtnLabel = req.isProcessing
    ? 'abort all'
    : canReset
    ? 'reset'
    : ''
  useEffect(() => {
    if (req.isProcessing) {
      setVersion(uniqid())
    }
  }, [req.isProcessing])

  return (
    <Root>
      <Header>
        <Title>{requestName}</Title>
        {req.isProcessing && <Status>is processing</Status>}
        <ActionWrapper>
          {(req.isProcessing || canReset) && (
            <div onClick={handleClick}>{actionBtnLabel}</div>
          )}
        </ActionWrapper>
      </Header>
      <div>
        {ids.map((id, index) => (
          <ProcessItem
            key={id}
            requestName={props.requestName}
            index={index}
            duration={props.duration}
            version={version}
          />
        ))}
      </div>
      <div
        onClick={() => {
          setIds([...ids, uniqid()])
        }}
      >
        Add process
      </div>
    </Root>
  )
}
export type IRequestItemProps = Props
export default React.memo(RequestItem)
