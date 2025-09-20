#include <algorithm>
#include <cassert>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

#define NUM_CITIES 10000

using u64 = uint64_t;

u64 parse_value(const std::string& str) {
  int off = (str[0] == '-') ? 1 : 0;
  int sign = (str[0] == '-') ? -1 : 1;

  int value;
  if (str[off + 1] == '.') {
    value = (str[off] - '0') * 10 + (str[off + 2] - '0');
  } else {
    value = ((str[off] - '0') * 10 + (str[off + 1] - '0')) * 10 +
            (str[off + 3] - '0');
  }
  return sign * value;
}

struct Measurement {
  u64 min;
  u64 max;
  u64 count;
  u64 sum;

  Measurement() : min(0), max(0), count(0), sum(0) {}
  Measurement(u64 value) : min(value), max(value), count(1), sum(value) {}
  inline void update(u64 value) {
    min = std::min(min, value);
    max = std::max(max, value);
    count += 1;
    sum += value;
  }
};

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