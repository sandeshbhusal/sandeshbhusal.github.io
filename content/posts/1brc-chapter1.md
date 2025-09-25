---
layout: post
title: "1 Billion Rows Challenge - Chapter 1"
date: 2025-09-05
template: "post.html"
tags:
- algorithms
toc:
  sidebar: right
draft: false 
series: "1brc"
---
I stumbled upon Gunnar Morling’s [One Billion Rows Challenge](https://www.morling.dev/blog/one-billion-row-challenge/) and couldn’t resist giving it a shot. The premise is straightforward: you get a text file with a billion lines, each line has a city name and a temperature reading. The task is to print every city (sorted alphabetically) along with its minimum, average, and maximum temperature across all measurements. Here’s a sample of what the input looks like:

```plaintext
...
London;10.0
New York;5.0
London;-1.0
...
```

And yes, there are a billion lines. Sounds easy, right? The twist is speed. The fastest solution clocks in at 1.535 seconds on a Hetzner AX161. Morling’s own baseline runs in 4:49 minutes on the same hardware. The challenge was aimed at Java folks, but I wanted to see what I could do with modern C++.

<details>
  <summary>Wait, aren’t you a Rustacean?</summary>
  &nbsp;

  Always good to pick up new languages. My last serious C++ project was [irpam_cpp](https://github.com/sandeshbhusal/irpam_cpp), an open-source IR camera authentication tool for Linux. That was more about functionality than raw performance. With this challenge, I’m diving into C++ optimization and getting a closer look at how the STL ticks.

  Maybe I’ll try a Rust version later 😉
</details>

Here’s how I’m approaching this series:

- Write the code and measure its speed
- Analyze performance bottlenecks
- Micro-benchmark the hot spots
- Apply fixes and optimizations
- Repeat until satisfied

## Step 1: Implementing a baseline

The first step in this challenge would be to _actually_ write a C++ baseline. I implemented a very simple version in C++ which you can find below, where I try to write idiomatic code, with a couple of optimizations in mind:

- Optimize for readability of the code first of all. Unreadable code is unmaintainable code, and improving will be hard later.
- Pre-allocate a `unordered_map` to reduce probing (and not use `map` which uses BTrees under the hood (much slower in this case)).

And, that's about it. Pretty dry. I already know that there are a lot of improvements that can be made just looking at this first draft I have:

- Excessive string allocation in hot loop: "city" and "measurement"
- Inefficient parsing of float (use of `stof`)
- No support for parallelism or concurrency
- Not data-specific.

The last one is pretty heavy - I know the structure of the data file, it's size, etc. already. So the code should try to exploit that fact as much as possible - try to optimize the code based on the data. However, all those optimizations will come later _with_ their own benchmarks. This will suffice for now.

<details>
  <summary>C++ Baseline Implementation</summary>

  ```c++
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
  ```

</details>

### Benchmark conditions

Here is my laptop's specs that I will be using to run all benchmarks. In addition to this, all benchmarks will start with the measurements file evicted from page-cache, all google benchmarks are built in release mode, and cpu frequency scaling will be disabled and set to performance mode by default.

```bash
Vendor ID:                   AuthenticAMD
  Model name:                AMD Ryzen AI 9 365 w/ Radeon 880M
    CPU family:              26
    Model:                   36
    Thread(s) per core:      2
    Core(s) per socket:      10
    Socket(s):               1
    Stepping:                0
    Frequency boost:         enabled
    CPU(s) scaling MHz:      56%
    CPU max MHz:             5090.9102
    CPU min MHz:             623.3770
```

## Step 2: Compiling and Perf analysis

### Compilation

I tried to keep the compilation flags' count as small as possible. Here are the flags I will be using across all benchmarks:

```bash
$ g++ 1.cc -o 1 -g -Ofast -std=c++17
```

<!-- - `-flto` for [link-time optimization](https://johnnysswlab.com/link-time-optimizations-new-way-to-do-compiler-optimizations/). For the uninitiated, please read the attached blog link. Without lto, I can see a **lot** of i-cache misses (I will post benchmarks on this too down below). -->
- `-Ofast` to make the code go brrr
- `-std=c++17` to use modern C++ standards. I chose c++17 for no particular reason other than to use `string_view` (more on that later).
- `-g` to include debug symbols

---

### `time`, `perf` and Friends

Since running perf on the binary introduces some overhead due to periodic sampling and stack unwinding, I will first run the generated binary with time, native to my shell (fish). Then, I will run perf to generate a detailed report on the code, showing the hot paths and memory characteristics.

The measurements file itself is pretty big - around 15G! Here are the timings I saw on this code:

```fish
❯ time ./1 
... truncated output ...
________________________________________________________
Executed in   96.11 secs    fish           external
   usr time   90.04 secs    0.00 micros   90.04 secs
   sys time    5.50 secs  685.00 micros    5.49 secs
```
The implementation is already much faster than the baseline. Time to retire and become a professional speedrunner, right? Well, not so fast.

You can't optimize what you can't measure (unless you enjoy flying blind and writing code that only impresses your girlfriend, and/or your cat). So, to get some real numbers, I fired up `perf` with the following flags:

```bash,hl_lines=5-9 12 13-14 18 25 28
$ perf stat -ddd ./1

Performance counter stats for './1':

         95,143.55 msec task-clock:u                     #    0.993 CPUs utilized             
                 0      context-switches:u               #    0.000 /sec                      
                 0      cpu-migrations:u                 #    0.000 /sec                      
               450      page-faults:u                    #    4.730 /sec                      
 1,202,211,819,659      instructions:u                   #    2.82  insn per cycle            
                                                  #    0.07  stalled cycles per insn     (35.69%)
   425,619,873,216      cycles:u                         #    4.473 GHz                         (35.70%)
    86,357,605,997      stalled-cycles-frontend:u        #   20.29% frontend cycles idle        (35.72%)
   245,458,897,320      branches:u                       #    2.580 G/sec                       (35.73%)
     3,332,945,485      branch-misses:u                  #    1.36% of all branches             (35.72%)
   609,215,573,674      L1-dcache-loads:u                #    6.403 G/sec                       (35.72%)
     4,994,378,169      L1-dcache-load-misses:u          #    0.82% of all L1-dcache accesses   (35.71%)
       473,716,778      L1-icache-loads:u                #    4.979 M/sec                       (35.71%)
        31,596,863      L1-icache-load-misses:u          #    6.67% of all L1-icache accesses   (35.72%)
     1,877,046,066      dTLB-loads:u                     #   19.729 M/sec                       (35.73%)
           226,822      dTLB-load-misses:u               #    0.01% of all dTLB cache accesses  (35.73%)
        77,550,331      iTLB-loads:u                     #  815.088 K/sec                       (35.71%)
            16,245      iTLB-load-misses:u               #    0.02% of all iTLB cache accesses  (35.70%)
     1,025,062,059      L1-dcache-prefetches:u           #   10.774 M/sec                       (35.70%)

      95.818902117 seconds time elapsed

      89.021911000 seconds user
       5.328106000 seconds sys
```

This shows me detailed performance counters which will give a rough idea of the areas of potential improvement.

- Starting out, we can see the program ran on a single CPU code (not fully utilized, mind you), with 0 context-switches and cpu-migrations, which means our program was on the same CPU core the entire time it was running. This i snice.
- There are 450 page faults. We are using buffered IO here, which implicitly fetches pages while reading a chunk of the file, so for a 15G file, the page fault is trivial.
- 1.2B instructions 😵‍💫 This is wayy too high number of instructions being executed for a task this simple. But again, we are doing a lot of redundant stuff here.
- 20.29% stalled CPU frontend cycles. This means the CPU could not fetch instructions fast enough for them to be executed. This can also be seen in the **very high** L1-icache misses, i.e. 6.67%. This means the instructions the CPU wanted to execute could not be found in the L1 cache, and it had to go all the way up to get that data!
- I am not worried about branch misses (for now). They could be much higher, but I will hopefully, eventually, get around to optimizing the branch misses.
- Syscalls consumed ~5s of the total time

The next step will be to run `perf` again, but this time to record the program execution itself. For that, I used:

```bash
perf record --call-graph dwarf -o perf.data.1 ./1
```

<details>

![](/images/1brc/1-flamegraph.svg)

<summary>A flamegraph without dwarf</summary>
</details>

The tool I use these days to analyze the output of perf data, is [hotspot](https://github.com/KDAB/hotspot). It is an excellent profiler + visualizer because of the built-int flamegraphs, disassembly, and caller-callee graphs.

This is the flamegraph I obtained from hotspot and Brendan Gregg's Flamegraph tools. You can right-click on the image, open it in a new tab and play around with the flamegraph to see how much time each call is spending.

![1-flamegraph.svg](/images/1brc/1-flamegraph-dwarf.svg)

Here are the main takeaways:

1. I _love_ flamegraphs. Ever since my friend [Pravesh](https://np.linkedin.com/in/gairepravesh) introduced them to me, I've been using them to quickly visualize my code performance. Brendan is truly great.
2. The code spends 33% of its total time in `__memchr_evex`. This is a SIMD-optimized string matching function that is used to quickly find characters within a string (or bytes within a memory, memchr). This is a great thing in itself, since our compiler is using optimized code. If you open the flamegraph in a new tab, and hit "Ctrl+S" (or whatever Mac uses), and search for "__memchr", the flamegraph blocks will actually highlight themselves! How great is that!!
3. `str::stof` is using a **lot** of CPU cycles - a whopping 31% of all! This needs to be optimized.
4. In the Hashtable's `find_before_node` function, the call to `std::__detail::_Hashtable_base<…>::_M_equals(std::string const&, unsigned long, std::__detail::_Hash_node_value<…> const&) const` is taking up 11% of the total CPU cycles! This means we have a lot of [hash collisions](https://en.wikipedia.org/wiki/Hash_collision). Our hashtable's hashing function needs to be optimized.
5. `std::getline` is taking up 10.7% of the total time!

## Step 3: Baby's first benchmark and optimization

Phew. That was a lot of work so far! Now that we know the root cause of the slowness, we can actually begin to optimize the code. In order to optimize the code, we cannot simply rewrite vast swathes of the code again. It needs to be deliberate, and measured. So, to accomplish the same, I will be using a little library called googlebench.

### Optimizing float-parsing

Parsing floats with `std::stof` is slow mainly due to its robustness—it validates inputs and handles edge cases, which adds overhead (I don't want to get into `setlocale` right now, btw). Since the challenge data is predictable and well-formed, we can use a custom float parser tailored to our input format for better performance. Alternatives like [`std::from_chars`](https://www.fluentcpp.com/2018/07/27/how-to-efficiently-convert-a-string-to-an-int-in-c/) offer faster, locale-independent parsing.

Another approach is [scaled integers](https://www.crockford.com/scaled.html), which avoids floating-point arithmetic entirely by representing values as integers. Since all our values lie between -99.9 and 99.9, I can just multiply it by 10, and work with integers in the range of -999 to 999. That way, I avoid doing expensive FP computation. I'll benchmark all these methods below; check the code details for implementation specifics.

<details>

```c++
std::vector<std::string> float_strings;

static void SetupFloatStrings() {
    static bool initialized = false;
    if (initialized) return;
    initialized = true;

    std::mt19937 rng(42);
    std::uniform_real_distribution<float> dist(-99.9f, 99.9f);

    float_strings.reserve(10000000);
    for (size_t i = 0; i < 10000000; ++i) {
        float val = dist(rng);
        std::ostringstream oss;
        oss << std::fixed << std::setprecision(1) << val;
        float_strings.push_back(oss.str());
    }
}
```

```c++
void bench_stof(benchmark::State& state) {
    SetupFloatStrings();

    size_t index = 0;
    float sum = 0;
    for (auto _ : state) {
        const std::string& str = float_strings[index % float_strings.size()];
        sum += std::stof(str);
        index++;
    }
    benchmark::DoNotOptimize(sum);
}
```

```c++
void bench_from_chars(benchmark::State& state) {
    SetupFloatStrings();

    size_t index = 0;
    float sum = 0;
    for (auto _ : state) {
        const std::string& str = float_strings[index % float_strings.size()];
        float value;
        std::from_chars(str.data(), str.data() + str.size(), value);
        sum += value;
        index++;
    }
    benchmark::DoNotOptimize(sum);
}
```

The argument here is that we can have 4 conditions:
- -xx.x
- -x.x
- xx.x
- x.x

After we process the first '-', the remaining string is either 4 or 3 chars long. Then we can simply check if the '.' lies in the first or
the second position, and parse accordingly.

```c++
void bench_scalar_int(benchmark::State& state) {
    SetupFloatStrings();

    size_t index = 0;
    long sum = 0;
    for (auto _ : state) {
        const std::string& str = float_strings[index % float_strings.size()];
        int off = (str[0] == '-') ? 1 : 0;
        int sign = (str[0] == '-') ? -1 : 1;

        int value;
        if (str[off + 1] == '.') {
          value = (str[off] - '0') * 10 + (str[off + 2] - '0');
        } else {
          value = ((str[off] - '0') * 10 + (str[off + 1] - '0')) * 10 +
                  (str[off + 3] - '0');
        }
        sum += sign * value;
    }
    benchmark::DoNotOptimize(sum);
}
```

<summary>Benchmark code</summary>
</details>

All modern CPUs contain FPUs. However, floating-point computations are still slower than integer-based computations.

<details>

```c++
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
```

```fish
Load Average: 4.08, 3.13, 2.13
-----------------------------------------------------
Benchmark           Time             CPU   Iterations
-----------------------------------------------------
sum_ints      5109059 ns      5068193 ns          138
sum_floats   15250422 ns     15131541 ns           46
```

<summary>Benchmarking FP vs Integer computation speed</summary>
</details>

After running all benchmarks, this is the result I obtained:

```bash
❯ ./build/bench1
Running ./build/bench1
Run on (20 X 4802.51 MHz CPU s)
CPU Caches:
  L1 Data 48 KiB (x10)
  L1 Instruction 32 KiB (x10)
  L2 Unified 1024 KiB (x10)
  L3 Unified 16384 KiB (x2)
Load Average: 1.02, 0.93, 0.98
-----------------------------------------------------------
Benchmark                 Time             CPU   Iterations
-----------------------------------------------------------
bench_from_chars       12.8 ns         12.7 ns     55361400
bench_stof             36.2 ns         36.1 ns     19393116
bench_scalar_int       1.04 ns         1.04 ns    671697934
```

It's a wipeout. Not even close.

## Making the code changes

Now that I know scaled ints work, I rewrote the original program to use them, and generated a timing analysis:

<details>

```c++,hl_lines=12-26 29-32 35
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
```

<summary>
Rewritten code with scaled integers
</summary>
</details>

```fish
________________________________________________________
Executed in   66.93 secs    fish           external
   usr time   60.66 secs    0.17 millis   60.66 secs
   sys time    5.67 secs    1.12 millis    5.67 secs
```

With the switch to scaled integers, the runtime dropped from 96.11 seconds to 66.9 seconds which is a solid 30-second improvement. That’s a huge win for a single change. If scaling across all 20 CPU cores was perfect, I’d be within striking distance of the leaderboard. Of course, real-world scaling is never perfect, but this is a promising start. There’s still plenty of room to optimize - stay tuned for more deep dives and speedups. This final code will be the starting point for optimizations going ahead.
