---
layout: post
title: "1 Billion Rows Challenge"
date: 2025-09-05
template: "post.html"
tags:
- algorithms
toc:
  sidebar: right
---

The 1 billion rows challenge - I am getting distracted now, lol. I really need to complete that linked list blog.
Anyways, here goes!

1. No reason to C++ almost seems like? But IDK, it might come up down the line.

## Python impl

Wrote a simple python script to do this.

```python
from dataclasses import dataclass

@dataclass
class Result:
    min: float = 0.0
    max: float = 0.0
    avg: float = 0.0
    count: int = 0
    
if __name__ == "__main__":
    with open("data/measurements.txt") as csvfile:
        h = {}
        for line in csvfile.readlines():
            station, data = line.split(';')
            if station in h:
                exi = h[station]
                h[station].min = min(exi.min, float(data))
                h[station].max = max(exi.min, float(data))
                h[station].avg = (h[station].avg * h[station].count + float(data)) / (h[station].count + 1)
                h[station].count += 1
            else:
                h[station] = Result(
                    min = float(data),
                    max = float(data),
                    avg = float(data),
                    count = 1
                )
        
        results = sorted(h.items(), key=lambda item: item[0])
        
        output = "{" + ", ".join([f"{city}={result.min}/{result.avg}/{result.max}" for (city, result) in results]) + "}"
        print(output)
```

- Why dataclass? Why not dataclass?
- Can it be optimized? Definitely
- Will I optimize this? Fuck no.
- Results?

```plaintext
python3 simple.py  223.85s user 3.05s system 99% cpu 3:48.35 total
```

So this takes almost 4 minutes. The system time is not that high - just 3.05s. However, the _best_ ranking solution on 1brc results is sub 2 seconds ==I might be wrong on this==.

## How about C++?

Let's redo this but in c++ now.

```c++
#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>
#include <iomanip>

const char* DATA_FILE = "data/measurements.txt";

struct Result {
    float min;
    float max;
    float avg;
    int count;
};

int main() {
    std::ifstream file(DATA_FILE);
    if (!file.is_open()) {
        std::cerr << "Error: Could not open file " << DATA_FILE << std::endl;
        return 1;
    }

    std::unordered_map<std::string, Result> results;
    std::string line;

    while (std::getline(file, line)) {
        size_t pos = line.find(';');
        std::string city = line.substr(0, pos);
        float measurement = std::stof(line.substr(pos + 1));

        auto it = results.find(city);
        if (it != results.end()) {
            Result& existing = it->second;
            existing.min = std::min(existing.min, measurement);
            existing.max = std::max(existing.min, measurement);
            existing.avg = (existing.avg * existing.count + measurement) / (existing.count + 1);
            existing.count += 1;
        } else {
            results[city] = Result{measurement, measurement, measurement, 1};
        }
    }

    std::vector<std::pair<std::string, Result>> sorted_results(results.begin(), results.end());
    std::sort(sorted_results.begin(), sorted_results.end(),
        [](const auto& a, const auto& b) {
            return a.first < b.first;
        });

    std::cout << "{";
    bool first = true;
    std::cout << std::fixed << std::setprecision(1);

    for (const auto& pair : sorted_results) {
        if (!first) {
            std::cout << ", ";
        }
        const auto& city = pair.first;
        const auto& res = pair.second;
        std::cout << city << "=" << res.min << "/" << res.avg << "/" << res.max;
        first = false;
    }
    std::cout << "}" << std::endl;

    return 0;
}
```

Looking now at the timings:

```plaintext
./1brc  67.93s user 0.28s system 99% cpu 1:08.49 total
```

It's already better. Much better. Almost ~2x faster than the python implementation. But we can't get stuck on that.

## You can't improve what you can't measure.

The next obvious step is to measure what parts are taking the longest. Without running perf first, here are my top contenders:
- syscalls are benign
- vector realloc probably. We need to reserve instead.
- string allocations? Maybe, maybe not (because of the small-string optimization in c++) (is there a way to make sure only small strings are used?)
    - I don't want to use big strings for the city names :)
- Maybe using string_view is a better idea instead of allocating all over the place?
- Memory map the file.

