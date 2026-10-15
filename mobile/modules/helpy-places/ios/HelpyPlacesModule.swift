import ExpoModulesCore
import MapKit

public class HelpyPlacesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HelpyPlaces")

    AsyncFunction("searchAsync") { (query: String, latitude: Double?, longitude: Double?) async throws -> [[String: Any]] in
      let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
      guard trimmed.count >= 2 else { return [] }

      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = trimmed
      request.resultTypes = [.address, .pointOfInterest]
      request.region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(
          latitude: latitude ?? 25.2854,
          longitude: longitude ?? 51.5310
        ),
        span: MKCoordinateSpan(latitudeDelta: 1.9, longitudeDelta: 1.2)
      )

      let response = try await MKLocalSearch(request: request).start()
      var seen = Set<String>()
      var results: [[String: Any]] = []

      for item in response.mapItems {
        let coordinate = item.placemark.coordinate
        guard coordinate.latitude >= 24.4,
              coordinate.latitude <= 26.3,
              coordinate.longitude >= 50.6,
              coordinate.longitude <= 51.7 else { continue }

        let title = (item.name ?? item.placemark.name ?? "Selected Location")
          .trimmingCharacters(in: .whitespacesAndNewlines)
        let rawAddressParts = [
          item.placemark.subThoroughfare,
          item.placemark.thoroughfare,
          item.placemark.subLocality,
          item.placemark.locality,
          item.placemark.administrativeArea,
        ]
        .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty && $0.caseInsensitiveCompare(title) != .orderedSame }
        let addressParts = rawAddressParts.reduce(into: [String]()) { parts, part in
          if !parts.contains(where: { $0.caseInsensitiveCompare(part) == .orderedSame }) {
            parts.append(part)
          }
        }
        let address = addressParts.joined(separator: ", ")
        let category = item.pointOfInterestCategory?.rawValue
          .replacingOccurrences(of: "MKPOICategory", with: "")
          .replacingOccurrences(of: "_", with: " ")
          .trimmingCharacters(in: .whitespacesAndNewlines)
        let identity = "\(title.lowercased())|\(coordinate.latitude.rounded(toPlaces: 5))|\(coordinate.longitude.rounded(toPlaces: 5))"
        guard seen.insert(identity).inserted else { continue }

        results.append([
          "id": identity,
          "label": title,
          "secondary": address.isEmpty ? "Qatar" : address,
          "category": category ?? "",
          "latitude": coordinate.latitude,
          "longitude": coordinate.longitude,
        ])
        if results.count == 8 { break }
      }

      return results
    }
  }
}

private extension Double {
  func rounded(toPlaces places: Int) -> Double {
    let divisor = pow(10.0, Double(places))
    return (self * divisor).rounded() / divisor
  }
}
