import DesktopWebsite from './desktop/DesktopWebsite'
import { HelpyDataProvider } from './context/HelpyDataContext'
import { NavProvider } from './context/NavContext'

export default function App() {
  return <NavProvider><HelpyDataProvider><DesktopWebsite/></HelpyDataProvider></NavProvider>
}