Here is what GPT suggested:

- Repeated add-divide calculation in loop (calculating average) - just dump average at the end. (I missed this, this is embarassing.)
- I also want to benchmark this with `std::map` to see how much sorting was incurring?

That is what I came up with. Let's see what else we can do later but first, measurements.

I want to measure the effect doing a mmap will have on this thing for reading the file.

## Measure with `perf`

```bash
$ perf stat ./1brc

 Performance counter stats for './1brc':

         69,085.07 msec task-clock:u                     #    0.999 CPUs utilized             
                 0      context-switches:u               #    0.000 /sec                      
                 0      cpu-migrations:u                 #    0.000 /sec                      
               447      page-faults:u                    #    6.470 /sec                      
   387,755,655,362      instructions:u                   #    2.85  insn per cycle            
                                                  #    0.05  stalled cycles per insn   
   136,064,158,019      cycles:u                         #    1.970 GHz                       
    19,823,194,068      stalled-cycles-frontend:u        #   14.57% frontend cycles idle      
    65,730,131,038      branches:u                       #  951.438 M/sec                     
       396,051,714      branch-misses:u                  #    0.60% of all branches           

      69.119948107 seconds time elapsed

      68.534893000 seconds user
       0.235812000 seconds sys
```

- Not a lot of branch misses
- Not a lot of page faults
- No cpu migrations (no need to pin?)
- No context switches (ran for the entire time :D)

I don't believe this output. For some reason I think the memory page has not been evicted (the runtime is also shorter even with perf tagging along). I'll flush pages and see what results I get again.

```bash
# As root, write to drop_caches:
sudo sync                 # flush dirty pages to disk
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'
```

Now run perf again.

```bash

 Performance counter stats for './1brc':

         70,347.11 msec task-clock:u                     #    1.000 CPUs utilized             
                 0      context-switches:u               #    0.000 /sec                      
                 0      cpu-migrations:u                 #    0.000 /sec                      
               448      page-faults:u                    #    6.368 /sec                      
   387,755,668,207      instructions:u                   #    2.81  insn per cycle            
                                                  #    0.05  stalled cycles per insn   
   138,003,368,433      cycles:u                         #    1.962 GHz                       
    21,103,980,316      stalled-cycles-frontend:u        #   15.29% frontend cycles idle      
    65,730,143,886      branches:u                       #  934.369 M/sec                     
       399,045,687      branch-misses:u                  #    0.61% of all branches           

      70.374469675 seconds time elapsed

      69.259314000 seconds user
       0.674995000 seconds sys
```

Looks pretty much the same. Hmm. I don't know what the "frontend cycles idle" comes in from. Just for fun, I'm compiling in O2 and seeing the results again :D

```
./1brc  21.87s user 0.29s system 99% cpu 22.263 total
```
Oh wow. That is ~3x faster!

I'll stick to a single-core, O0 optimization level thing for now. Let's leave the compiler+microoptimizations for later.

## Applying optimizations

### Fixing stupid mistakes

The first thing I want to fix is the average presentation logic (I missed this entirely).
It did not make any difference, but it's a good fix to have.

```diff
diff --git a/1brc.cc b/1brc.cc
index a14dcd7..82d56db 100644
--- a/1brc.cc
+++ b/1brc.cc
@@ -11,7 +11,7 @@ const char* DATA_FILE = "data/measurements.txt";
 struct Result {
-    float avg;
+    float sum;
 
@@ -35,7 +35,7 @@ int main() {
             Result& existing = it->second;
-            existing.avg = (existing.avg * existing.count + measurement) / (existing.count + 1);
+            existing.sum += measurement;
             existing.count += 1;
@@ -58,10 +58,10 @@ int main() {
         const auto& res = pair.second;
-        std::cout << city << "=" << res.min << "/" << res.avg << "/" << res.max;
+        std::cout << city << "=" << res.min << "/" << (res.sum / res.count) << "/" << res.max;
     }
 
     return 0;
-}
```

```plaintext
./1brc  70.44s user 0.30s system 99% cpu 1:11.16 total
```

### Map vs Unordered Map

