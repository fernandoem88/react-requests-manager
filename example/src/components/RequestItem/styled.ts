import styled from 'styled-components'

export const Root = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Root'
})<{}>`
  /*css attribrutes for Root component*/
`
Root.displayName = 'RequestItemRoot'

export const Header = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Header'
})<{}>`
  display: flex;
`
Header.displayName = 'RequestItemHeader'
