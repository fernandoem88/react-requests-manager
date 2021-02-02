import styled from 'styled-components'
import { ProcessStatus } from 'react-requests-manager'

export const Root = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Root'
})<{ status?: ProcessStatus }>`
  display: flex;
  margin-bottom: 12px;
  width: 100%;
  & .request-slider {
    height: 25px;
    position: relative;
    pointer-events: none;
  }
  & .request-track {
    height: 100%;
    pointer-events: none;
  }
  & .request-track-0 {
    background: ${(p) =>
      p.status === 'processing'
        ? '#888'
        : p.status === 'suspended'
        ? 'purple'
        : p.status === 'aborted'
        ? 'orange'
        : p.status === 'success'
        ? 'green'
        : p.status === 'error'
        ? 'red'
        : '#ccc'};
  }
  & .request-track-1 {
    background: #ccc;
  }
`
Root.displayName = 'RequestItemRoot'

export const SliderWrapper = styled.div.attrs({
  'data-tbsc-name': 'ProcessItem--SliderWrapper'
})<{}>`
  width: 100%;
  max-width: calc(100% - 80px);
`
SliderWrapper.displayName = 'ProcessItemSliderWrapper'

export const ThumbLabel = styled.div.attrs({
  'data-tbsc-name': 'ProcessItem--ThumbLabel'
})<{ status?: ProcessStatus }>`
  position: absolute;
  left: 0 !important;
  width: 100%;
  text-align: center;
  font-weight: bold;
  padding-top: 3px;
  height: 100%;
  color: ${(p) =>
    p.status === 'success' || p.status === 'error' ? 'white' : 'black'};
`
ThumbLabel.displayName = 'ProcessItemThumbLabel'