1. Difference in runtime between using std::map and std::unordered_map. This should have two benefits - I don't need to do sorting later, and I don't need to allocate an entire vector down the line to just store the sorted results.

```diff
diff --git a/1brc.cc b/1brc.cc
index 82d56db..62bedff 100644
--- a/1brc.cc
+++ b/1brc.cc
@@ -1,8 +1,8 @@
 #include <iostream>
 #include <fstream>
+#include <map>
 #include <string>
 #include <vector>
-#include <unordered_map>
 #include <algorithm>
 #include <iomanip>
 
@@ -22,7 +22,7 @@ int main() {
         return 1;
     }
 
-    std::unordered_map<std::string, Result> results;
+    std::map<std::string, Result> results;
     std::string line;
 
     while (std::getline(file, line)) {
@@ -42,17 +42,11 @@ int main() {
         }
     }
 
-    std::vector<std::pair<std::string, Result>> sorted_results(results.begin(), results.end());
-    std::sort(sorted_results.begin(), sorted_results.end(),
-        [](const auto& a, const auto& b) {
-            return a.first < b.first;
-        });
-
     std::cout << "{";
     bool first = true;
     std::cout << std::fixed << std::setprecision(1);
 
-    for (const auto& pair : sorted_results) {
+    for (const auto& pair : results) {
         if (!first) {
             std::cout << ", ";
         }
```

```bash
./1brc  184.72s user 0.40s system 99% cpu 3:06.46 total
```

Oh boy! Looks like this was a baaaad idea lol. It is understandable, since the map is adjusting every time a key is pushed into it, whereas we have a single adjustment with the std::vector implementation. Anyways, this scratched my itch and is definitely not the way to go! This was almost as slow as the python impl lol (guess why? Maybe python is ordered map too? Nah.) but I think this is a worthwhile exploration for smaller data sets? 

### Allocations galore

I also wanted to fix the memory allocations. We are allocating a lot of memory, a lot of vectors, etc. Two things here:

1. Reserve space for both map and vectors (sorted vector is OK).
2. Use string views instead of the substring (which allocates) for the measurement. Since I'm using C++17 I have to allocate a std::string for city each time (idk how to solve this). Since we don't actually need the allocated string to lookup( I think?) == This requires C++17 (I can live with that) I need to know this (GPT to the rescue!!)

```c++

-    std::unordered_map<std::string, Result> results;
+    std::unordered_map<std::string, Result> results(100000); // Prealloc the map for 10k cities.
     std::string line;
 
     while (std::getline(file, line)) {
-        size_t pos = line.find(';');
-        std::string city = line.substr(0, pos);
-        float measurement = std::stof(line.substr(pos + 1));
+      size_t pos = line.find(';');
+      std::string city(line.substr(0, pos));
+      std::string_view measurement_view(line.data() + pos + 1,
+                                        line.size() - pos - 1);
 
-        auto it = results.find(city);
-        if (it != results.end()) {
-            Result& existing = it->second;
-            existing.min = std::min(existing.min, measurement);
-            existing.max = std::max(existing.min, measurement);
-            existing.sum += measurement;
-            existing.count += 1;
-        } else {
-            results[city] = Result{measurement, measurement, measurement, 1};
-        }
+      float measurement;
+      std::from_chars(measurement_view.data(),
+                      measurement_view.data() + measurement_view.size(),
+                      measurement);
+
+      auto it = results.find(city);
+
+      if (it != results.end()) {
+        Result &existing = it->second;
+        existing.min = std::min(existing.min, measurement);
+        existing.max = std::max(existing.max, measurement);
+        existing.sum += measurement;
+        existing.count += 1;
+      } else {
+        results.emplace(std::move(city),
+                        Result{measurement, measurement, measurement, 1});
+      }
     }
```

It yields some pretty nice gains.

```plaintext
./1brc  48.80s user 0.31s system 99% cpu 49.413 total
```

## Perf again

This time I will run a detailed perf report and see what I can find to reduce the runtime further.

