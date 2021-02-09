import styled from 'styled-components'

export const Root = styled.div.attrs({
  'data-tbsc-name': 'App--Root'
})<{}>`
  /*css attribrutes for Root component*/
`
Root.displayName = 'AppRoot'

export const Header = styled.div.attrs({
  'data-tbsc-name': 'App--Header'
})<{}>`
  /*css attribrutes for Header component*/
  border: solid 1px lightblue;
  padding: 6px;
  text-align: center;
  margin-bottom: 24px;
`
Header.displayName = 'AppRoot'

export const Result = styled.div.attrs({
  'data-tbsc-name': 'App--Result'
})<{}>`
  /*css attribrutes for Result component*/
  text-align: center;
  margin-top: 12px;
`
Result.displayName = 'AppResult'
