#include <algorithm>
#include <cassert>
#include <fstream>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

#define NUM_CITIES 10000

struct Measurement {
  float min;
  float max;
  int count;
  float sum;

  Measurement() : min(0), max(0), count(0), sum(0) {}
  Measurement(float value) : min(value), max(value), count(1), sum(value) {}
  inline void update(float value) {
    min = std::min(min, value);
    max = std::max(max, value);
    count += 1;
    sum += value;
  }
};

static inline float parse_value(const std::string& to_parse) {
    return std::stof(to_parse);
}

int main() {
  std::ifstream file("/home/sbhusal/temp/1brc/solutions/measurements.txt");
  std::unordered_map<std::string, Measurement> measurements(10000);

  std::string line;

  while (std::getline(file, line)) {
    auto city_off = line.find(';');
    assert(city_off != line.npos && "City name does not exist");

    auto city = line.substr(0, city_off);
    auto measurement = line.substr(city_off + 1, line.size());

    auto parsed = parse_value(measurement);

    auto [it, inserted] = measurements.try_emplace(city, parsed);
    if (!inserted) {
      it->second.update(parsed);
    }
  }

  std::vector<std::pair<std::string, Measurement>> ordered(measurements.begin(),
                                                           measurements.end());
  std::sort(ordered.begin(), ordered.end(),
            [](const std::pair<std::string, Measurement> &first,
               const std::pair<std::string, Measurement> &second) {
              return first.first < second.first;
            });

  std::cout << "{";

  for (size_t i = 0; i < ordered.size(); ++i) {
    const auto &[city, measured] = ordered[i];
    std::cout << city << ":" << measured.min << "/"
              << (measured.sum / measured.count) << "/" << measured.max;
    if (i != ordered.size() - 1) {
      std::cout << ",";
    }
  }

  std::cout << "}";

  return 0;
}