```bash
~/t/1brc ❯❯❯ perf report --stdio --sort=dso,symbol --percent-limit 1

# To display the perf.data header info, please use --header/--header-only options.
#
#
# Total Lost Samples: 0
#
# Samples: 200K of event 'cycles:Pu'
# Event count (approx.): 96699921160
#
# Overhead  Shared Object         Symbol                                                                                                                                                                                            >
# ........  ....................  ..................................................................................................................................................................................................>
#
    15.67%  1brc                  [.] std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >::max_size() const                                                                                             >
     7.54%  libstdc++.so.6.0.34   [.] std::from_chars(char const*, char const*, float&, std::chars_format)                                                                                                                          >
     5.51%  1brc                  [.] std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >::size() const                                                                                                 >
     5.42%  1brc                  [.] std::_Hashtable<std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >, std::pair<std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> > con>
     3.36%  1brc                  [.] std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >::_M_data() const                                                                                              >
     3.14%  1brc                  [.] std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >::_M_get_allocator() const                                                                                     >
     2.79%  1brc                  [.] main   
```

Looks like I'm still allocating a heckkton of memory for strings :( Asked GPT and there seems to be no way forward for this except using C++20 or using a better hashmap library. So this is a dead end for me (I don't want to use anything over C++17). I will keep this agenda for later.

### Use `mmap`

Now I think it's the time to use mmap api in the code. So I change my code to use it. I am taking inspiration from [this tutorial here](https://eric-lo.gitbook.io/memory-mapped-io/shared-memory).

```diff
diff --git a/1brc.cc b/1brc.cc
index 84a2811..9f61df8 100644
--- a/1brc.cc
+++ b/1brc.cc
@@ -1,12 +1,14 @@
 #include <charconv>
 #include <iostream>
-#include <fstream>
 #include <string>
 #include <vector>
 #include <unordered_map>
 #include <string_view>
 #include <algorithm>
 #include <iomanip>
+#include <fcntl.h>
+#include <sys/stat.h>
+#include <sys/mman.h>
 
 const char* DATA_FILE = "data/measurements.txt";
 
@@ -18,38 +20,60 @@ struct Result {
 };
 
 int main() {
-    std::ifstream file(DATA_FILE);
-    if (!file.is_open()) {
-        std::cerr << "Error: Could not open file " << DATA_FILE << std::endl;
-        return 1;
+    int fd, offset;
+    char *memory;
+    struct stat fileInfo;
+
+    if ((fd = open(DATA_FILE, O_RDONLY)) == -1) {
+      perror("open");
+      exit(-1);
+    }
+    if (stat(DATA_FILE, &fileInfo) != 0) {
+      perror("STAT ERROR");
+      exit(-2);
+    }
+
+    memory = (char *)mmap(0, fileInfo.st_size, PROT_READ, MAP_SHARED, fd, 0);
+    if (memory == MAP_FAILED) {
+        perror("MMAP FAIL");
+        exit(-3);
     }
 
     std::unordered_map<std::string, Result> results(100000); // Prealloc the map for 10k cities.
-    std::string line;
+    std::string_view file_content(memory);
+    int split = 0;
+    int line_end = 0;
+    size_t pos = 0;
 
-    while (std::getline(file, line)) {
-      size_t pos = line.find(';');
-      std::string city(line.substr(0, pos));
-      std::string_view measurement_view(line.data() + pos + 1,
-                                        line.size() - pos - 1);
+    while (pos < file_content.size()) {
+      size_t split = file_content.find(';', pos);
+      if (split == std::string_view::npos) [[unlikely]] {
+        std::cout << "Malformed file." << std::endl;
+        exit(-4);
+      }
 
-      float measurement;
-      std::from_chars(measurement_view.data(),
-                      measurement_view.data() + measurement_view.size(),
-                      measurement);
+      size_t line_end = file_content.find('\n', split + 1);
+      if (line_end == std::string_view::npos)
+        line_end = file_content.size();
 
-      auto it = results.find(city);
+      std::string city(file_content.data() + pos, split - pos);
+      std::string_view temp_str(file_content.data() + split + 1,
+                                line_end - split - 1);
 
-      if (it != results.end()) {
-        Result &existing = it->second;
-        existing.min = std::min(existing.min, measurement);
-        existing.max = std::max(existing.max, measurement);
-        existing.sum += measurement;
-        existing.count += 1;
+      float temp = 0.0f;
+      std::from_chars(temp_str.data(), temp_str.data() + temp_str.size(), temp);
+
+      auto it = results.find(city);
+      if (it == results.end()) {
+        results.emplace(std::move(city), Result{temp, temp, temp, 1});
       } else {
-        results.emplace(std::move(city),
-                        Result{measurement, measurement, measurement, 1});
+        auto &res = it->second;
+        res.min = std::min(res.min, temp);
+        res.max = std::max(res.max, temp);
+        res.sum += temp;
+        res.count += 1;
       }
+      pos = line_end + 1;
     }
 
     std::vector<std::pair<std::string, Result>> sorted_results(results.begin(), results.end());
```

