#include <benchmark/benchmark.h>

#include <charconv>
#include <iostream>
#include <vector>
#include <string>
#include <random>
#include <iomanip>
#include <sstream>

std::vector<std::string> float_strings;
std::vector<float> floats;
std::vector<int> ints;

static void SetupNums() {
    static bool initialized = false;
    if (initialized) return;
    initialized = true;

    floats.reserve(10000000);
    ints.reserve(10000000);
    for (size_t i = 0; i < 10000000; ++i) {
        floats.push_back(static_cast<float>(i) / 10.0f);
        ints.push_back(static_cast<int>(i));
    }
}

static void sum_ints(benchmark::State& state) {
    SetupNums();

    for (auto _ : state) {
        long sum = 0;
        for (const auto& i : ints) {
            sum += i;
        }
        benchmark::DoNotOptimize(sum);
    }
}
static void sum_floats(benchmark::State& state) {
    SetupNums();

    for (auto _ : state) {
        double sum = 0;
        for (const auto& f : floats) {
            sum += f;
        }
        benchmark::DoNotOptimize(sum);
    }
}

BENCHMARK(sum_ints);
BENCHMARK(sum_floats);

// static void SetupFloatStrings() {
//     static bool initialized = false;
//     if (initialized) return;
//     initialized = true;

//     std::mt19937 rng(42);
//     std::uniform_real_distribution<float> dist(-99.9f, 99.9f);

//     float_strings.reserve(10000000);
//     for (size_t i = 0; i < 10000000; ++i) {
//         float val = dist(rng);
//         std::ostringstream oss;
//         oss << std::fixed << std::setprecision(1) << val;
//         float_strings.push_back(oss.str());
//     }
// }

// void bench_stof(benchmark::State& state) {
//     SetupFloatStrings();

//     size_t index = 0;
//     float sum = 0;
//     for (auto _ : state) {
//         const std::string& str = float_strings[index % float_strings.size()];
//         sum += std::stof(str);
//         index++;
//     }
//     benchmark::DoNotOptimize(sum);
// }

// void bench_from_chars(benchmark::State& state) {
//     SetupFloatStrings();

//     size_t index = 0;
//     float sum = 0;
//     for (auto _ : state) {
//         const std::string& str = float_strings[index % float_strings.size()];
//         float value;
//         std::from_chars(str.data(), str.data() + str.size(), value);
//         sum += value;
//         index++;
//     }
//     benchmark::DoNotOptimize(sum);
// }

// void bench_scalar_int(benchmark::State& state) {
//     SetupFloatStrings();

//     size_t index = 0;
//     long sum = 0;
//     for (auto _ : state) {
//         const std::string& str = float_strings[index % float_strings.size()];
//         int off = (str[0] == '-') ? 1 : 0;
//         int sign = (str[0] == '-') ? -1 : 1;

//         int value;
//         if (str[off + 1] == '.') {
//           value = (str[off] - '0') * 10 + (str[off + 2] - '0');
//         } else {
//           value = ((str[off] - '0') * 10 + (str[off + 1] - '0')) * 10 +
//                   (str[off + 3] - '0');
//         }
//         sum += sign * value;
//     }
//     benchmark::DoNotOptimize(sum);
// }



// BENCHMARK(bench_from_chars);
// BENCHMARK(bench_stof);
// BENCHMARK(bench_scalar_int);

BENCHMARK_MAIN();
