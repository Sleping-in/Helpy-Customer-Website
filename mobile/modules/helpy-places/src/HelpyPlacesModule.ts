import { NativeModule, requireOptionalNativeModule } from 'expo'
import type { NativePlaceResult } from './HelpyPlaces.types'

declare class HelpyPlacesModule extends NativeModule<{}> {
  searchAsync(query: string, latitude?: number, longitude?: number): Promise<NativePlaceResult[]>
}

export default requireOptionalNativeModule<HelpyPlacesModule>('HelpyPlaces')