This adds the implementation using mmap instead of the file stream. It's interesting to see the resident memory shoot up to 1.5G and stay there for the entirety of the process' life.

Benchmarks are good!

```plaintext
./1brc  35.25s user 0.05s system 99% cpu 35.462 total
```

So we shaved off another 10s from the total time :) Still nowhere close to 2s but creeping there slowly :) Time to do another perf evaluation.

```bash
~/t/1brc ❯❯❯ perf report --stdio --sort=dso,symbol --percent-limit 1

# To display the perf.data header info, please use --header/--header-only options.
#
#
# Total Lost Samples: 0
#
# Samples: 147K of event 'cycles:Pu'
# Event count (approx.): 71972252010
#
# Overhead  Shared Object         Symbol                                                                                                                                                                                            >
# ........  ....................  ..................................................................................................................................................................................................>
#
     8.66%  libstdc++.so.6.0.34   [.] std::from_chars(char const*, char const*, float&, std::chars_format)                                                                                                                          >
     8.19%  1brc                  [.] std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >::max_size() const                                                                                             >
     6.63%  1brc                  [.] std::_Hashtable<std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >, std::pair<std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> > con>
     4.02%  libstdc++.so.6.0.34   [.] std::_Hash_bytes(void const*, unsigned long, unsigned long)                                                                                                                                   >
     3.79%  1brc                  [.] std::basic_string_view<char, std::char_traits<char> >::find(char, unsigned long) const                                                                                                        >
     3.57%  1brc                  [.] std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >::size() const                                                                                                 >
     3.35%  1brc                  [.] main                                                                        
```

There's still overhead in the string processing part - mainly `from_chars` to convert to float, and another one is simply string allocations. I can't really read the perf reports all that very well, so I'll use flamegraphs now.

### Conflicting information?

I just ran valgrind with callgrind and on kcachegrind visualization, it tells me an entirely different story. Maybe I missed this in perf? but the map::find() method is actually taking 45% of the entire runtime here! So if I can optimize that, it should certainly be better.

![cachegrind_output](/images/1brc/kcachegrind.png)

## Rest stop

At this point, I have identified several possible optimizations in the code:

1. Using a custom parsing method to parse measurements: The current measurement uses `from_chars` which takes up 8% of the total time. The challenge page says this:

> with the measurement value having exactly one fractional digit.

So I think scalar integers would be a perfect fit in this case.

2. Each city lookup in the hot loop incurs an allocation. Checking the dataset, it looks like a string is max. 49 bytes long (generated). So small-string optimizations' hopes are _mostly_ out. Looking at C++17, the `string_view` cannot be used in the map's `find()` method (no transparent lookups without allocations)

Because of this reason, I think a better solution would be to look for another hashmap library. I stuck on `robin_map` from Tessil. According to [their benchmarks](https://tessil.github.io/2016/08/29/benchmark-hopscotch-map.html#:~:text=Reads%3A%20execution%20time%20(strings)), the string lookup should be around ~2x faster compared to unordered_map! Also if it reduces a string allocation, that's 15% chopped off of the total execution time.

## More optimizations

I'll first begin by optimizing the code to use scalar integers instead of the `from_chars` parser. Since this is a custom challenge with custom data, it will not be relevant for everything, but it works perfectly in our case. This is exactly why it's important to _know thy data_.

### Scalar integers

